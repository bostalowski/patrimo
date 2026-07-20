export const DEFAULT_INFLATION_RATE = 0.02;
export const MAX_INFLATION_RATE = 0.2;

const DAY_MS = 86400000;
const EPSILON = 1e-9;

export function clampInflationRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_INFLATION_RATE;
  return Math.min(MAX_INFLATION_RATE, Math.max(0, rate));
}

export function deflate(nominal: number, years: number, rate: number): number {
  if (rate <= 0 || years <= 0) return nominal;
  return nominal / (1 + rate) ** years;
}

export function inflate(amount: number, years: number, rate: number): number {
  if (rate <= 0 || years <= 0) return amount;
  return amount * (1 + rate) ** years;
}

function yearsBetween(from: string, to: string): number {
  const fromMs = new Date(`${from}T00:00:00Z`).getTime();
  const toMs = new Date(`${to}T00:00:00Z`).getTime();
  return (toMs - fromMs) / (365 * DAY_MS);
}

export type InvestedPoint = { date: string; invested: number };

export function realCostBasis(
  points: InvestedPoint[],
  asOf: string,
  rate: number,
): number {
  if (rate <= 0) {
    return points.length > 0 ? points[points.length - 1].invested : 0;
  }
  let previousInvested = 0;
  let total = 0;
  for (const point of points) {
    const delta = point.invested - previousInvested;
    previousInvested = point.invested;
    if (Math.abs(delta) < EPSILON) continue;
    total += inflate(delta, yearsBetween(point.date, asOf), rate);
  }
  return total;
}
