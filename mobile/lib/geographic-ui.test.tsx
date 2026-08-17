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
  syncJustEtf: vi.fn(),
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
  syncJustEtfGeographicAllocationInSource: mocks.syncJustEtf,
}));

vi.mock("./write-account", () => ({
  updateAccountInSource: vi.fn(),
  deleteAccountFromSource: vi.fn(),
}));

import { router } from "expo-router";
import GeographieScreen from "../app/geographie";
import ComptesScreen from "../app/comptes";
import AccountDetailScreen from "../app/account-detail";
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
    mocks.syncJustEtf.mockResolvedValue({ ok: true });
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
    expect(findByText(renderer, /Amérique du Nord/i).length).toBeGreaterThan(0);
    expect(findByText(renderer, /Asie-Pacifique/i).length).toBeGreaterThan(0);
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

    const countryChoice = renderer.root.find(
      (node) =>
        typeof node.props.accessibilityLabel === "string" &&
        node.props.accessibilityLabel.startsWith("Clé géographique 1") &&
        node.props.accessibilityLabel.includes("États-Unis"),
    );
    const weightInput = renderer.root.find(
      (node) =>
        node.props.accessibilityLabel === "Poids géographique 1",
    );
    act(() => {
      countryChoice.props.onPress();
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

  it("mobile asset editor shows JustETF sync and restore when the asset has an ISIN", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <AssetGeographicEditor
          assetId="world"
          assetLabel="World ETF"
          hasIsin
          allocations={[
            {
              assetId: "world",
              country: "US",
              weight: 0.7,
              source: "justetf",
            },
          ]}
          regions={[]}
          countries={[{ key: "US", marketValue: 70, weight: 0.7 }]}
          colors={{
            text: "#000",
            textSecondary: "#666",
            textMuted: "#999",
            cardBorder: "#ddd",
            accentBg: "#111",
          }}
          onSave={mocks.replaceGeographic}
          onSyncJustEtf={mocks.syncJustEtf}
          pending={false}
        />,
      );
    });

    expect(
      renderer.root.find(
        (node) => node.props.accessibilityLabel === "Sync JustETF",
      ),
    ).toBeTruthy();
    expect(
      renderer.root.find(
        (node) =>
          node.props.accessibilityLabel === "Rétablir depuis JustETF",
      ),
    ).toBeTruthy();
  });

  it("mobile asset editor hides JustETF actions when the asset has no ISIN", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <AssetGeographicEditor
          assetId="btc"
          assetLabel="Bitcoin"
          hasIsin={false}
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
          onSyncJustEtf={mocks.syncJustEtf}
          pending={false}
        />,
      );
    });

    expect(
      renderer.root.findAll(
        (node) =>
          node.props.accessibilityLabel === "Sync JustETF" ||
          node.props.accessibilityLabel === "Récupérer depuis JustETF" ||
          node.props.accessibilityLabel === "Rétablir depuis JustETF",
      ),
    ).toHaveLength(0);
  });

  it("mobile ordinary JustETF sync calls restore=false", async () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <AssetGeographicEditor
          assetId="world"
          assetLabel="World ETF"
          hasIsin
          allocations={[
            {
              assetId: "world",
              country: "US",
              weight: 0.7,
              source: "manual",
            },
          ]}
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
          onSyncJustEtf={mocks.syncJustEtf}
          pending={false}
        />,
      );
    });

    const syncButton = renderer.root.find(
      (node) => node.props.accessibilityLabel === "Sync JustETF",
    );
    await act(async () => {
      await syncButton.props.onPress();
    });
    expect(mocks.syncJustEtf).toHaveBeenCalledWith({ restore: false });
  });

  it("mobile restore from JustETF calls restore=true", async () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <AssetGeographicEditor
          assetId="world"
          assetLabel="World ETF"
          hasIsin
          allocations={[
            {
              assetId: "world",
              country: "US",
              weight: 0.7,
              source: "manual",
            },
          ]}
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
          onSyncJustEtf={mocks.syncJustEtf}
          pending={false}
        />,
      );
    });

    const restoreButton = renderer.root.find(
      (node) =>
        node.props.accessibilityLabel === "Rétablir depuis JustETF",
    );
    await act(async () => {
      await restoreButton.props.onPress();
    });
    expect(mocks.syncJustEtf).toHaveBeenCalledWith({ restore: true });
  });

  it("mobile manual entry offers the same guided countries|regions pickers", () => {
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
      renderer.root.findAll(
        (node) => node.props.accessibilityLabel === "Mode saisie pays",
      ).length,
    ).toBe(1);
    expect(
      renderer.root.findAll(
        (node) => node.props.accessibilityLabel === "Mode saisie régions",
      ).length,
    ).toBe(1);

    act(() => {
      renderer.root.find(
        (node) => node.props.accessibilityLabel === "Mode saisie régions",
      ).props.onPress();
    });

    expect(
      renderer.root.findAll(
        (node) =>
          typeof node.props.accessibilityLabel === "string" &&
          node.props.accessibilityLabel.includes("Amérique du Nord"),
      ).length,
    ).toBeGreaterThan(0);
  });

  it("mobile manual entry keeps country draft percentages when toggling to regions and back", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <AssetGeographicEditor
          assetId="world"
          assetLabel="World ETF"
          allocations={[
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
          ]}
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
      renderer.root.find(
        (node) => node.props.accessibilityLabel === "Poids géographique 1",
      ).props.value,
    ).toBe("70");
    expect(
      renderer.root.find(
        (node) => node.props.accessibilityLabel === "Poids géographique 2",
      ).props.value,
    ).toBe("30");

    act(() => {
      renderer.root.find(
        (node) => node.props.accessibilityLabel === "Mode saisie régions",
      ).props.onPress();
    });
    act(() => {
      renderer.root.find(
        (node) => node.props.accessibilityLabel === "Mode saisie pays",
      ).props.onPress();
    });

    expect(
      renderer.root.find(
        (node) => node.props.accessibilityLabel === "Poids géographique 1",
      ).props.value,
    ).toBe("70");
    expect(
      renderer.root.find(
        (node) => node.props.accessibilityLabel === "Poids géographique 2",
      ).props.value,
    ).toBe("30");
  });

  it("shows a non-blocking current-sum indicator when draft weights sum to less than 100%", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(
        <AssetGeographicEditor
          assetId="world"
          assetLabel="World ETF"
          allocations={[
            {
              assetId: "world",
              country: "US",
              weight: 0.7,
              source: "manual",
            },
            {
              assetId: "world",
              country: "JP",
              weight: 0.1,
              source: "manual",
            },
          ]}
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

    expect(findByText(renderer, /80\s*%\s*renseignés/i).length).toBeGreaterThan(
      0,
    );
    expect(
      renderer.root.find(
        (node) =>
          node.props.accessibilityLabel ===
          "Enregistrer la répartition géographique",
      ).props.disabled,
    ).toBe(false);
  });

  it("mobile accounts list does not render per-account geographic exposure lists", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ComptesScreen />);
    });

    expect(findByText(renderer, "Géographie du compte")).toHaveLength(0);
    expect(findByText(renderer, /États-Unis/i)).toHaveLength(0);
  });

  it("mobile accounts list navigates to account detail instead of edit-account", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<ComptesScreen />);
    });

    const accountCard = renderer.root.find(
      (node) =>
        node.props.accessibilityLabel === "Ouvrir le compte PEA" ||
        node.props.accessibilityLabel === "Modifier le compte PEA",
    );
    act(() => {
      accountCard.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/account-detail",
      params: { id: "pea" },
    });
  });

  it("mobile account detail shows positions and country plus region exposure", () => {
    mocks.routeParams = { id: "pea" };
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<AccountDetailScreen />);
    });

    expect(findByText(renderer, /World ETF/i).length).toBeGreaterThan(0);
    expect(findByText(renderer, /États-Unis/i).length).toBeGreaterThan(0);
    expect(findByText(renderer, /Amérique du Nord/i).length).toBeGreaterThan(0);
    expect(findByText(renderer, /Asie-Pacifique/i).length).toBeGreaterThan(0);
  });

  it("mobile account detail links to edit-account for metadata", () => {
    mocks.routeParams = { id: "pea" };
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<AccountDetailScreen />);
    });

    const editButton = renderer.root.find(
      (node) =>
        node.props.accessibilityLabel === "Modifier le compte PEA",
    );
    act(() => {
      editButton.props.onPress();
    });

    expect(router.push).toHaveBeenCalledWith({
      pathname: "/edit-account",
      params: { id: "pea" },
    });
  });
});
