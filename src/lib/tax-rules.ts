import type { Envelope } from "@/lib/schema";
import type {
  EnvelopeYearlySummary,
  RealizedEvent,
} from "@/lib/fiscalite";

export const FLAT_TAX_RATE = 0.3;
export const IR_RATE = 0.128;
export const PS_RATE = 0.172;
export const PEA_TAX_FREE_AGE_YEARS = 5;
export const AV_PREFERENTIAL_AGE_YEARS = 8;

export type TaxRegime =
  | "PFU_FULL"
  | "PFU_RETRAIT"
  | "PS_ONLY"
  | "HOLD"
  | "EXEMPT";

export type TaxBucketKey = "CTO" | "CRYPTO" | "PEA" | "PEE" | "AV" | "PER";

export type TaxEstimate = {
  bucket: TaxBucketKey;
  envelope: Envelope;
  label: string;
  regime: TaxRegime;
  base: number;
  ir: number;
  ps: number;
  total: number;
  rateLabel: string;
  notes: string[];
};

export type TaxContext = {
  year: number;
  openDates: Partial<Record<Envelope, Date | undefined>>;
};

const isCrypto = (event: RealizedEvent): boolean => event.assetType === "CRYPTO";

function yearsBetween(from: Date, year: number): number {
  const reference = new Date(Date.UTC(year, 11, 31));
  return (reference.getTime() - from.getTime()) / (365.25 * 24 * 3600 * 1000);
}

function splitCryptoFromCto(events: RealizedEvent[]): {
  cryptoPV: number;
  ctoPV: number;
} {
  let cryptoPV = 0;
  let ctoPV = 0;
  for (const event of events) {
    if (event.kind !== "PV") continue;
    if (isCrypto(event)) cryptoPV += event.gain;
    else ctoPV += event.gain;
  }
  return { cryptoPV, ctoPV };
}

export function estimateCtoTax(
  summary: EnvelopeYearlySummary | undefined,
): TaxEstimate {
  const events = summary?.events ?? [];
  const { ctoPV } = splitCryptoFromCto(events);
  const dividends = summary?.dividends ?? 0;
  const interest = summary?.interest ?? 0;
  const base = ctoPV + dividends + interest;
  return {
    bucket: "CTO",
    envelope: "CTO",
    label: "CTO (titres)",
    regime: base > 0 ? "PFU_FULL" : "EXEMPT",
    base,
    ir: base * IR_RATE,
    ps: base * PS_RATE,
    total: base * FLAT_TAX_RATE,
    rateLabel: "PFU 30 % (12,8 % IR + 17,2 % PS)",
    notes: [
      "Hypothèse : option PFU. L'option pour le barème progressif n'est pas modélisée.",
    ],
  };
}

export function estimateCryptoTax(
  summary: EnvelopeYearlySummary | undefined,
): TaxEstimate {
  const events = summary?.events ?? [];
  const { cryptoPV } = splitCryptoFromCto(events);
  const base = cryptoPV;
  return {
    bucket: "CRYPTO",
    envelope: "CTO",
    label: "Crypto (régime distinct)",
    regime: base > 0 ? "PFU_FULL" : "EXEMPT",
    base,
    ir: base * IR_RATE,
    ps: base * PS_RATE,
    total: base * FLAT_TAX_RATE,
    rateLabel: "PFU 30 % (article 150 VH bis)",
    notes: [
      "Plus-value calculée par rejeu des transactions au PRU. Le formulaire 2086 (base de cession globale) n'est pas modélisé.",
    ],
  };
}

export function estimatePeaTax(
  summary: EnvelopeYearlySummary | undefined,
  context: TaxContext,
): TaxEstimate {
  const withdrawalAmount = summary?.withdrawalAmount ?? 0;
  const withdrawalGain = Math.max(0, summary?.withdrawalGain ?? 0);
  const realized = summary?.realizedPnL ?? 0;
  const income = (summary?.dividends ?? 0) + (summary?.interest ?? 0);

  if (withdrawalAmount === 0) {
    return {
      bucket: "PEA",
      envelope: "PEA",
      label: "PEA",
      regime: "HOLD",
      base: 0,
      ir: 0,
      ps: 0,
      total: 0,
      rateLabel: "Aucun retrait — non imposable cette année",
      notes: [
        `Plus-values internes ${formatSign(realized)} et revenus ${formatSign(income)} non imposables tant qu'il n'y a pas de retrait.`,
      ],
    };
  }

  const openDate = context.openDates.PEA;
  const peaAge = openDate ? yearsBetween(openDate, context.year) : null;
  const notes: string[] = [
    "Estimation prorata du gain inclus dans le retrait (bookedGains / total).",
  ];

  if (peaAge !== null && peaAge >= PEA_TAX_FREE_AGE_YEARS) {
    return {
      bucket: "PEA",
      envelope: "PEA",
      label: "PEA",
      regime: "PS_ONLY",
      base: withdrawalGain,
      ir: 0,
      ps: withdrawalGain * PS_RATE,
      total: withdrawalGain * PS_RATE,
      rateLabel: "PS 17,2 % (PEA ≥ 5 ans, exonéré d'IR)",
      notes,
    };
  }

  if (peaAge === null) {
    notes.push(
      "Date d'ouverture du PEA inconnue : taxation calculée comme < 5 ans par défaut.",
    );
  }

  return {
    bucket: "PEA",
    envelope: "PEA",
    label: "PEA",
    regime: "PFU_RETRAIT",
    base: withdrawalGain,
    ir: withdrawalGain * IR_RATE,
    ps: withdrawalGain * PS_RATE,
    total: withdrawalGain * FLAT_TAX_RATE,
    rateLabel: "PFU 30 % (PEA < 5 ans)",
    notes,
  };
}

