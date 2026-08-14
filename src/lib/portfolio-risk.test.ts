import { describe, expect, it } from "vitest";
import {
  assessRiskMetricStatus,
  computeConcentration,
} from "@patrimo/core/portfolio-risk";

describe("computeConcentration", () => {
  it("computes top1 weight, label, top3 weight, and diversified status when top1 is under 30%", () => {
    expect(
      computeConcentration([
        { assetId: "a", label: "Alpha", marketValue: 29 },
        { assetId: "b", label: "Beta", marketValue: 27 },
        { assetId: "c", label: "Gamma", marketValue: 24 },
        { assetId: "d", label: "Delta", marketValue: 20 },
      ]),
    ).toEqual({
      top1Label: "Alpha",
      top1Weight: 0.29,
      top3Weight: 0.8,
      status: "diversified",
    });
  });

  it("maps balanced status when top1 is in [30%, 50%)", () => {
    expect(
      computeConcentration([
        { assetId: "big", label: "CW8", marketValue: 40 },
        { assetId: "a", label: "A", marketValue: 30 },
        { assetId: "b", label: "B", marketValue: 30 },
      ]).status,
    ).toBe("balanced");
  });

  it("maps concentrated status when top1 is at least 50%", () => {
    expect(
      computeConcentration([
        { assetId: "big", label: "CW8", marketValue: 60 },
        { assetId: "a", label: "A", marketValue: 40 },
      ]).status,
    ).toBe("concentrated");
  });

  it("aggregates the same asset across accounts before ranking weights", () => {
    expect(
      computeConcentration([
        { assetId: "cw8", label: "CW8", marketValue: 30 },
        { assetId: "cw8", label: "CW8", marketValue: 30 },
        { assetId: "other", label: "Other", marketValue: 40 },
      ]),
    ).toEqual({
      top1Label: "CW8",
      top1Weight: 0.6,
      top3Weight: 1,
      status: "concentrated",
    });
  });

  it("returns null concentration when no position has positive market value", () => {
    expect(computeConcentration([])).toBeNull();
    expect(
      computeConcentration([
        { assetId: "a", label: "A", marketValue: 0 },
        { assetId: "b", label: "B", marketValue: -10 },
      ]),
    ).toBeNull();
  });

  it("treats a single 100% position as concentrated with top3 equal to top1", () => {
    expect(
      computeConcentration([{ assetId: "only", label: "Only", marketValue: 100 }]),
    ).toEqual({
      top1Label: "Only",
      top1Weight: 1,
      top3Weight: 1,
      status: "concentrated",
    });
  });
});

describe("assessRiskMetricStatus", () => {
  it("maps volatility / sharpe / drawdown status bands at the documented thresholds", () => {
    expect(assessRiskMetricStatus("volatility", 0.09)).toBe("low");
    expect(assessRiskMetricStatus("volatility", 0.1)).toBe("moderate");
    expect(assessRiskMetricStatus("volatility", 0.2)).toBe("moderate");
    expect(assessRiskMetricStatus("volatility", 0.21)).toBe("high");

    expect(assessRiskMetricStatus("sharpe", 1)).toBe("strong");
    expect(assessRiskMetricStatus("sharpe", 0.5)).toBe("acceptable");
    expect(assessRiskMetricStatus("sharpe", 0.49)).toBe("weak");

    expect(assessRiskMetricStatus("drawdown", -0.09)).toBe("mild");
    expect(assessRiskMetricStatus("drawdown", -0.1)).toBe("marked");
    expect(assessRiskMetricStatus("drawdown", -0.2)).toBe("marked");
    expect(assessRiskMetricStatus("drawdown", -0.21)).toBe("severe");
  });

  it("returns null risk status when the metric value is null", () => {
    expect(assessRiskMetricStatus("volatility", null)).toBeNull();
    expect(assessRiskMetricStatus("sharpe", null)).toBeNull();
    expect(assessRiskMetricStatus("drawdown", null)).toBeNull();
  });
});
