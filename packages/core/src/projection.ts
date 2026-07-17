import { deflate } from "./inflation";
import type { DcaFrequency, Envelope } from "./schema";

export const DEFAULT_ENVELOPE_PLAFONDS: Partial<Record<Envelope, number>> = {
  LIVRET: 22_950,
  PEA: 150_000,
};

export const DEFAULT_ENVELOPE_RATES: Record<Envelope, number> = {
  CTO: 0.08,
  PEA: 0.07,
  PEE: 0.06,
  AV: 0.04,
  LIVRET: 0.024,
  PER: 0.06,
};

export type ScenarioKey = "prudent" | "modere" | "dynamique";

export type ScenarioPreset = {
  key: ScenarioKey;
  label: string;
  rate: number;
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  { key: "prudent", label: "Prudent", rate: 0.03 },
  { key: "modere", label: "Modéré", rate: 0.05 },
  { key: "dynamique", label: "Dynamique", rate: 0.08 },
];

export type ProjectionPoint = {
  date: string;
  value: number;
  invested: number;
  realValue: number;
};

export type InvestmentProjection = {
  points: ProjectionPoint[];
  finalValue: number;
  finalRealValue: number;
  totalContributed: number;
  gain: number;
  plafondReachedMonth: number | null;
};

function utc(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export type ContributionStream = {
  amount: number;
  frequency: DcaFrequency;
  paymentMonth?: number;
};

function streamContribution(
  stream: ContributionStream,
  monthDate: Date,
  startMonth: Date,
): number {
  if (stream.amount <= 0) return 0;
  if (stream.frequency === "MENSUEL") return stream.amount;

  const calendarMonth = monthDate.getUTCMonth() + 1;
  const anchor = stream.paymentMonth ?? startMonth.getUTCMonth() + 1;

  if (stream.frequency === "ANNUEL") {
    return calendarMonth === anchor ? stream.amount : 0;
  }

  return (((calendarMonth - anchor) % 3) + 3) % 3 === 0 ? stream.amount : 0;
}

export function projectInvestment(params: {
  startBalance: number;
  monthlyContribution?: number;
  contributions?: ContributionStream[];
  annualRate: number;
  years: number;
  start?: Date;
  inflationRate?: number;
  plafond?: number;
}): InvestmentProjection {
  const { startBalance, annualRate, years, plafond } = params;
  const inflationRate = params.inflationRate ?? 0;
  const start = params.start ?? new Date();
  const startMonth = utc(start.getUTCFullYear(), start.getUTCMonth(), 1);
  const monthlyRate = annualRate / 12;
  const streams: ContributionStream[] =
    params.contributions ??
    (params.monthlyContribution
      ? [{ amount: params.monthlyContribution, frequency: "MENSUEL" }]
      : []);

  let value = startBalance;
  let invested = startBalance;
  let plafondReachedMonth: number | null = null;

  const toIso = (date: Date) => date.toISOString().slice(0, 10);
  const points: ProjectionPoint[] = [
    {
      date: toIso(startMonth),
      value,
      invested,
      realValue: deflate(value, 0, inflationRate),
    },
  ];

  const totalMonths = Math.max(0, Math.round(years * 12));
  for (let month = 1; month <= totalMonths; month += 1) {
    const date = utc(
      startMonth.getUTCFullYear(),
      startMonth.getUTCMonth() + month,
      1,
    );
    const room = plafond !== undefined ? Math.max(0, plafond - invested) : Infinity;
    const due = streams.reduce(
      (sum, stream) => sum + streamContribution(stream, date, startMonth),
      0,
    );
    const contribution = Math.max(0, Math.min(due, room));
    if (plafond !== undefined && plafondReachedMonth === null && invested + contribution >= plafond) {
      plafondReachedMonth = month;
    }
    value = value * (1 + monthlyRate) + contribution;
    invested += contribution;
    points.push({
      date: toIso(date),
      value,
      invested,
      realValue: deflate(value, month / 12, inflationRate),
    });
  }

  return {
    points,
    finalValue: value,
    finalRealValue: deflate(value, totalMonths / 12, inflationRate),
    totalContributed: invested,
    gain: value - invested,
    plafondReachedMonth,
  };
}
