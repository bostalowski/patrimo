import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { formatEuro } from "@patrimo/core/format";
import type { DcaConfig, Workbook } from "@patrimo/core/schema";

const mocks = vi.hoisted(() => ({
  workbookState: {} as Record<string, unknown>,
}));

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  TextInput: "TextInput",
  ScrollView: "ScrollView",
  TouchableOpacity: "TouchableOpacity",
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
  Platform: { OS: "ios", select: (values: Record<string, unknown>) => values.ios },
  useColorScheme: () => "light",
}));

vi.mock("./use-workbook", () => ({
  useWorkbook: () => mocks.workbookState,
}));

import ProjectionScreen from "../app/projection";

function workbook(overrides: Partial<Workbook> = {}): Workbook {
  return {
    accounts: [
      {
        id: "pee",
        label: "PEE",
        type: "BROKER",
        envelope: "PEE",
      },
    ],
    assets: [
      {
        id: "fcpe",
        label: "FCPE",
        type: "FCPE",
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

function monthlyPlan(amount: number): DcaConfig {
  return {
    id: "dca-monthly",
    label: "Versement mensuel",
    envelope: "PEE",
    amount,
    frequency: "MENSUEL",
    lines: [{ label: "FCPE", assetIds: ["fcpe"], targetPct: 1 }],
  };
}

function annualPlan(amount: number, paymentMonth = 12): DcaConfig {
  return {
    id: "dca-annual",
    label: "Dotation PEE",
    envelope: "PEE",
    amount,
    frequency: "ANNUEL",
    paymentMonth,
    lines: [{ label: "FCPE", assetIds: ["fcpe"], targetPct: 1 }],
  };
}

function quarterlyPlan(amount: number, paymentMonth = 3): DcaConfig {
  return {
    id: "dca-quarterly",
    label: "Versement trimestriel",
    envelope: "PEE",
    amount,
    frequency: "TRIMESTRIEL",
    paymentMonth,
    lines: [{ label: "FCPE", assetIds: ["fcpe"], targetPct: 1 }],
  };
}

function withHolding(base: Workbook): Workbook {
  return {
    ...base,
    transactions: [
      {
        date: new Date("2026-01-01T00:00:00.000Z"),
        type: "ACHAT",
        compte: "pee",
        actif: "fcpe",
        quantite: 10,
        prixUnitaire: 100,
        devise: "EUR",
        frais: 0,
        fraisDevise: "EUR",
      },
    ],
  };
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

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function peeMonthlyInputValue(renderer: ReactTestRenderer): string {
  const inputs = renderer.root.findAll((node) => node.type === "TextInput");
  expect(inputs.length).toBeGreaterThanOrEqual(3);
  return String(inputs[2].props.value ?? "");
}

function setLoadedWorkbook(data: Workbook) {
  mocks.workbookState = {
    workbook: data,
    prices: new Map([["fcpe", 100]]),
    loading: false,
    refresh: vi.fn(),
  };
}

describe("mobile projection extra streams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows no extra badge when the envelope has only a monthly DCA stream", () => {
    setLoadedWorkbook(workbook({ dca: [monthlyPlan(200)] }));

    const renderer = render(<ProjectionScreen />);
    const text = normalize(visibleText(renderer));

    expect(peeMonthlyInputValue(renderer)).toBe("200");
    expect(text).not.toContain("/an");
    expect(text).not.toContain("/trim.");
  });

  it("shows an annual extra badge when the envelope has an annual DCA stream", () => {
    setLoadedWorkbook(workbook({ dca: [annualPlan(1200, 12)] }));

    const renderer = render(<ProjectionScreen />);
    const text = normalize(visibleText(renderer));
    const expectedBadge = normalize(`+ ${formatEuro(1200)}/an · déc.`);

    expect(peeMonthlyInputValue(renderer)).toBe("0");
    expect(text).toContain(expectedBadge);
  });

  it("shows a quarterly extra badge when the envelope has a quarterly DCA stream", () => {
    setLoadedWorkbook(workbook({ dca: [quarterlyPlan(300, 3)] }));

    const renderer = render(<ProjectionScreen />);
    const text = normalize(visibleText(renderer));
    const expectedBadge = normalize(`+ ${formatEuro(300)}/trim. · mars`);

    expect(peeMonthlyInputValue(renderer)).toBe("0");
    expect(text).toContain(expectedBadge);
  });

  it("shows monthly default and extra badges together when both exist", () => {
    setLoadedWorkbook(
      workbook({ dca: [monthlyPlan(150), annualPlan(1200, 12)] }),
    );

    const renderer = render(<ProjectionScreen />);
    const text = normalize(visibleText(renderer));
    const expectedBadge = normalize(`+ ${formatEuro(1200)}/an · déc.`);

    expect(peeMonthlyInputValue(renderer)).toBe("150");
    expect(text).toContain(expectedBadge);
  });

  it("shows no extra badge when the envelope has no non-monthly streams", () => {
    setLoadedWorkbook(withHolding(workbook({ dca: [] })));

    const renderer = render(<ProjectionScreen />);
    const text = normalize(visibleText(renderer));

    expect(peeMonthlyInputValue(renderer)).toBe("0");
    expect(text).not.toContain("/an");
    expect(text).not.toContain("/trim.");
  });
});