export function estimatePeeTax(
  summary: EnvelopeYearlySummary | undefined,
): TaxEstimate {
  const withdrawalAmount = summary?.withdrawalAmount ?? 0;
  const withdrawalGain = Math.max(0, summary?.withdrawalGain ?? 0);

  if (withdrawalAmount === 0) {
    return {
      bucket: "PEE",
      envelope: "PEE",
      label: "PEE / FCPE",
      regime: "HOLD",
      base: 0,
      ir: 0,
      ps: 0,
      total: 0,
      rateLabel: "Aucune sortie — non imposable",
      notes: ["Gains exonérés d'IR. Seules les sorties déclenchent les PS."],
    };
  }

  return {
    bucket: "PEE",
    envelope: "PEE",
    label: "PEE / FCPE",
    regime: "PS_ONLY",
    base: withdrawalGain,
    ir: 0,
    ps: withdrawalGain * PS_RATE,
    total: withdrawalGain * PS_RATE,
    rateLabel: "PS 17,2 % (IR exonéré)",
    notes: ["Estimation prorata du gain inclus dans la sortie."],
  };
}

export function estimateAvTax(
  summary: EnvelopeYearlySummary | undefined,
  context: TaxContext,
): TaxEstimate {
  const withdrawalAmount = summary?.withdrawalAmount ?? 0;
  const withdrawalGain = Math.max(0, summary?.withdrawalGain ?? 0);

  if (withdrawalAmount === 0) {
    return {
      bucket: "AV",
      envelope: "AV",
      label: "Assurance-vie",
      regime: "HOLD",
      base: 0,
      ir: 0,
      ps: 0,
      total: 0,
      rateLabel: "Aucun rachat — non imposable",
      notes: [
        "Gains internes non imposables tant qu'il n'y a pas de rachat.",
      ],
    };
  }

  const openDate = context.openDates.AV;
  const avAge = openDate ? yearsBetween(openDate, context.year) : null;
  const notes: string[] = [
    "Régime simplifié : abattement annuel 4 600 € / 9 200 € non appliqué.",
    "Estimation prorata du gain inclus dans le rachat.",
  ];

  if (avAge !== null && avAge >= AV_PREFERENTIAL_AGE_YEARS) {
    return {
      bucket: "AV",
      envelope: "AV",
      label: "Assurance-vie",
      regime: "PS_ONLY",
      base: withdrawalGain,
      ir: 0,
      ps: withdrawalGain * PS_RATE,
      total: withdrawalGain * PS_RATE,
      rateLabel: "PS 17,2 % (AV ≥ 8 ans, hors abattements)",
      notes,
    };
  }

  if (avAge === null) {
    notes.push(
      "Date d'ouverture de l'AV inconnue : taxation calculée comme < 8 ans par défaut.",
    );
  }

  return {
    bucket: "AV",
    envelope: "AV",
    label: "Assurance-vie",
    regime: "PFU_RETRAIT",
    base: withdrawalGain,
    ir: withdrawalGain * IR_RATE,
    ps: withdrawalGain * PS_RATE,
    total: withdrawalGain * FLAT_TAX_RATE,
    rateLabel: "PFU 30 % (AV < 8 ans)",
    notes,
  };
}

export function estimatePerTax(
  summary: EnvelopeYearlySummary | undefined,
): TaxEstimate {
  const withdrawalAmount = summary?.withdrawalAmount ?? 0;
  if (withdrawalAmount === 0) {
    return {
      bucket: "PER",
      envelope: "PER",
      label: "PER",
      regime: "HOLD",
      base: 0,
      ir: 0,
      ps: 0,
      total: 0,
      rateLabel: "Aucun retrait — non imposable",
      notes: [
        "Le PER est imposé à la sortie (capital : IR sur versements + PFU sur gains ; rente : IR). Non modélisé finement ici.",
      ],
    };
  }
  return {
    bucket: "PER",
    envelope: "PER",
    label: "PER",
    regime: "PFU_FULL",
    base: withdrawalAmount,
    ir: withdrawalAmount * IR_RATE,
    ps: withdrawalAmount * PS_RATE,
    total: withdrawalAmount * FLAT_TAX_RATE,
    rateLabel: "PFU 30 % (simplification — le PER réel dépend du TMI)",
    notes: [
      "Estimation très simplifiée : le régime réel distingue la part « versements déduits » (IR au TMI) de la part « gains » (PFU).",
    ],
  };
}

export function estimateAllTaxes(
  summariesByEnvelope: Map<Envelope, EnvelopeYearlySummary>,
  context: TaxContext,
): TaxEstimate[] {
  return [
    estimateCtoTax(summariesByEnvelope.get("CTO")),
    estimateCryptoTax(summariesByEnvelope.get("CTO")),
    estimatePeaTax(summariesByEnvelope.get("PEA"), context),
    estimatePeeTax(summariesByEnvelope.get("PEE")),
    estimateAvTax(summariesByEnvelope.get("AV"), context),
    estimatePerTax(summariesByEnvelope.get("PER")),
  ];
}

function formatSign(value: number): string {
  if (value === 0) return "(0 €)";
  const formatter = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  });
  return `(${formatter.format(value)})`;
}
