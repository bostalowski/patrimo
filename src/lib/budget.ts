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
  EPARGNE_LIQUIDE: "Épargne liquide",
  CRYPTO: "Crypto",
  ACTIONS: "Bourse (PEA, ETF...)",
  AUTRE_EPARGNE: "Autre placement",
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

export const EPARGNE_CATEGORIES: BudgetCategory[] = [
  "EPARGNE_LIQUIDE",
  "CRYPTO",
  "ACTIONS",
  "AUTRE_EPARGNE",
];

export function monthlyAmount(line: BudgetLine): number {
  return line.amount * MONTHLY_FACTOR[line.frequency];
}

type CategorieMontant = { category: BudgetCategory; name: string; value: number };

export type BudgetSummary = {
  revenusMensuels: number;
  depensesMensuelles: number;
  epargneMensuelle: number;
  restant: number;
  tauxEpargne: number;
  depensesParCategorie: CategorieMontant[];
  epargneParCategorie: CategorieMontant[];
};

function parCategorie(byCategory: Map<BudgetCategory, number>): CategorieMontant[] {
  return Array.from(byCategory.entries())
    .map(([category, value]) => ({
      category,
      name: CATEGORY_LABELS[category],
      value,
    }))
    .sort((a, b) => b.value - a.value);
}

export function summarizeBudget(lines: BudgetLine[]): BudgetSummary {
  let revenusMensuels = 0;
  let depensesMensuelles = 0;
  let epargneMensuelle = 0;
  const depensesByCategory = new Map<BudgetCategory, number>();
  const epargneByCategory = new Map<BudgetCategory, number>();

  for (const line of lines) {
    const monthly = monthlyAmount(line);
    if (line.kind === "REVENU") {
      revenusMensuels += monthly;
    } else if (line.kind === "EPARGNE") {
      epargneMensuelle += monthly;
      epargneByCategory.set(
        line.category,
        (epargneByCategory.get(line.category) ?? 0) + monthly,
      );
    } else {
      depensesMensuelles += monthly;
      depensesByCategory.set(
        line.category,
        (depensesByCategory.get(line.category) ?? 0) + monthly,
      );
    }
  }

  const restant = revenusMensuels - depensesMensuelles - epargneMensuelle;
  const tauxEpargne =
    revenusMensuels > 0 ? (epargneMensuelle + restant) / revenusMensuels : 0;

  return {
    revenusMensuels,
    depensesMensuelles,
    epargneMensuelle,
    restant,
    tauxEpargne,
    depensesParCategorie: parCategorie(depensesByCategory),
    epargneParCategorie: parCategorie(epargneByCategory),
  };
}
