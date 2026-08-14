// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { EmergencyFundHealth } from "@patrimo/core/emergency-fund";
import { EmergencyFundCard } from "@/components/emergency-fund-card";

afterEach(cleanup);

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

describe("EmergencyFundCard", () => {
  it("renders months, status label, and input detail when health is defined", () => {
    render(<EmergencyFundCard health={health()} />);

    expect(screen.getByText("Fonds d'urgence")).toBeTruthy();
    expect(screen.getByText(/4,2\s*mois/)).toBeTruthy();
    expect(screen.getByText("Acceptable")).toBeTruthy();
    expect(screen.getByText(/12\s*450.*livrets/i)).toBeTruthy();
    expect(screen.getByText(/2\s*980.*\/\s*mois/i)).toBeTruthy();
  });

  it("renders over-allocated hint when status is over_allocated", () => {
    render(
      <EmergencyFundCard
        health={health({
          coverageMonths: 14,
          status: "over_allocated",
          livretBalance: 42_000,
          monthlyExpenses: 3_000,
        })}
      />,
    );

    expect(screen.getByText("Surdimensionné")).toBeTruthy();
    expect(screen.getByText(/Capital potentiellement immobilisé/i)).toBeTruthy();
  });

  it("renders nothing when health is null", () => {
    const { container } = render(<EmergencyFundCard health={null} />);
    expect(container.firstChild).toBeNull();
  });
});
