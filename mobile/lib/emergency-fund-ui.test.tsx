import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { EmergencyFundHealth } from "@patrimo/core/emergency-fund";
import { colors } from "./theme";

vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  StyleSheet: { create: (styles: unknown) => styles, hairlineWidth: 1 },
}));

import { EmergencyFundCard } from "./emergency-fund-card";

function health(
  overrides: Partial<EmergencyFundHealth> = {},
): EmergencyFundHealth {
  return {
    coverageMonths: 4.2,
    status: "acceptable",
    livretBalance: 12_450,
    monthlyExpenses: 2_980,
    ...overrides,
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

describe("mobile EmergencyFundCard", () => {
  it("renders months, status label, and input detail when health is defined", () => {
    const text = visibleText(
      render(<EmergencyFundCard health={health()} theme={colors.light} />),
    );

    expect(text).toContain("Fonds d'urgence");
    expect(text).toMatch(/4,2\s*mois/);
    expect(text).toContain("Acceptable");
    expect(text).toMatch(/12[\s\u00a0]?450.*livrets/i);
    expect(text).toMatch(/2[\s\u00a0]?980.*\/\s*mois/i);
  });

  it("renders over-allocated hint when status is over_allocated", () => {
    const text = visibleText(
      render(
        <EmergencyFundCard
          health={health({
            coverageMonths: 14,
            status: "over_allocated",
            livretBalance: 42_000,
            monthlyExpenses: 3_000,
          })}
          theme={colors.light}
        />,
      ),
    );

    expect(text).toContain("Surdimensionné");
    expect(text).toMatch(/Capital potentiellement immobilisé/i);
  });

  it("renders nothing when health is null", () => {
    const renderer = render(
      <EmergencyFundCard health={null} theme={colors.light} />,
    );
    expect(renderer.toJSON()).toBeNull();
  });
});
