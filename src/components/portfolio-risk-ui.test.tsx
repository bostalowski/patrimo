// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PortfolioConcentration } from "@patrimo/core/portfolio-risk";
import { ConcentrationSummary } from "@/components/concentration-summary";
import { RiskBadges } from "@/components/charts/returns-heatmap";

afterEach(cleanup);

function concentration(
  overrides: Partial<PortfolioConcentration> = {},
): PortfolioConcentration {
  return {
    top1Label: "CW8",
    top1Weight: 0.42,
    top3Weight: 0.71,
    status: "balanced",
    ...overrides,
  };
}

describe("ConcentrationSummary", () => {
  it("shows largest line label, top1 percent, and concentration status under the allocation donut", () => {
    render(<ConcentrationSummary concentration={concentration()} />);

    expect(screen.getByText(/CW8/)).toBeTruthy();
    expect(screen.getByText(/42/)).toBeTruthy();
    expect(screen.getByText("Équilibré")).toBeTruthy();
  });

  it("hides concentration block when concentration is null", () => {
    const { container } = render(<ConcentrationSummary concentration={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("RiskBadges", () => {
  it("renders risk badges with human FR titles, numeric values, status words, and a shared color legend", () => {
    render(
      <RiskBadges volatility={0.12} sharpe={0.85} drawdown={-0.18} />,
    );

    expect(screen.getByText("Oscillations")).toBeTruthy();
    expect(screen.getByText("Rendement / risque")).toBeTruthy();
    expect(screen.getByText("Pire chute")).toBeTruthy();
    expect(screen.getByText(/normales/i)).toBeTruthy();
    expect(screen.getByText(/correct/i)).toBeTruthy();
    expect(screen.getByText(/marquée/i)).toBeTruthy();
    expect(screen.getByText(/confortable/i)).toBeTruthy();
    expect(screen.getByText(/à surveiller/i)).toBeTruthy();
    expect(screen.getByText(/élevé/i)).toBeTruthy();
  });

  it("shows em dash for null volatility or sharpe without a status band", () => {
    render(<RiskBadges volatility={null} sharpe={null} drawdown={-0.05} />);

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/faibles|normales|élevées/i)).toBeNull();
    expect(screen.queryByText(/bon|correct|faible/i)).toBeNull();
    expect(screen.getByText(/légère/i)).toBeTruthy();
  });
});
