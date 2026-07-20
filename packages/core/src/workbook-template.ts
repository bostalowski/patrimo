export const SHEET_TRANSACTIONS = "Transactions";
export const SHEET_ACTIFS = "Actifs";
export const SHEET_COMPTES = "Comptes";
export const SHEET_BUDGET = "Budget";
export const SHEET_IMMOBILIER = "Immobilier";
export const SHEET_DCA = "DCA";

export const TRANSACTIONS_HEADERS = [
  "Date",
  "Type",
  "Compte",
  "Compte destination",
  "Actif",
  "Quantité",
  "Prix unitaire",
  "Devise",
  "Frais",
  "Frais devise",
  "Notes",
] as const;

export const ACTIFS_HEADERS = [
  "ID",
  "Libellé",
  "Type",
  "ISIN",
  "Ticker",
  "Source prix",
  "Param source",
  "Devise",
  "TER",
] as const;

export const COMPTES_HEADERS = [
  "ID",
  "Libellé",
  "Type",
  "Enveloppe",
  "Date d'ouverture",
  "Taux",
  "Plafond",
] as const;

export const BUDGET_HEADERS = [
  "ID",
  "Libellé",
  "Type",
  "Montant",
  "Fréquence",
  "Catégorie",
  "Notes",
] as const;

export const IMMOBILIER_HEADERS = [
  "ID",
  "Libellé",
  "Détention",
  "Régime",
  "Part détenue",
  "Date acquisition",
  "Prix achat",
  "Frais notaire",
  "Travaux",
  "Valeur actuelle",
  "Revalo annuelle",
  "Montant emprunté",
  "Taux crédit",
  "Durée (mois)",
  "Date début crédit",
  "Taux assurance",
  "Loyer mensuel HC",
  "Charges non récup",
  "Taxe foncière",
  "Vacance",
  "Frais gestion",
  "TMI associé",
  "Part amortissable",
  "Durée amortissement",
  "Notes",
] as const;

export const DCA_HEADERS = [
  "ID",
  "Libellé",
  "Enveloppe",
  "Montant",
  "Fréquence",
  "Mois versement",
  "Panier",
  "Actifs",
  "Cible %",
] as const;

export const ALL_SHEETS = [
  { name: SHEET_TRANSACTIONS, headers: [...TRANSACTIONS_HEADERS] },
  { name: SHEET_ACTIFS, headers: [...ACTIFS_HEADERS] },
  { name: SHEET_COMPTES, headers: [...COMPTES_HEADERS] },
  { name: SHEET_BUDGET, headers: [...BUDGET_HEADERS] },
  { name: SHEET_IMMOBILIER, headers: [...IMMOBILIER_HEADERS] },
  { name: SHEET_DCA, headers: [...DCA_HEADERS] },
] as const;
