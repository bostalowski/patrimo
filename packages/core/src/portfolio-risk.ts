export type RiskMetricKind = "volatility" | "sharpe" | "drawdown";

export type VolatilityStatus = "low" | "moderate" | "high";
export type SharpeStatus = "strong" | "acceptable" | "weak";
export type DrawdownStatus = "mild" | "marked" | "severe";

export type RiskMetricStatus =
  | VolatilityStatus
  | SharpeStatus
  | DrawdownStatus;

const VOL_LOW = 0.1;
const VOL_MODERATE = 0.2;

const SHARPE_STRONG = 1;
const SHARPE_ACCEPTABLE = 0.5;

const DRAWDOWN_MILD = -0.1;
const DRAWDOWN_MARKED = -0.2;

export function assessRiskMetricStatus(
  kind: "volatility",
  value: number | null,
): VolatilityStatus | null;
export function assessRiskMetricStatus(
  kind: "sharpe",
  value: number | null,
): SharpeStatus | null;
export function assessRiskMetricStatus(
  kind: "drawdown",
  value: number | null,
): DrawdownStatus | null;
export function assessRiskMetricStatus(
  kind: RiskMetricKind,
  value: number | null,
): RiskMetricStatus | null {
  if (value === null) return null;

  switch (kind) {
    case "volatility":
      if (value < VOL_LOW) return "low";
      if (value <= VOL_MODERATE) return "moderate";
      return "high";
    case "sharpe":
      if (value >= SHARPE_STRONG) return "strong";
      if (value >= SHARPE_ACCEPTABLE) return "acceptable";
      return "weak";
    case "drawdown":
      if (value > DRAWDOWN_MILD) return "mild";
      if (value >= DRAWDOWN_MARKED) return "marked";
      return "severe";
  }
}
