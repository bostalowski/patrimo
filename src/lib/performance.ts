import type { DailyPoint } from "@/lib/portfolio-history";

export type CashFlow = { date: string; amount: number };
export type TwrPoint = { date: string; index: number };
export type PeriodReturn = { id: string; label: string; value: number | null };
export type MonthlyReturn = { year: number; month: number; value: number };
export type AnnualReturn = { year: number; value: number };
export type Drawdown = {
  value: number;
  peakDate: string | null;
  troughDate: string | null;
};

const DAY_MS = 86400000;
const EPSILON = 1e-9;

function toUtc(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getTime();
}

function yearFraction(from: string, to: string): number {
  return (toUtc(to) - toUtc(from)) / (365 * DAY_MS);
}

function shiftMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function extractCashFlows(points: DailyPoint[]): CashFlow[] {
  if (points.length === 0) return [];
  const flows: CashFlow[] = [];
  let previousInvested = 0;
  for (const point of points) {
    const delta = point.invested - previousInvested;
    previousInvested = point.invested;
    if (Math.abs(delta) > EPSILON) {
      flows.push({ date: point.date, amount: -delta });
    }
  }
  const last = points[points.length - 1];
  flows.push({ date: last.date, amount: last.value });
  return flows;
}

function netPresentValue(flows: CashFlow[], rate: number, origin: string): number {
  let total = 0;
  for (const flow of flows) {
    const t = yearFraction(origin, flow.date);
    total += flow.amount / (1 + rate) ** t;
  }
  return total;
}

