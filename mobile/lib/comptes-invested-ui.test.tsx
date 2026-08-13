import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { formatEuro } from "@patrimo/core/format";
import type { Workbook } from "@patrimo/core/schema";

const mocks = vi.hoisted(() => ({
  workbookState: {} as Record<string, unknown>,
  push: vi.fn(),
}));

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Platform: { OS: "ios", select: (values: Record<string, unknown>) => values.ios },
  useColorScheme: () => "light",
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

vi.mock("expo-router", () => ({
  router: { push: mocks.push },
}));

vi.mock("./use-workbook", () => ({
  useWorkbook: () => mocks.workbookState,
}));

import ComptesScreen from "../app/comptes";

function workbook(overrides: Partial<Workbook> = {}): Workbook {
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
        id: "etf-monde",
        label: "ETF Monde",
        type: "ETF",
        source: "manual",
        currency: "EUR",
      },
    ],
    transactions: [],
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

function visibleText(renderer: ReactTestRenderer): string {
  return renderer.root
    .findAll((node) => node.type === "Text")
    .flatMap((node) => node.children)
    .filter((child): child is string => typeof child === "string")
    .join(" ");
}

describe("mobile comptes invested display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists an active position under the account with Investi", () => {
    mocks.workbookState = {
      workbook: workbook({
        transactions: [
          {
            date: new Date("2026-01-01T00:00:00.000Z"),
            type: "ACHAT",
            compte: "broker",
            actif: "etf-monde",
            quantite: 6,
            prixUnitaire: 100,
            devise: "EUR",
            frais: 0,
            fraisDevise: "EUR",
          },
        ],
      }),
      prices: new Map([["etf-monde", 120]]),
      loading: false,
      refresh: vi.fn(),
    };

    const text = visibleText(render(<ComptesScreen />)).replace(/\s/g, " ");
    expect(text).toContain("ETF Monde");
    expect(text).toContain("Investi");
    expect(text).toContain(formatEuro(600).replace(/\s/g, " "));
    expect(text).toContain(formatEuro(720).replace(/\s/g, " "));
  });

  it("does not list positions when the account has no active quantity", () => {
    mocks.workbookState = {
      workbook: workbook(),
      prices: new Map([["etf-monde", 120]]),
      loading: false,
      refresh: vi.fn(),
    };

    const text = visibleText(render(<ComptesScreen />));
    expect(text).toContain("Broker");
    expect(text).toContain("Investi:");
    expect(text).not.toContain("ETF Monde");
  });
});
