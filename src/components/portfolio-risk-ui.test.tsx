// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RiskBadges } from "@/components/charts/returns-heatmap";

afterEach(cleanup);

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
