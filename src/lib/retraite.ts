import type { DcaConfig, Envelope, Property, RetirementProfile } from "@/lib/schema";
import { Envelope as EnvelopeSchema } from "@/lib/schema";
import type { Portfolio } from "@/lib/portfolio";
import { projectInvestment, SCENARIO_PRESETS, type ScenarioKey } from "@/lib/projection";
import { projectProperty } from "@/lib/realestate/projection";
import { propertySnapshot } from "@/lib/realestate/projection";

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

export type RetirementHorizon = {
  currentAge: number;
  horizonYears: number;
  retirementDate: Date;
};

export function computeRetirementHorizon(
  birthDate: Date,
  targetRetirementAge: number,
  now: Date = new Date(),
): RetirementHorizon {
  const currentAge = (now.getTime() - birthDate.getTime()) / MS_PER_YEAR;
  const horizonYears = Math.max(0, targetRetirementAge - currentAge);
  const retirementDate = new Date(now.getTime() + horizonYears * MS_PER_YEAR);
  return { currentAge, horizonYears, retirementDate };
}

export type EnvelopeProjectedRow = {
  envelope: Envelope;
  nominal: number;
  real: number;
};

export type RetirementScenarioBlock = {
  scenario: ScenarioKey;
  label: string;
  envelopes: EnvelopeProjectedRow[];
  totalFinancialNominal: number;
  totalFinancialReal: number;
  realEstateEquityNominal: number;
  realEstateEquityReal: number;
  totalNominal: number;
  totalReal: number;
};

export type RetirementSourcesResult = {
  scenarios: RetirementScenarioBlock[];
  monthlyRealEstateNet: number;
  horizonYears: number;
};

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

function valueByEnvelope(portfolio: Portfolio): Map<Envelope, number> {
  const map = new Map<Envelope, number>();
  for (const account of portfolio.accounts) {
    const env = account.envelope as Envelope;
    map.set(env, (map.get(env) ?? 0) + account.marketValue);
  }
  return map;
}

function monthlyByEnvelope(configs: DcaConfig[]): Map<Envelope, number> {
  const map = new Map<Envelope, number>();
  for (const config of configs) {
    map.set(
      config.envelope,
      (map.get(config.envelope) ?? 0) + config.monthlyAmount,
    );
  }
  return map;
}

export function buildRetirementSources(params: {
  portfolio: Portfolio;
  dcaConfigs: DcaConfig[];
  properties: Property[];
  horizonYears: number;
  inflationRate: number;
  now?: Date;
}): RetirementSourcesResult {
  const now = params.now ?? new Date();
  const { horizonYears, inflationRate, properties } = params;
  const values = valueByEnvelope(params.portfolio);
  const monthly = monthlyByEnvelope(params.dcaConfigs);

  const envelopes = (EnvelopeSchema.options as readonly Envelope[]).filter(
    (env) => (values.get(env) ?? 0) > 0 || (monthly.get(env) ?? 0) > 0,
  );

  let realEstateEquityNominal = 0;
  let realEstateEquityReal = 0;
  let monthlyRealEstateNet = 0;

  const horizonRounded = Math.max(0, Math.round(horizonYears));

  for (const property of properties) {
    if (property.regime === "RESIDENCE_PRINCIPALE") continue;
    const proj = projectProperty(property, {
      horizonYears,
      inflationRate,
      now,
    });
    realEstateEquityNominal += proj.finalEquity;
    realEstateEquityReal += proj.finalRealEquity;

    if (horizonRounded === 0 || proj.years.length === 0) {
      monthlyRealEstateNet += propertySnapshot(property, now).monthlyCashFlowAfterTax;
    } else {
      const lastYear = proj.years[proj.years.length - 1];
      monthlyRealEstateNet += (lastYear?.cashFlowAfterTax ?? 0) / 12;
    }
  }

  const scenarios: RetirementScenarioBlock[] = SCENARIO_PRESETS.map((preset) => {
    const rows: EnvelopeProjectedRow[] = [];
    let totalFinancialNominal = 0;
    let totalFinancialReal = 0;

    for (const envelope of envelopes) {
      const startBalance = values.get(envelope) ?? 0;
      const monthlyContribution = monthly.get(envelope) ?? 0;
      const result = projectInvestment({
        startBalance,
        monthlyContribution,
        annualRate: preset.rate,
        years: horizonYears,
        inflationRate,
        start: now,
      });
      rows.push({
        envelope,
        nominal: result.finalValue,
        real: result.finalRealValue,
      });
      totalFinancialNominal += result.finalValue;
      totalFinancialReal += result.finalRealValue;
    }

    const totalNominal = totalFinancialNominal + realEstateEquityNominal;
    const totalReal = totalFinancialReal + realEstateEquityReal;

    return {
      scenario: preset.key,
      label: preset.label,
      envelopes: rows,
      totalFinancialNominal,
      totalFinancialReal,
      realEstateEquityNominal,
      realEstateEquityReal,
      totalNominal,
      totalReal,
    };
  });

  return {
    scenarios,
    monthlyRealEstateNet,
    horizonYears,
  };
}

