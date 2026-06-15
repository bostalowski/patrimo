import { deflate } from "@/lib/inflation";

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
};

function utc(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

export function projectInvestment(params: {
  startBalance: number;
  monthlyContribution: number;
  annualRate: number;
  years: number;
  start?: Date;
  inflationRate?: number;
}): InvestmentProjection {
  const { startBalance, monthlyContribution, annualRate, years } = params;
  const inflationRate = params.inflationRate ?? 0;
  const start = params.start ?? new Date();
  const startMonth = utc(start.getUTCFullYear(), start.getUTCMonth(), 1);
  const monthlyRate = annualRate / 12;

  let value = startBalance;
  let invested = startBalance;

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
    value = value * (1 + monthlyRate) + monthlyContribution;
    invested += monthlyContribution;
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
  };
}
