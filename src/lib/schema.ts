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

export const Envelope = z.enum(["CTO", "PEA", "PEE", "AV", "LIVRET", "PER"]);
export type Envelope = z.infer<typeof Envelope>;

export function clampRetirementAge(val: unknown): number {
  if (val === undefined || val === null || val === "") return 64;
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n)) return 64;
  return Math.min(75, Math.max(50, Math.round(n)));
}

export const RetirementProfile = z.object({
  birthDate: z.preprocess(
    (val) => (val === null || val === "" ? undefined : val),
    z.coerce.date().optional(),
  ),
  targetRetirementAge: z.preprocess(
    clampRetirementAge,
    z.number().int(),
  ),
  estimatedPublicPension: z.number().nonnegative().optional(),
  withdrawalRate: z.number().min(0).max(0.1).default(0.04).optional(),
});
export type RetirementProfile = z.infer<typeof RetirementProfile>;

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

export const ExpectedReturns = z.object({
  rates: z.record(z.string(), z.number()).default({}),
});
export type ExpectedReturns = z.infer<typeof ExpectedReturns>;

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

export const PropertyRegime = z.enum([
  "IR_REEL",
  "IR_MICRO",
  "LMNP_REEL",
  "LMNP_MICRO",
  "IS",
  "RESIDENCE_PRINCIPALE",
]);
export type PropertyRegime = z.infer<typeof PropertyRegime>;

export const Detention = z.enum(["SCI", "DIRECT"]);
export type Detention = z.infer<typeof Detention>;

export const Property = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  detention: Detention.default("SCI"),
  regime: PropertyRegime,
  partDetenue: z.number().min(0).max(1).default(1),
  dateAcquisition: z.coerce.date().optional(),
  prixAchat: z.number().nonnegative(),
  fraisNotaire: z.number().nonnegative().default(0),
  travaux: z.number().nonnegative().default(0),
  valeurActuelle: z.number().nonnegative(),
  revaloAnnuelle: z.number().default(0),
  montantEmprunte: z.number().nonnegative().default(0),
  tauxCredit: z.number().nonnegative().default(0),
  dureeMois: z.number().int().nonnegative().default(0),
  dateDebutCredit: z.coerce.date().optional(),
  tauxAssurance: z.number().nonnegative().default(0),
  loyerMensuelHC: z.number().nonnegative().default(0),
  chargesNonRecupAnnuelles: z.number().nonnegative().default(0),
  taxeFonciere: z.number().nonnegative().default(0),
  vacancePct: z.number().min(0).max(1).default(0),
  fraisGestionPct: z.number().min(0).max(1).default(0),
  tmiAssocie: z.number().min(0).max(1).default(0.3),
  partAmortissable: z.number().min(0).max(1).default(0.85),
  dureeAmortissement: z.number().positive().default(30),
  notes: z.string().optional(),
});
export type Property = z.infer<typeof Property>;

export type Workbook = {
  transactions: Transaction[];
  assets: Asset[];
  accounts: Account[];
  budget: BudgetLine[];
  properties: Property[];
  dca: DcaConfig[];
};
