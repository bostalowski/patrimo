export type ConcentrationStatus = "diversified" | "balanced" | "concentrated";

export type PortfolioConcentration = {
  top1Label: string;
  top1Weight: number;
  top3Weight: number;
  status: ConcentrationStatus;
};

export type RiskMetricKind = "volatility" | "sharpe" | "drawdown";

export type VolatilityStatus = "low" | "moderate" | "high";
export type SharpeStatus = "strong" | "acceptable" | "weak";
export type DrawdownStatus = "mild" | "marked" | "severe";

export type RiskMetricStatus =
  | VolatilityStatus
  | SharpeStatus
  | DrawdownStatus;

const TOP1_DIVERSIFIED = 0.3;
const TOP1_BALANCED = 0.5;

const VOL_LOW = 0.1;
const VOL_MODERATE = 0.2;

const SHARPE_STRONG = 1;
const SHARPE_ACCEPTABLE = 0.5;

const DRAWDOWN_MILD = -0.1;
const DRAWDOWN_MARKED = -0.2;

export function computeConcentration(
  positions: Array<{ assetId: string; label: string; marketValue: number }>,
): PortfolioConcentration | null {
  const totals = new Map<string, { label: string; marketValue: number }>();

  for (const position of positions) {
    if (position.marketValue <= 0) continue;
    const existing = totals.get(position.assetId);
    if (existing) {
      existing.marketValue += position.marketValue;
    } else {
      totals.set(position.assetId, {
        label: position.label,
        marketValue: position.marketValue,
      });
    }
  }

  if (totals.size === 0) return null;

  const totalValue = [...totals.values()].reduce(
    (sum, entry) => sum + entry.marketValue,
    0,
  );
  if (totalValue <= 0) return null;

  const ranked = [...totals.values()]
    .map((entry) => ({
      label: entry.label,
      weight: entry.marketValue / totalValue,
    }))
    .sort((a, b) => b.weight - a.weight);

  const top1Weight = ranked[0].weight;
  const top3Weight = ranked
    .slice(0, 3)
    .reduce((sum, entry) => sum + entry.weight, 0);

  return {
    top1Label: ranked[0].label,
    top1Weight,
    top3Weight,
    status: statusForTop1(top1Weight),
  };
}

function statusForTop1(top1Weight: number): ConcentrationStatus {
  if (top1Weight < TOP1_DIVERSIFIED) return "diversified";
  if (top1Weight < TOP1_BALANCED) return "balanced";
  return "concentrated";
}

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
