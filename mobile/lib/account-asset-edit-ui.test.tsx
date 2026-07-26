import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from "react-test-renderer";
import type { Workbook } from "@patrimo/core/schema";

const mocks = vi.hoisted(() => ({
  workbookState: {} as Record<string, unknown>,
  routeParams: {} as Record<string, string>,
  push: vi.fn(),
  back: vi.fn(),
  refresh: vi.fn(),
  updateAccount: vi.fn(),
  updateAsset: vi.fn(),
  deleteAccount: vi.fn(),
  deleteAsset: vi.fn(),
  upsertManualPrice: vi.fn(),
  deleteManualPrice: vi.fn(),
}));

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  Pressable: "Pressable",
  TextInput: "TextInput",
  ActivityIndicator: "ActivityIndicator",
  KeyboardAvoidingView: "KeyboardAvoidingView",
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
  router: { push: mocks.push, back: mocks.back },
  useLocalSearchParams: () => mocks.routeParams,
}));

vi.mock("./use-workbook", () => ({
  useWorkbook: () => mocks.workbookState,
}));

vi.mock("./write-account", () => ({
  updateAccountInSource: mocks.updateAccount,
  deleteAccountFromSource: mocks.deleteAccount,
}));

vi.mock("./write-asset", () => ({
  updateAssetInSource: mocks.updateAsset,
  deleteAssetFromSource: mocks.deleteAsset,
  upsertManualPriceInSource: mocks.upsertManualPrice,
  deleteManualPriceFromSource: mocks.deleteManualPrice,
}));

vi.mock("./write-transaction", () => ({
  appendTransaction: vi.fn(),
}));

import ComptesScreen from "../app/comptes";
import ActifsScreen from "../app/actifs";

const appModules = import.meta.glob("../app/*.tsx");

function workbook(
  overrides: Partial<Workbook> & { manualPrices?: Array<{
    assetId: string;
    date: Date;
    price: number;
  }> } = {},
): Workbook {
  return {
    accounts: [
      {
        id: "broker",
        label: "Broker",
        type: "BROKER",
        envelope: "CTO",
      },
    ],
    assets: [
      {
        id: "fund",
        label: "Employee fund",
        type: "FCPE",
        source: "manual",
        currency: "EUR",
      },
    ],
    transactions: [
      {
        date: new Date("2026-01-10T00:00:00.000Z"),
        type: "ACHAT",
        compte: "broker",
        actif: "fund",
        quantite: 2,
        prixUnitaire: 100,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
    ],
    budget: [],
    properties: [],
    dca: [],
    ...overrides,
  } as Workbook;
}

function render(component: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(component);
  });
  expect(renderer).toBeDefined();
  return renderer as ReactTestRenderer;
}

