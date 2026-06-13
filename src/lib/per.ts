import { FLAT_TAX_RATE } from "@/lib/tax-rules";

export type PerOutcome = {
  economieImpot: number;
  capitalVerse: number;
  plusValue: number;
  impotSortieCapital: number;
  impotSortiePlusValue: number;
  impotSortieTotal: number;
  valeurNetteSortie: number;
  valeurNetteAvecEconomie: number;
  ctoValeurNette: number;
  avantageNetVsCto: number;
};

export function computePerOutcome(params: {
  encoursActuel: number;
  versementsFuturs: number;
  valeurFinale: number;
  tmiNow: number;
  tmiExit: number;
}): PerOutcome {
  const { encoursActuel, versementsFuturs, valeurFinale, tmiNow, tmiExit } =
    params;

  const economieImpot = versementsFuturs * tmiNow;
  const capitalVerse = encoursActuel + versementsFuturs;
  const plusValue = Math.max(0, valeurFinale - capitalVerse);

  const impotSortieCapital = capitalVerse * tmiExit;
  const impotSortiePlusValue = plusValue * FLAT_TAX_RATE;
  const impotSortieTotal = impotSortieCapital + impotSortiePlusValue;

  const valeurNetteSortie = valeurFinale - impotSortieTotal;
  const valeurNetteAvecEconomie = valeurNetteSortie + economieImpot;

  const ctoValeurNette = valeurFinale - plusValue * FLAT_TAX_RATE;

  return {
    economieImpot,
    capitalVerse,
    plusValue,
    impotSortieCapital,
    impotSortiePlusValue,
    impotSortieTotal,
    valeurNetteSortie,
    valeurNetteAvecEconomie,
    ctoValeurNette,
    avantageNetVsCto: valeurNetteAvecEconomie - ctoValeurNette,
  };
}
