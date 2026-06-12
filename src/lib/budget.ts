import type {
  BudgetCategory,
  BudgetFrequency,
  BudgetLine,
} from "@/lib/schema";

const MONTHLY_FACTOR: Record<BudgetFrequency, number> = {
  MENSUEL: 1,
  TRIMESTRIEL: 1 / 3,
  ANNUEL: 1 / 12,
};

export const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  SALAIRE: "Salaire",
  PRIME: "Prime",
  LOCATIF: "Revenus locatifs",
  AUTRE_REVENU: "Autre revenu",
  LOGEMENT: "Logement",
  ALIMENTATION: "Alimentation",
  TRANSPORT: "Transport",
  ABONNEMENTS: "Abonnements",
  ENERGIE: "Énergie",
  LOISIRS: "Loisirs",
  SANTE: "Santé",
  IMPOTS: "Impôts",
  AUTRE_DEPENSE: "Autre dépense",
};

export const FREQUENCY_LABELS: Record<BudgetFrequency, string> = {
  MENSUEL: "Mensuel",
  TRIMESTRIEL: "Trimestriel",
  ANNUEL: "Annuel",
};

export const REVENU_CATEGORIES: BudgetCategory[] = [
  "SALAIRE",
  "PRIME",
  "LOCATIF",
  "AUTRE_REVENU",
];

export const DEPENSE_CATEGORIES: BudgetCategory[] = [
  "LOGEMENT",
  "ALIMENTATION",
  "TRANSPORT",
  "ABONNEMENTS",
  "ENERGIE",
  "LOISIRS",
  "SANTE",
  "IMPOTS",
  "AUTRE_DEPENSE",
];

export function monthlyAmount(line: BudgetLine): number {
  return line.amount * MONTHLY_FACTOR[line.frequency];
}

export type BudgetSummary = {
  revenusMensuels: number;
  depensesMensuelles: number;
  capaciteEpargne: number;
  tauxEpargne: number;
  depensesParCategorie: { category: BudgetCategory; name: string; value: number }[];
};

export function summarizeBudget(lines: BudgetLine[]): BudgetSummary {
  let revenusMensuels = 0;
  let depensesMensuelles = 0;
  const byCategory = new Map<BudgetCategory, number>();

  for (const line of lines) {
    const monthly = monthlyAmount(line);
    if (line.kind === "REVENU") {
      revenusMensuels += monthly;
    } else {
      depensesMensuelles += monthly;
      byCategory.set(line.category, (byCategory.get(line.category) ?? 0) + monthly);
    }
  }

  const capaciteEpargne = revenusMensuels - depensesMensuelles;
  const tauxEpargne = revenusMensuels > 0 ? capaciteEpargne / revenusMensuels : 0;

  const depensesParCategorie = Array.from(byCategory.entries())
    .map(([category, value]) => ({
      category,
      name: CATEGORY_LABELS[category],
      value,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    revenusMensuels,
    depensesMensuelles,
    capaciteEpargne,
    tauxEpargne,
    depensesParCategorie,
  };
}
