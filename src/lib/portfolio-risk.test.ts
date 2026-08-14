import { describe, expect, it } from "vitest";
import { assessRiskMetricStatus } from "@patrimo/core/portfolio-risk";

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
