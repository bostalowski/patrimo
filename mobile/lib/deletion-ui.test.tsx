import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import { NO_ACCOUNT_ID } from "@patrimo/core/deletion";
import type { Workbook } from "@patrimo/core/schema";

const mocks = vi.hoisted(() => ({
  workbookState: {} as Record<string, unknown>,
  deleteAccount: vi.fn(),
  deleteAsset: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  TextInput: "TextInput",
  ActivityIndicator: "ActivityIndicator",
  Modal: "Modal",
  Alert: { alert: vi.fn() },
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Platform: { OS: "ios", select: (values: Record<string, unknown>) => values.ios },
  useColorScheme: () => "light",
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

vi.mock("expo-router", () => ({
  router: { push: vi.fn(), back: vi.fn() },
}));

vi.mock("./use-workbook", () => ({
  useWorkbook: () => mocks.workbookState,
}));

vi.mock("./write-account", () => ({
  deleteAccountFromSource: mocks.deleteAccount,
}));

vi.mock("./write-asset", () => ({
  deleteAssetFromSource: mocks.deleteAsset,
}));

vi.mock("./write-transaction", () => ({
  appendTransaction: vi.fn(),
}));

import ComptesScreen from "../app/comptes";
import ActifsScreen from "../app/actifs";
import AddTransactionScreen from "../app/add-transaction";

function workbook(): Workbook {
  return {
    accounts: [
      {
        id: "empty",
        label: "Empty",
        type: "BROKER",
        envelope: "CTO",
      },
      {
        id: "broker",
        label: "Broker",
        type: "BROKER",
        envelope: "CTO",
      },
    ],
    assets: [
      {
        id: "stock",
        label: "Stock",
        type: "ETF",
        source: "manual",
        currency: "EUR",
      },
    ],
    transactions: [
      {
        date: new Date("2025-01-01T00:00:00.000Z"),
        type: "ACHAT",
        compte: "broker",
        actif: "stock",
        quantite: 1,
        prixUnitaire: 100,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
    ],
    budget: [],
    properties: [],
    dca: [],
  };
}

function render(component: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer;
  act(() => {
    renderer = create(component);
  });
  return renderer!;
}

function button(
  renderer: ReactTestRenderer,
  accessibilityLabel: string,
): ReactTestInstance {
  return renderer.root.find(
    (node) => node.props.accessibilityLabel === accessibilityLabel,
  );
}

function visibleText(renderer: ReactTestRenderer): string {
  return renderer.root
    .findAll((node) => node.type === "Text")
    .flatMap((node) => node.children)
    .filter((child): child is string => typeof child === "string")
    .join(" ");
}

describe("mobile deletion interface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteAccount.mockResolvedValue(undefined);
    mocks.deleteAsset.mockResolvedValue(undefined);
    mocks.workbookState = {
      workbook: workbook(),
      prices: new Map([["stock", 100]]),
      loading: false,
      refresh: mocks.refresh,
    };
  });

  it("shows an accessible delete button on every account and asset card", () => {
    const accounts = render(<ComptesScreen />);
    const assets = render(<ActifsScreen />);

    expect(
      accounts.root.findAll(
        (node) =>
          typeof node.props.accessibilityLabel === "string" &&
          node.props.accessibilityLabel.startsWith("Supprimer le compte"),
      ),
    ).toHaveLength(2);
    expect(
      assets.root.findAll(
        (node) =>
          typeof node.props.accessibilityLabel === "string" &&
          node.props.accessibilityLabel.startsWith("Supprimer l'actif"),
      ),
    ).toHaveLength(1);
  });

  it("shows a simple irreversible confirmation for an empty account", () => {
    const renderer = render(<ComptesScreen />);

    act(() => {
      button(renderer, "Supprimer le compte Empty").props.onPress();
    });

    expect(visibleText(renderer)).toMatch(/action est irréversible/i);
    expect(visibleText(renderer)).not.toMatch(/rattacher à aucun compte/i);
  });

  it("offers cascade and detach modes with affected data for a non-empty account", () => {
    const renderer = render(<ComptesScreen />);

    act(() => {
      button(renderer, "Supprimer le compte Broker").props.onPress();
    });

    expect(visibleText(renderer)).toMatch(/supprimer les données liées/i);
    expect(visibleText(renderer)).toMatch(/rattacher à aucun compte/i);
    expect(visibleText(renderer)).toMatch(/1 transaction/i);
    expect(visibleText(renderer)).toMatch(/1 actif/i);
  });

  it("shows affected data and irreversibility before deleting an asset", () => {
    const renderer = render(<ActifsScreen />);

    act(() => {
      button(renderer, "Supprimer l'actif Stock").props.onPress();
    });

    expect(visibleText(renderer)).toMatch(/1 transaction/i);
    expect(visibleText(renderer)).toMatch(/action est irréversible/i);
  });

  it("persists the selected deletion and refreshes the workbook after success", async () => {
    const renderer = render(<ComptesScreen />);

    act(() => {
      button(renderer, "Supprimer le compte Broker").props.onPress();
    });
    act(() => {
      button(renderer, "Rattacher à Aucun compte").props.onPress();
    });
    await act(async () => {
      await button(renderer, "Confirmer la suppression").props.onPress();
    });

    expect(mocks.deleteAccount).toHaveBeenCalledWith("broker", "detach");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("keeps the confirmation visible and reports an error when deletion fails", async () => {
    mocks.deleteAsset.mockRejectedValue(new Error("Workbook is locked"));
    const renderer = render(<ActifsScreen />);

    act(() => {
      button(renderer, "Supprimer l'actif Stock").props.onPress();
    });
    await act(async () => {
      await button(renderer, "Confirmer la suppression").props.onPress();
    });

    expect(visibleText(renderer)).toMatch(/Workbook is locked/);
    expect(visibleText(renderer)).toMatch(/Supprimer\s+Stock/);
  });

  it("excludes No account from mobile transaction creation options", () => {
    mocks.workbookState = {
      ...mocks.workbookState,
      workbook: {
        ...workbook(),
        accounts: [
          {
            id: NO_ACCOUNT_ID,
            label: "Aucun compte",
            type: "BROKER",
            envelope: "CTO",
          },
          ...workbook().accounts,
        ],
      },
    };

    const renderer = render(<AddTransactionScreen />);

    expect(visibleText(renderer)).not.toMatch(/Aucun compte/);
  });
});