export function xirr(points: DailyPoint[]): number | null {
  const flows = extractCashFlows(points);
  if (flows.length < 2) return null;
  const hasPositive = flows.some((flow) => flow.amount > 0);
  const hasNegative = flows.some((flow) => flow.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  const origin = flows[0].date;

  let rate = 0.1;
  for (let iteration = 0; iteration < 100; iteration++) {
    let value = 0;
    let derivative = 0;
    for (const flow of flows) {
      const t = yearFraction(origin, flow.date);
      const denom = (1 + rate) ** t;
      value += flow.amount / denom;
      derivative += (-t * flow.amount) / (denom * (1 + rate));
    }
    if (Math.abs(value) < 1e-7) return rate;
    if (derivative === 0) break;
    const next = rate - value / derivative;
    if (!Number.isFinite(next) || next <= -0.9999) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next;
  }

  let low = -0.9999;
  let high = 10;
  let valueLow = netPresentValue(flows, low, origin);
  const valueHigh = netPresentValue(flows, high, origin);
  if (valueLow * valueHigh > 0) return null;
  for (let iteration = 0; iteration < 200; iteration++) {
    const mid = (low + high) / 2;
    const valueMid = netPresentValue(flows, mid, origin);
    if (Math.abs(valueMid) < 1e-7) return mid;
    if (valueLow * valueMid < 0) {
      high = mid;
    } else {
      low = mid;
      valueLow = valueMid;
    }
  }
  return (low + high) / 2;
}

export function twrIndex(points: DailyPoint[]): TwrPoint[] {
  const series: TwrPoint[] = [];
  let index = 100;
  let previousValue = 0;
  let previousInvested = 0;
  for (const point of points) {
    const flow = point.invested - previousInvested;
    const base = previousValue + flow;
    if (base > EPSILON) {
      index *= point.value / base;
    }
    series.push({ date: point.date, index });
    previousValue = point.value;
    previousInvested = point.invested;
  }
  return series;
}

function indexAtOrBefore(series: TwrPoint[], target: string): number {
  let base = series[0].index;
  for (const point of series) {
    if (point.date <= target) base = point.index;
    else break;
  }
  return base;
}

const PERIODS: ReadonlyArray<{ id: string; label: string }> = [
  { id: "ytd", label: "YTD" },
  { id: "1m", label: "1 mois" },
  { id: "3m", label: "3 mois" },
  { id: "1y", label: "1 an" },
  { id: "inception", label: "Depuis l'origine" },
];

export function periodReturns(points: DailyPoint[]): PeriodReturn[] {
  const series = twrIndex(points);
  if (series.length === 0) {
    return PERIODS.map((period) => ({ ...period, value: null }));
  }

  const firstDate = series[0].date;
  const last = series[series.length - 1];
  const targets: Record<string, string> = {
    ytd: `${last.date.slice(0, 4)}-01-01`,
    "1m": shiftMonths(last.date, -1),
    "3m": shiftMonths(last.date, -3),
    "1y": shiftMonths(last.date, -12),
    inception: firstDate,
  };

  return PERIODS.map((period) => {
    const target = targets[period.id];
    const requiresFullWindow =
      period.id === "1m" || period.id === "3m" || period.id === "1y";
    if (requiresFullWindow && target < firstDate) {
      return { ...period, value: null };
    }
    const base = indexAtOrBefore(series, target);
    const value = base > 0 ? last.index / base - 1 : null;
    return { ...period, value };
  });
}

function bucketReturns(
  series: TwrPoint[],
  keyOf: (date: string) => string,
): Array<{ key: string; value: number }> {
  if (series.length === 0) return [];
  const result: Array<{ key: string; value: number }> = [];
  let previousClose = series[0].index;
  let currentKey = keyOf(series[0].date);
  let currentClose = series[0].index;

  const flush = () => {
    const value = previousClose > 0 ? currentClose / previousClose - 1 : 0;
    result.push({ key: currentKey, value });
    previousClose = currentClose;
  };

  for (const point of series) {
    const key = keyOf(point.date);
    if (key !== currentKey) {
      flush();
      currentKey = key;
    }
    currentClose = point.index;
  }
  flush();
  return result;
}

export function monthlyReturns(points: DailyPoint[]): MonthlyReturn[] {
  return bucketReturns(twrIndex(points), (date) => date.slice(0, 7)).map(
    ({ key, value }) => {
      const [year, month] = key.split("-");
      return { year: Number(year), month: Number(month), value };
    },
  );
}

export function annualReturns(points: DailyPoint[]): AnnualReturn[] {
  return bucketReturns(twrIndex(points), (date) => date.slice(0, 4)).map(
    ({ key, value }) => ({ year: Number(key), value }),
  );
}

export function annualizedTwr(points: DailyPoint[]): number | null {
  const series = twrIndex(points);
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const years = yearFraction(first.date, last.date);
  if (years <= 0 || first.index <= 0) return null;
  const totalGrowth = last.index / first.index;
  if (totalGrowth <= 0) return null;
  return totalGrowth ** (1 / years) - 1;
}

export function annualizedVolatility(points: DailyPoint[]): number | null {
  const series = twrIndex(points);
  if (series.length < 3) return null;
  const returns: number[] = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1].index;
    if (prev > EPSILON) returns.push(series[i].index / prev - 1);
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(365);
}

export function sharpeRatio(
  points: DailyPoint[],
  riskFreeRate = 0,
): number | null {
  const annualReturn = annualizedTwr(points);
  const volatility = annualizedVolatility(points);
  if (annualReturn === null || volatility === null || volatility < EPSILON) {
    return null;
  }
  return (annualReturn - riskFreeRate) / volatility;
}

export function realReturn(nominalAnnual: number, inflationAnnual: number): number {
  return (1 + nominalAnnual) / (1 + inflationAnnual) - 1;
}

export function maxDrawdown(points: DailyPoint[]): Drawdown {
  const series = twrIndex(points);
  let peak = -Infinity;
  let peakDate: string | null = null;
  let worst = 0;
  let troughDate: string | null = null;
  let worstPeakDate: string | null = null;

  for (const point of series) {
    if (point.index > peak) {
      peak = point.index;
      peakDate = point.date;
    }
    if (peak > 0) {
      const drawdown = point.index / peak - 1;
      if (drawdown < worst) {
        worst = drawdown;
        troughDate = point.date;
        worstPeakDate = peakDate;
      }
    }
  }

  return { value: worst, peakDate: worstPeakDate, troughDate };
}