function accessible(
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

async function loadEditScreen(
  path: "../app/edit-account.tsx" | "../app/edit-asset.tsx",
): Promise<React.ComponentType> {
  const load = appModules[path];
  expect(load, `Expected the planned ${path} screen to exist`).toBeTypeOf(
    "function",
  );
  const screenModule = (await load()) as { default?: React.ComponentType };
  expect(
    screenModule.default,
    `Expected ${path} to export a default screen`,
  ).toBeTypeOf("function");
  return screenModule.default as React.ComponentType;
}

describe("mobile account and asset edit interface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.routeParams = {};
    mocks.updateAccount.mockResolvedValue(undefined);
    mocks.updateAsset.mockResolvedValue(undefined);
    mocks.deleteAccount.mockResolvedValue(undefined);
    mocks.deleteAsset.mockResolvedValue(undefined);
    mocks.upsertManualPrice.mockResolvedValue(undefined);
    mocks.deleteManualPrice.mockResolvedValue(undefined);
    mocks.workbookState = {
      workbook: workbook({
        manualPrices: [
          {
            assetId: "fund",
            date: new Date("2026-07-20T00:00:00.000Z"),
            price: 110,
          },
        ],
      }),
      prices: new Map([["fund", 110]]),
      loading: false,
      refresh: mocks.refresh,
    };
  });

  it("tapping an account card opens its edit screen", () => {
    const renderer = render(<ComptesScreen />);

    act(() => {
      accessible(renderer, "Modifier le compte Broker").props.onPress();
    });

    expect(mocks.push).toHaveBeenCalledWith({
      pathname: "/edit-account",
      params: { id: "broker" },
    });
  });

  it("tapping an asset card opens its edit screen", () => {
    const renderer = render(<ActifsScreen />);

    act(() => {
      accessible(renderer, "Modifier l'actif Employee fund").props.onPress();
    });

    expect(mocks.push).toHaveBeenCalledWith({
      pathname: "/edit-asset",
      params: { id: "fund" },
    });
  });

  it("account edit keeps the identifier read-only and saves editable metadata", async () => {
    mocks.routeParams = { id: "broker" };
    const AccountEditScreen = await loadEditScreen("../app/edit-account.tsx");
    const renderer = render(<AccountEditScreen />);
    const identifier = accessible(renderer, "Identifiant du compte");
    const label = accessible(renderer, "Libellé du compte");

    expect(identifier.props.value).toBe("broker");
    expect(identifier.props.editable).toBe(false);
    act(() => {
      label.props.onChangeText("Renamed broker");
    });
    await act(async () => {
      await accessible(renderer, "Enregistrer le compte").props.onPress();
    });

    expect(mocks.updateAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: "broker", label: "Renamed broker" }),
    );
  });

  it("asset edit keeps the identifier read-only and saves editable metadata", async () => {
    mocks.routeParams = { id: "fund" };
    const AssetEditScreen = await loadEditScreen("../app/edit-asset.tsx");
    const renderer = render(<AssetEditScreen />);
    const identifier = accessible(renderer, "Identifiant de l'actif");
    const label = accessible(renderer, "Libellé de l'actif");

    expect(identifier.props.value).toBe("fund");
    expect(identifier.props.editable).toBe(false);
    act(() => {
      label.props.onChangeText("Renamed fund");
    });
    await act(async () => {
      await accessible(renderer, "Enregistrer l'actif").props.onPress();
    });

    expect(mocks.updateAsset).toHaveBeenCalledWith(
      expect.objectContaining({ id: "fund", label: "Renamed fund" }),
    );
  });

  it("account and asset edit screens expose the existing deletion flow", async () => {
    mocks.routeParams = { id: "broker" };
    const AccountEditScreen = await loadEditScreen("../app/edit-account.tsx");
    const accountRenderer = render(<AccountEditScreen />);

    mocks.routeParams = { id: "fund" };
    const AssetEditScreen = await loadEditScreen("../app/edit-asset.tsx");
    const assetRenderer = render(<AssetEditScreen />);

    expect(
      accessible(accountRenderer, "Supprimer le compte Broker"),
    ).toBeDefined();
    expect(
      accessible(assetRenderer, "Supprimer l'actif Employee fund"),
    ).toBeDefined();
  });

  it("a failed local or Drive write leaves the edit screen open and reports the error", async () => {
    mocks.routeParams = { id: "broker" };
    mocks.updateAccount.mockRejectedValue(new Error("Drive upload failed"));
    const AccountEditScreen = await loadEditScreen("../app/edit-account.tsx");
    const renderer = render(<AccountEditScreen />);
    const label = accessible(renderer, "Libellé du compte");

    act(() => {
      label.props.onChangeText("Unsaved broker");
    });
    await act(async () => {
      await accessible(renderer, "Enregistrer le compte").props.onPress();
    });

    expect(accessible(renderer, "Libellé du compte").props.value).toBe(
      "Unsaved broker",
    );
    expect(visibleText(renderer)).toMatch(/Drive upload failed/);
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it("manual asset edit displays dated price controls and workbook history", async () => {
    mocks.routeParams = { id: "fund" };
    const AssetEditScreen = await loadEditScreen("../app/edit-asset.tsx");
    const renderer = render(<AssetEditScreen />);

    expect(accessible(renderer, "Date du prix manuel")).toBeDefined();
    expect(accessible(renderer, "Montant du prix manuel")).toBeDefined();
    expect(accessible(renderer, "Ajouter le prix manuel")).toBeDefined();
    expect(visibleText(renderer)).toMatch(/110/);
    expect(visibleText(renderer)).toMatch(/2026/);
  });

  it("automatic-source asset edit does not display manual price controls", async () => {
    mocks.routeParams = { id: "etf" };
    mocks.workbookState = {
      ...mocks.workbookState,
      workbook: workbook({
        assets: [
          {
            id: "etf",
            label: "World ETF",
            type: "ETF",
            source: "yahoo",
            param: "WPEA.PA",
            currency: "EUR",
          },
        ],
        manualPrices: [],
      }),
    };
    const AssetEditScreen = await loadEditScreen("../app/edit-asset.tsx");
    const renderer = render(<AssetEditScreen />);

    expect(() => accessible(renderer, "Date du prix manuel")).toThrow();
    expect(() => accessible(renderer, "Ajouter le prix manuel")).toThrow();
  });

  it("a failed workbook write keeps the form state and reports the error", async () => {
    mocks.routeParams = { id: "fund" };
    mocks.upsertManualPrice.mockRejectedValue(new Error("Workbook write failed"));
    const AssetEditScreen = await loadEditScreen("../app/edit-asset.tsx");
    const renderer = render(<AssetEditScreen />);
    const dateInput = accessible(renderer, "Date du prix manuel");
    const priceInput = accessible(renderer, "Montant du prix manuel");

    act(() => {
      dateInput.props.onChangeText("2026-07-21");
      priceInput.props.onChangeText("125.5");
    });
    await act(async () => {
      await accessible(renderer, "Ajouter le prix manuel").props.onPress();
    });

    expect(accessible(renderer, "Date du prix manuel").props.value).toBe(
      "2026-07-21",
    );
    expect(accessible(renderer, "Montant du prix manuel").props.value).toBe(
      "125.5",
    );
    expect(visibleText(renderer)).toMatch(/Workbook write failed/);
    expect(mocks.back).not.toHaveBeenCalled();
  });
});
