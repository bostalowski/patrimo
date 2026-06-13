import { z } from "zod";

export const TransactionType = z.enum([
  "ACHAT",
  "VENTE",
  "DIVIDENDE",
  "INTERET",
  "TRANSFERT",
  "DEPOT",
  "RETRAIT",
]);
export type TransactionType = z.infer<typeof TransactionType>;

export const AssetType = z.enum([
  "CRYPTO",
  "ETF",
  "ACTION",
  "FCPE",
  "CASH",
]);
export type AssetType = z.infer<typeof AssetType>;

export const PriceSource = z.enum(["coingecko", "yahoo", "investir", "manual"]);
export type PriceSource = z.infer<typeof PriceSource>;

export const AccountType = z.enum([
  "BROKER",
  "EXCHANGE_CRYPTO",
  "WALLET_CRYPTO",
  "EPARGNE_SALARIALE",
  "BANQUE",
]);
export type AccountType = z.infer<typeof AccountType>;

export const Envelope = z.enum(["CTO", "PEA", "PEE", "AV", "LIVRET"]);
export type Envelope = z.infer<typeof Envelope>;

export const Transaction = z.object({
  date: z.coerce.date(),
  type: TransactionType,
  compte: z.string().min(1),
  compteDestination: z.string().optional(),
  actif: z.string().default(""),
  quantite: z.number().nonnegative(),
  prixUnitaire: z.number().nullable(),
  devise: z.string().default("EUR"),
  frais: z.number().nonnegative().default(0),
  fraisDevise: z.string().default("EUR"),
  notes: z.string().optional(),
});
export type Transaction = z.infer<typeof Transaction>;

export const Asset = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: AssetType,
  isin: z.string().optional(),
  ticker: z.string().optional(),
  source: PriceSource,
  param: z.string().optional(),
  currency: z.string().default("EUR"),
});
export type Asset = z.infer<typeof Asset>;

export const Account = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: AccountType,
  envelope: Envelope,
  openDate: z.coerce.date().optional(),
  rate: z.number().nonnegative().optional(),
  plafond: z.number().positive().optional(),
});
export type Account = z.infer<typeof Account>;

const DcaLineLegacy = z.object({
  assetId: z.string().min(1),
  targetPct: z.number().min(0).max(1),
});

const DcaLineModern = z.object({
  label: z.string().optional(),
  assetIds: z.array(z.string().min(1)).min(1),
  targetPct: z.number().min(0).max(1),
});

export const DcaLine = z
  .union([DcaLineModern, DcaLineLegacy])
  .transform((line) =>
    "assetId" in line
      ? { assetIds: [line.assetId], targetPct: line.targetPct, label: undefined }
      : line,
  );
export type DcaLine = z.infer<typeof DcaLine>;

export const DcaConfig = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  envelope: Envelope,
  monthlyAmount: z.number().nonnegative(),
  lines: z.array(DcaLine).min(1),
});
export type DcaConfig = z.infer<typeof DcaConfig>;

export const BudgetKind = z.enum(["REVENU", "DEPENSE", "EPARGNE"]);
export type BudgetKind = z.infer<typeof BudgetKind>;

export const BudgetFrequency = z.enum(["MENSUEL", "TRIMESTRIEL", "ANNUEL"]);
export type BudgetFrequency = z.infer<typeof BudgetFrequency>;

export const BudgetCategory = z.enum([
  "SALAIRE",
  "PRIME",
  "LOCATIF",
  "AUTRE_REVENU",
  "LOGEMENT",
  "ALIMENTATION",
  "TRANSPORT",
  "ABONNEMENTS",
  "ENERGIE",
  "LOISIRS",
  "SANTE",
  "IMPOTS",
  "AUTRE_DEPENSE",
  "EPARGNE_LIQUIDE",
  "CRYPTO",
  "ACTIONS",
  "AUTRE_EPARGNE",
]);
export type BudgetCategory = z.infer<typeof BudgetCategory>;

export const BudgetLine = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: BudgetKind,
  amount: z.number().positive(),
  frequency: BudgetFrequency,
  category: BudgetCategory,
  notes: z.string().optional(),
});
export type BudgetLine = z.infer<typeof BudgetLine>;

export type Workbook = {
  transactions: Transaction[];
  assets: Asset[];
  accounts: Account[];
  budget: BudgetLine[];
};
