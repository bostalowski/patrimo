import type { Envelope } from "@/lib/schema";
import {
  AV_PREFERENTIAL_AGE_YEARS,
  FLAT_TAX_RATE,
  PEA_TAX_FREE_AGE_YEARS,
  PS_RATE,
} from "@/lib/tax-rules";

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

const ENVELOPE_LABELS: Record<Envelope, string> = {
  CTO: "CTO (compte-titres)",
  PEA: "PEA",
  PEE: "PEE / FCPE",
  AV: "Assurance-vie",
  LIVRET: "Livret (A / LDDS)",
};

const PEA_PLAFOND = 150_000;

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

  const advices = envelopes.map((info) => {
    const { rate, tips } = rateForEnvelope(info, horizonYears, now);
    const netGain = grossGain * (1 - rate);
    return {
      envelope: info.envelope,
      label: ENVELOPE_LABELS[info.envelope],
      taxRateOnGain: rate,
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
}): EnvelopeAdvice[] {
  const { envelopes, horizonYears } = params;
  const now = params.now ?? new Date();

  return envelopes.map((info, index) => {
    const { rate, tips } = rateForEnvelope(info, horizonYears, now);
    const netGain = info.grossGain * (1 - rate);
    return {
      envelope: info.envelope,
      label: ENVELOPE_LABELS[info.envelope],
      taxRateOnGain: rate,
      grossGain: info.grossGain,
      netGain,
      netFinalValue: info.totalContributed + netGain,
      priority: index + 1,
      tips,
    };
  });
}