export const PENSION_BRUT_TO_NET_APPROX = 0.82;

const ENVELOPE_FRUIT_TAX: Record<Envelope, number> = {
  LIVRET: 0,
  PEA: 0.172,
  PEE: 0.172,
  AV: 0.172,
  CTO: 0.30,
  PER: 0.30,
};

function weightedTaxRate(envelopes: EnvelopeProjectedRow[]): number {
  let totalCapital = 0;
  let weightedTax = 0;
  for (const row of envelopes) {
    totalCapital += row.nominal;
    weightedTax += row.nominal * ENVELOPE_FRUIT_TAX[row.envelope];
  }
  return totalCapital > 0 ? weightedTax / totalCapital : 0;
}

export type SustainableIncome = {
  scenario: ScenarioKey;
  label: string;
  pensionNet: number;
  nominalReturnRate: number;
  fruitsBrut: number;
  avgTaxRate: number;
  taxOnFruits: number;
  fruitsNet: number;
  realEstateRent: number;
  totalNetMonthly: number;
};

export function computeSustainableIncome(
  profile: RetirementProfile,
  scenario: RetirementScenarioBlock,
  monthlyRealEstateNet: number,
  nominalReturnRate: number,
): SustainableIncome {
  const pensionNet =
    (profile.estimatedPublicPension ?? 0) * PENSION_BRUT_TO_NET_APPROX;
  const fruitsBrut =
    (scenario.totalFinancialNominal * nominalReturnRate) / 12;
  const avgTaxRate = weightedTaxRate(scenario.envelopes);
  const taxOnFruits = fruitsBrut * avgTaxRate;
  const fruitsNet = fruitsBrut - taxOnFruits;
  const totalNetMonthly = pensionNet + fruitsNet + monthlyRealEstateNet;
  return {
    scenario: scenario.scenario,
    label: scenario.label,
    pensionNet,
    nominalReturnRate,
    fruitsBrut,
    avgTaxRate,
    taxOnFruits,
    fruitsNet,
    realEstateRent: monthlyRealEstateNet,
    totalNetMonthly,
  };
}

export type TimelineEntry = {
  label: string;
  date: string;
};

export function buildRetirementTimeline(params: {
  accounts: { envelope: Envelope; openDate?: Date; label: string }[];
  retirementDateIso?: string;
  now?: Date;
}): TimelineEntry[] {
  const now = params.now ?? new Date();
  const items: TimelineEntry[] = [
    { label: "Aujourd'hui", date: now.toISOString() },
  ];

  for (const account of params.accounts) {
    if (account.envelope === "PEA" && account.openDate) {
      const d = addYears(account.openDate, 5);
      items.push({
        label: `PEA mature — ${account.label}`,
        date: d.toISOString(),
      });
    }
    if (account.envelope === "AV" && account.openDate) {
      const d = addYears(account.openDate, 8);
      items.push({
        label: `AV avantage fiscal — ${account.label}`,
        date: d.toISOString(),
      });
    }
  }

  if (params.retirementDateIso) {
    items.push({
      label: "Retraite visée",
      date: params.retirementDateIso,
    });
  }

  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return items;
}
