import { z } from "zod";
import { Account, Asset, Transaction, TransactionType } from "@/lib/schema";

export const SOURCE_IDS = ["generic", "trade-republic"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export type RawRow = Record<string, string | number | null>;

export const TX_FIELD_KEYS = [
  "date",
  "type",
  "compte",
  "compteDestination",
  "actif",
  "quantite",
  "montant",
  "prixUnitaire",
  "devise",
  "frais",
  "fraisDevise",
  "notes",
] as const;
export type TxFieldKey = (typeof TX_FIELD_KEYS)[number];

export const TX_FIELD_LABELS: Record<TxFieldKey, string> = {
  date: "Date",
  type: "Type",
  compte: "Compte",
  compteDestination: "Compte destination",
  actif: "Actif (ID, ISIN ou ticker)",
  quantite: "Quantité",
  montant: "Montant (signé)",
  prixUnitaire: "Prix unitaire",
  devise: "Devise",
  frais: "Frais",
  fraisDevise: "Devise des frais",
  notes: "Notes",
};

export const REQUIRED_FIELDS: TxFieldKey[] = ["date"];

export const ColumnMapping = z.object({
  date: z.string().optional(),
  type: z.string().optional(),
  compte: z.string().optional(),
  compteDestination: z.string().optional(),
  actif: z.string().optional(),
  quantite: z.string().optional(),
  montant: z.string().optional(),
  prixUnitaire: z.string().optional(),
  devise: z.string().optional(),
  frais: z.string().optional(),
  fraisDevise: z.string().optional(),
  notes: z.string().optional(),
});
export type ColumnMapping = z.infer<typeof ColumnMapping>;

export const AmountSignTypes = z.object({
  positive: TransactionType,
  negative: TransactionType,
});
export type AmountSignTypes = z.infer<typeof AmountSignTypes>;

export const DEFAULT_AMOUNT_SIGN_TYPES: AmountSignTypes = {
  positive: "DEPOT",
  negative: "RETRAIT",
};

export const ProfileDefaults = z.object({
  compte: z.string().optional(),
  devise: z.string().default("EUR"),
  fraisDevise: z.string().default("EUR"),
  type: TransactionType.optional(),
});
export type ProfileDefaults = z.infer<typeof ProfileDefaults>;

export const TypeValueMap = z.record(z.string(), TransactionType);
export type TypeValueMap = z.infer<typeof TypeValueMap>;

export const GenericProfile = z.object({
  source: z.literal("generic"),
  mapping: ColumnMapping,
  defaults: ProfileDefaults,
  typeValueMap: TypeValueMap.optional(),
  amountSignTypes: AmountSignTypes.default(DEFAULT_AMOUNT_SIGN_TYPES),
});
export type GenericProfile = z.infer<typeof GenericProfile>;

export const TradeRepublicProfile = z.object({
  source: z.literal("trade-republic"),
  defaultCompte: z.string().min(1),
});
export type TradeRepublicProfile = z.infer<typeof TradeRepublicProfile>;

export const Profile = z.discriminatedUnion("source", [
  GenericProfile,
  TradeRepublicProfile,
]);
export type Profile = z.infer<typeof Profile>;

export type AssetSuggestion = {
  identifier: string;
  label: string;
  isin?: string;
  ticker?: string;
  occurrenceCount: number;
};

export type AccountSuggestion = {
  identifier: string;
  label: string;
  occurrenceCount: number;
};

export type RowStatus = "ok" | "duplicate" | "error" | "skipped";

export type RowPreview = {
  rowIndex: number;
  source: RawRow;
  status: RowStatus;
  reason?: string;
  tx?: Transaction;
  matchedAssetId?: string;
  matchedAccountId?: string;
  matchedDestinationAccountId?: string;
  actifIdentifier?: string;
  compteIdentifier?: string;
  compteDestinationIdentifier?: string;
  signature?: string;
};

export type ImportPreview = {
  headers: string[];
  totalRows: number;
  rows: RowPreview[];
  newAssets: AssetSuggestion[];
  newAccounts: AccountSuggestion[];
  okCount: number;
  duplicateCount: number;
  errorCount: number;
  skippedCount: number;
};

export const PreviewRequest = z.object({
  action: z.literal("preview"),
  csv: z.string(),
  profile: Profile,
});
export type PreviewRequest = z.infer<typeof PreviewRequest>;

export const CommitRequest = z.object({
  action: z.literal("commit"),
  transactions: z.array(Transaction).min(1),
  newAssets: z.array(Asset).default([]),
  newAccounts: z.array(Account).default([]),
});
export type CommitRequest = z.infer<typeof CommitRequest>;

export const ImportRequest = z.discriminatedUnion("action", [
  PreviewRequest,
  CommitRequest,
]);
export type ImportRequest = z.infer<typeof ImportRequest>;
