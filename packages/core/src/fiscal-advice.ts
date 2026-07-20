import type { Envelope } from "./schema";
import {
  AV_PREFERENTIAL_AGE_YEARS,
  FLAT_TAX_RATE,
  PEA_TAX_FREE_AGE_YEARS,
  PS_RATE,
} from "./tax-rules";
import { DEFAULT_ENVELOPE_PLAFONDS } from "./projection";

export type EnvelopeInfo = {
  envelope: Envelope;
  openDate?: Date;
  plafond?: number;
};

export type EnvelopeAdvice = {
  envelope: Envelope;
  label: string;
  taxRateOnGain: number;
  grossGain: number;
  netGain: number;
  netFinalValue: number;
  priority: number;
  tips: string[];
};

export const ENVELOPE_LABELS: Record<Envelope, string> = {
  CTO: "CTO (compte-titres)",
  PEA: "PEA",
  PEE: "PEE / FCPE",
  AV: "Assurance-vie",
  LIVRET: "Livret (A / LDDS)",
  PER: "PER (plan épargne retraite)",
};

const PEA_PLAFOND = DEFAULT_ENVELOPE_PLAFONDS.PEA ?? 150_000;

export const RECOMMENDED_ENVELOPES: Envelope[] = [
  "PEA",
  "AV",
  "PER",
  "LIVRET",
  "CTO",
];

const DEFAULT_PLAFONDS = DEFAULT_ENVELOPE_PLAFONDS;

function applyPlafond(
  info: EnvelopeInfo,
  favorableRate: number,
  investedAmount: number,
  tips: string[],
): number {
  const plafond = info.plafond ?? DEFAULT_PLAFONDS[info.envelope];
  if (!plafond || investedAmount <= plafond) return favorableRate;

  const share = plafond / investedAmount;
  tips.push(
    `Plafond ${plafond.toLocaleString("fr-FR")} € dépassé par les versements (${Math.round(investedAmount).toLocaleString("fr-FR")} €) : seule la part sous plafond garde son avantage, le surplus bascule au PFU 30 %.`,
  );
  return favorableRate * share + FLAT_TAX_RATE * (1 - share);
}

