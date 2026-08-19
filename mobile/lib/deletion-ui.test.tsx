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
  routeParams: {} as Record<string, string>,
  deleteAccount: vi.fn(),
  deleteAsset: vi.fn(),
  updateAccount: vi.fn(),
  updateAsset: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
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
  router: { push: vi.fn(), back: mocks.back },
  useLocalSearchParams: () => mocks.routeParams,
}));

vi.mock("./use-workbook", () => ({
  useWorkbook: () => mocks.workbookState,
}));

vi.mock("./write-account", () => ({
  deleteAccountFromSource: mocks.deleteAccount,
  updateAccountInSource: mocks.updateAccount,
}));

vi.mock("./write-asset", () => ({
  deleteAssetFromSource: mocks.deleteAsset,
  updateAssetInSource: mocks.updateAsset,
  upsertManualPriceInSource: vi.fn(),
  deleteManualPriceFromSource: vi.fn(),
}));

vi.mock("./write-transaction", () => ({
  appendTransaction: vi.fn(),
}));

import AddTransactionScreen from "../app/add-transaction";
import EditAccountScreen from "../app/edit-account";
import EditAssetScreen from "../app/edit-asset";

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
    manualPrices: [],
    geographicAllocations: [],
    diversificationTargets: [],
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
    mocks.routeParams = {};
    mocks.deleteAccount.mockResolvedValue(undefined);
    mocks.deleteAsset.mockResolvedValue(undefined);
    mocks.updateAccount.mockResolvedValue(undefined);
    mocks.updateAsset.mockResolvedValue(undefined);
    mocks.workbookState = {
      workbook: workbook(),
      prices: new Map([["stock", 100]]),
      loading: false,
      refresh: mocks.refresh,
    };
  });

  it("shows an accessible delete button on every account and asset edit screen", () => {
    mocks.routeParams = { id: "empty" };
    const emptyAccount = render(<EditAccountScreen />);
    mocks.routeParams = { id: "broker" };
    const brokerAccount = render(<EditAccountScreen />);
    mocks.routeParams = { id: "stock" };
    const asset = render(<EditAssetScreen />);

    expect(button(emptyAccount, "Supprimer le compte Empty")).toBeDefined();
    expect(button(brokerAccount, "Supprimer le compte Broker")).toBeDefined();
    expect(button(asset, "Supprimer l'actif Stock")).toBeDefined();
  });

  it("shows a simple irreversible confirmation for an empty account", () => {
    mocks.routeParams = { id: "empty" };
    const renderer = render(<EditAccountScreen />);

    act(() => {
      button(renderer, "Supprimer le compte Empty").props.onPress();
    });

    expect(visibleText(renderer)).toMatch(/action est irréversible/i);
    expect(visibleText(renderer)).not.toMatch(/rattacher à aucun compte/i);
  });

  it("offers cascade and detach modes with affected data for a non-empty account", () => {
    mocks.routeParams = { id: "broker" };
    const renderer = render(<EditAccountScreen />);

    act(() => {
      button(renderer, "Supprimer le compte Broker").props.onPress();
    });

    expect(visibleText(renderer)).toMatch(/supprimer les données liées/i);
    expect(visibleText(renderer)).toMatch(/rattacher à aucun compte/i);
    expect(visibleText(renderer)).toMatch(/1 transaction/i);
    expect(visibleText(renderer)).toMatch(/1 actif/i);
  });

  it("shows affected data and irreversibility before deleting an asset", () => {
    mocks.routeParams = { id: "stock" };
    const renderer = render(<EditAssetScreen />);

    act(() => {
      button(renderer, "Supprimer l'actif Stock").props.onPress();
    });

    expect(visibleText(renderer)).toMatch(/1 transaction/i);
    expect(visibleText(renderer)).toMatch(/action est irréversible/i);
  });

  it("persists the selected deletion and refreshes the workbook after success", async () => {
    mocks.routeParams = { id: "broker" };
    const renderer = render(<EditAccountScreen />);

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
    mocks.routeParams = { id: "stock" };
    const renderer = render(<EditAssetScreen />);

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
