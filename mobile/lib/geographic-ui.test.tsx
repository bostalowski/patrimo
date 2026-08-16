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
  replaceGeographic: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  TextInput: "TextInput",
  ActivityIndicator: "ActivityIndicator",
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
  useLocalSearchParams: () => mocks.routeParams,
}));

vi.mock("./use-workbook", () => ({
  useWorkbook: () => mocks.workbookState,
}));

vi.mock("./write-asset", () => ({
  updateAssetInSource: vi.fn(),
  deleteAssetFromSource: vi.fn(),
  upsertManualPriceInSource: vi.fn(),
  deleteManualPriceFromSource: vi.fn(),
  replaceGeographicAllocationInSource: mocks.replaceGeographic,
}));

import GeographieScreen from "../app/geographie";
import ComptesScreen from "../app/comptes";
import { AssetGeographicEditor } from "../components/asset-geographic-editor";

function textOf(node: ReactTestInstance | string): string {
  if (typeof node === "string") return node;
  const kids = node.children ?? [];
  return kids.map((child) => textOf(child as ReactTestInstance)).join("");
}

function findByText(root: ReactTestRenderer, pattern: RegExp | string) {
  return root.root.findAll(
    (node) => {
      if (node.type !== "Text") return false;
      const value = textOf(node);
      return typeof pattern === "string"
        ? value.includes(pattern)
        : pattern.test(value);
    },
  );
}

function workbook(overrides: Partial<Workbook> = {}): Workbook {
  return {
    transactions: [
      {
        date: new Date("2026-01-01T00:00:00.000Z"),
        type: "ACHAT",
        compte: "pea",
        actif: "world",
        quantite: 10,
        prixUnitaire: 100,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
    ],
    assets: [
      {
        id: "world",
        label: "World ETF",
        type: "ETF",
        source: "yahoo",
        currency: "EUR",
        isin: "IE00B4L5Y983",
      },
      {
        id: "btc",
        label: "Bitcoin",
        type: "CRYPTO",
        source: "coingecko",
        currency: "EUR",
      },
    ],
    accounts: [
      {
        id: "pea",
        label: "PEA",
        type: "BROKER",
        envelope: "PEA",
      },
    ],
    budget: [],
    properties: [],
    dca: [],
    manualPrices: [],
    geographicAllocations: [
      {
        assetId: "world",
        country: "US",
        weight: 0.7,
        source: "manual",
      },
      {
        assetId: "world",
        country: "JP",
        weight: 0.3,
        source: "manual",
      },
    ],
    ...overrides,
  };
}

describe("mobile geographic UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refresh.mockResolvedValue(undefined);
    mocks.replaceGeographic.mockResolvedValue(undefined);
    mocks.workbookState = {
      workbook: workbook(),
      prices: new Map([["world", 100]]),
      loading: false,
      error: null,
      refresh: mocks.refresh,
    };
  });

  it("mobile global geography screen renders aggregated country slices", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<GeographieScreen />);
    });

    expect(findByText(renderer, "Répartition géographique").length).toBeGreaterThan(
      0,
    );
    expect(findByText(renderer, /États-Unis/i).length).toBeGreaterThan(0);
    expect(findByText(renderer, /Japon/i).length).toBeGreaterThan(0);
  });

  it("mobile asset screen shows empty state without allocation and can save manual weights", async () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <AssetGeographicEditor
          assetId="btc"
          assetLabel="Bitcoin"
          allocations={[]}
          regions={[]}
          countries={[]}
          colors={{
            text: "#000",
            textSecondary: "#666",
            textMuted: "#999",
            cardBorder: "#ddd",
            accentBg: "#111",
          }}
          onSave={mocks.replaceGeographic}
          pending={false}
        />,
      );
    });

    expect(
      findByText(renderer, /Aucune répartition géographique/i).length,
    ).toBeGreaterThan(0);

    const countryInput = renderer.root.find(
      (node) =>
        node.props.accessibilityLabel === "Pays géographique 1",
    );
    const weightInput = renderer.root.find(
      (node) =>
        node.props.accessibilityLabel === "Poids géographique 1",
    );
    act(() => {
      countryInput.props.onChangeText("US");
      weightInput.props.onChangeText("100");
    });

    const saveButtonAfterEdit = renderer.root.find(
      (node) =>
        node.props.accessibilityLabel ===
        "Enregistrer la répartition géographique",
    );

    await act(async () => {
      await saveButtonAfterEdit.props.onPress();
    });

    expect(mocks.replaceGeographic).toHaveBeenCalledWith([
      { country: "US", weight: 1 },
    ]);
  });

  it("mobile accounts screen shows per-account geographic slices", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ComptesScreen />);
    });

    expect(findByText(renderer, "Géographie du compte").length).toBeGreaterThan(
      0,
    );
    expect(findByText(renderer, /États-Unis/i).length).toBeGreaterThan(0);
  });
});