function yearsSince(date: Date | undefined, now: Date): number | null {
  if (!date) return null;
  return (now.getTime() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
}

export function rateForEnvelope(
  info: EnvelopeInfo,
  horizonYears: number,
  now: Date,
): { rate: number; tips: string[] } {
  const age = yearsSince(info.openDate, now);
  const tips: string[] = [];

  switch (info.envelope) {
    case "LIVRET":
      tips.push("Gains exonérés d'impôt et de prélèvements sociaux.");
      tips.push("Idéal pour l'épargne de précaution et les projets à court terme.");
      if (info.plafond) {
        tips.push(`Plafond de versement : ${Math.round(info.plafond)} €.`);
      }
      return { rate: 0, tips };

    case "PEA": {
      const matured =
        (age !== null && age >= PEA_TAX_FREE_AGE_YEARS) ||
        horizonYears >= PEA_TAX_FREE_AGE_YEARS;
      tips.push(`Plafond de versement : ${PEA_PLAFOND.toLocaleString("fr-FR")} €.`);
      if (matured) {
        tips.push(
          `Après ${PEA_TAX_FREE_AGE_YEARS} ans, gains exonérés d'IR : seuls les prélèvements sociaux (${(PS_RATE * 100).toFixed(1)} %) s'appliquent.`,
        );
        tips.push("À privilégier pour les ETF et actions éligibles.");
        return { rate: PS_RATE, tips };
      }
      tips.push(
        `Retrait avant ${PEA_TAX_FREE_AGE_YEARS} ans : imposition au PFU 30 %. Laisser maturer pour bénéficier de l'exonération d'IR.`,
      );
      return { rate: FLAT_TAX_RATE, tips };
    }

    case "AV": {
      const matured =
        (age !== null && age >= AV_PREFERENTIAL_AGE_YEARS) ||
        horizonYears >= AV_PREFERENTIAL_AGE_YEARS;
      if (matured) {
        tips.push(
          `Après ${AV_PREFERENTIAL_AGE_YEARS} ans : fiscalité réduite, plus abattement annuel (4 600 € / 9 200 €) non chiffré ici.`,
        );
        tips.push("Souple pour la transmission et les rachats partiels.");
        return { rate: PS_RATE, tips };
      }
      tips.push(
        `Avant ${AV_PREFERENTIAL_AGE_YEARS} ans : rachat imposé au PFU 30 %. L'intérêt fiscal grandit avec la durée.`,
      );
      return { rate: FLAT_TAX_RATE, tips };
    }

    case "PEE":
      tips.push("Gains exonérés d'IR, seuls les prélèvements sociaux s'appliquent à la sortie.");
      tips.push("Pensez à l'abondement employeur s'il est disponible.");
      return { rate: PS_RATE, tips };

    case "PER":
      tips.push("Versements déductibles du revenu imposable (dans les plafonds).");
      tips.push("Sortie en capital ou rente à la retraite, imposée à l'IR (versements) + PFU (gains).");
      tips.push("Intéressant si TMI élevé aujourd'hui et plus faible à la retraite.");
      return { rate: FLAT_TAX_RATE, tips };

    case "CTO":
    default:
      tips.push("Plus-values et revenus imposés au PFU 30 % (12,8 % IR + 17,2 % PS).");
      tips.push("À utiliser une fois les enveloppes fiscalement avantageuses saturées.");
      return { rate: FLAT_TAX_RATE, tips };
  }
}

export function buildFiscalAdvice(params: {
  envelopes: EnvelopeInfo[];
  grossGain: number;
  totalContributed: number;
  horizonYears: number;
  now?: Date;
}): EnvelopeAdvice[] {
  const { envelopes, grossGain, totalContributed, horizonYears } = params;
  const now = params.now ?? new Date();

  const byEnvelope = new Map<Envelope, EnvelopeInfo>();
  for (const info of envelopes) {
    byEnvelope.set(info.envelope, info);
  }
  for (const envelope of RECOMMENDED_ENVELOPES) {
    if (!byEnvelope.has(envelope)) {
      byEnvelope.set(envelope, { envelope });
    }
  }

  const advices = Array.from(byEnvelope.values()).map((info) => {
    const { rate, tips } = rateForEnvelope(info, horizonYears, now);
    const effectiveRate = applyPlafond(info, rate, totalContributed, tips);
    const netGain = grossGain * (1 - effectiveRate);
    return {
      envelope: info.envelope,
      label: ENVELOPE_LABELS[info.envelope],
      taxRateOnGain: effectiveRate,
      grossGain,
      netGain,
      netFinalValue: totalContributed + netGain,
      priority: 0,
      tips,
    };
  });

  advices.sort((a, b) => b.netGain - a.netGain || a.taxRateOnGain - b.taxRateOnGain);
  advices.forEach((advice, index) => {
    advice.priority = index + 1;
  });

  return advices;
}

export type EnvelopeProjectionInfo = EnvelopeInfo & {
  grossGain: number;
  totalContributed: number;
};

export function buildEnvelopeProjectionAdvice(params: {
  envelopes: EnvelopeProjectionInfo[];
  horizonYears: number;
  now?: Date;
  sort?: boolean;
}): EnvelopeAdvice[] {
  const { envelopes, horizonYears, sort } = params;
  const now = params.now ?? new Date();

  const advices = envelopes.map((info, index) => {
    const { rate, tips } = rateForEnvelope(info, horizonYears, now);
    const effectiveRate = applyPlafond(info, rate, info.totalContributed, tips);
    const netGain = info.grossGain * (1 - effectiveRate);
    return {
      envelope: info.envelope,
      label: ENVELOPE_LABELS[info.envelope],
      taxRateOnGain: effectiveRate,
      grossGain: info.grossGain,
      netGain,
      netFinalValue: info.totalContributed + netGain,
      priority: index + 1,
      tips,
    };
  });

  if (sort) {
    advices.sort(
      (a, b) => b.netGain - a.netGain || a.taxRateOnGain - b.taxRateOnGain,
    );
    advices.forEach((advice, index) => {
      advice.priority = index + 1;
    });
  }

  return advices;
}
