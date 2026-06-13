import {
  Transaction,
  type Account,
  type Asset,
  type Transaction as Tx,
} from "@/lib/schema";
import { parseCsv } from "./csv";
import { applyGenericProfile, type MappedTransactionDraft } from "./generic";
import {
  applyTradeRepublicProfile,
  detectTradeRepublicHeaders,
  type HeaderLookup,
} from "./trade-republic";
import type {
  AccountSuggestion,
  AssetSuggestion,
  ImportPreview,
  Profile,
  RowPreview,
} from "./types";

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}\d$/;

const ASSET_REQUIRED_TYPES = new Set<Tx["type"]>([
  "ACHAT",
  "VENTE",
  "DIVIDENDE",
  "TRANSFERT",
]);

export type ResolveContext = {
  existingAssets: Asset[];
  existingAccounts: Account[];
  existingSignatures: Set<string>;
};

export function buildPreview(
  csvContent: string,
  profile: Profile,
  ctx: ResolveContext,
): ImportPreview {
  const { headers, rows } = parseCsv(csvContent);

  const headerLookup: HeaderLookup | null =
    profile.source === "trade-republic"
      ? detectTradeRepublicHeaders(headers)
      : null;

  const matchers = buildMatchers(ctx);

  const rowsPreview: RowPreview[] = [];
  const sessionSignatures = new Set<string>();
  const assetSuggestions = new Map<string, AssetSuggestion>();
  const accountSuggestions = new Map<string, AccountSuggestion>();

  rows.forEach((row, i) => {
    const rowIndex = i + 1;
    let draft: MappedTransactionDraft;

    if (profile.source === "generic") {
      draft = applyGenericProfile(row, profile);
    } else {
      const tr = applyTradeRepublicProfile(
        row,
        profile.defaultCompte,
        headerLookup ?? new Map(),
      );
      if (tr.kind === "skip") {
        rowsPreview.push({
          rowIndex,
          source: row,
          status: "skipped",
          reason: tr.reason,
        });
        return;
      }
      draft = tr.draft;
    }

    if (!draft.date) {
      rowsPreview.push({
        rowIndex,
        source: row,
        status: "error",
        reason: "Date manquante ou invalide",
      });
      return;
    }
    if (!draft.type) {
      rowsPreview.push({
        rowIndex,
        source: row,
        status: "error",
        reason: "Type de transaction manquant ou non reconnu",
      });
      return;
    }
    if (!draft.actif && ASSET_REQUIRED_TYPES.has(draft.type)) {
      rowsPreview.push({
        rowIndex,
        source: row,
        status: "error",
        reason: "Actif manquant",
      });
      return;
    }
    if (!draft.compte) {
      rowsPreview.push({
        rowIndex,
        source: row,
        status: "error",
        reason: "Compte manquant",
      });
      return;
    }

    const matchedAsset = draft.actif ? matchers.matchAsset(draft.actif) : null;
    const matchedAccount = matchers.matchAccount(draft.compte);
    const matchedDestination = draft.compteDestination
      ? matchers.matchAccount(draft.compteDestination)
      : null;

    if (draft.actif && !matchedAsset) {
      registerAssetSuggestion(assetSuggestions, draft.actif);
    }
    if (!matchedAccount) {
      registerAccountSuggestion(accountSuggestions, draft.compte);
    }
    if (draft.compteDestination && !matchedDestination) {
      registerAccountSuggestion(accountSuggestions, draft.compteDestination);
    }

    const resolvedActif = matchedAsset?.id ?? draft.actif?.trim() ?? "";
    const resolvedCompte = matchedAccount?.id ?? draft.compte.trim();
    const resolvedDest = draft.compteDestination
      ? (matchedDestination?.id ?? draft.compteDestination.trim())
      : undefined;

    const parsed = Transaction.safeParse({
      date: draft.date,
      type: draft.type,
      compte: resolvedCompte,
      compteDestination: resolvedDest,
      actif: resolvedActif,
      quantite: draft.quantite ?? 0,
      prixUnitaire: draft.prixUnitaire,
      devise: draft.devise,
      frais: draft.frais,
      fraisDevise: draft.fraisDevise,
      notes: draft.notes ?? undefined,
    });
    if (!parsed.success) {
      rowsPreview.push({
        rowIndex,
        source: row,
        status: "error",
        reason: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(" · "),
      });
      return;
    }

    const tx = parsed.data;
    if (tx.type === "TRANSFERT" && !tx.compteDestination) {
      rowsPreview.push({
        rowIndex,
        source: row,
        status: "error",
        reason: "Transfert sans compte destination",
      });
      return;
    }

    const signature = signatureOf(tx);
    const isDuplicate =
      ctx.existingSignatures.has(signature) ||
      sessionSignatures.has(signature);
    sessionSignatures.add(signature);

    rowsPreview.push({
      rowIndex,
      source: row,
      status: isDuplicate ? "duplicate" : "ok",
      tx,
      matchedAssetId: matchedAsset?.id,
      matchedAccountId: matchedAccount?.id,
      matchedDestinationAccountId: matchedDestination?.id ?? undefined,
      actifIdentifier: draft.actif ?? undefined,
      compteIdentifier: draft.compte,
      compteDestinationIdentifier: draft.compteDestination ?? undefined,
      signature,
    });
  });

  const okCount = rowsPreview.filter((r) => r.status === "ok").length;
  const duplicateCount = rowsPreview.filter(
    (r) => r.status === "duplicate",
  ).length;
  const errorCount = rowsPreview.filter((r) => r.status === "error").length;
  const skippedCount = rowsPreview.filter((r) => r.status === "skipped").length;

  return {
    headers,
    totalRows: rows.length,
    rows: rowsPreview,
    newAssets: [...assetSuggestions.values()].sort(
      (a, b) => b.occurrenceCount - a.occurrenceCount,
    ),
    newAccounts: [...accountSuggestions.values()].sort(
      (a, b) => b.occurrenceCount - a.occurrenceCount,
    ),
    okCount,
    duplicateCount,
    errorCount,
    skippedCount,
  };
}

function buildMatchers(ctx: ResolveContext) {
  const assetById = new Map(
    ctx.existingAssets.map((a) => [a.id.toLowerCase(), a]),
  );
  const assetByIsin = new Map(
    ctx.existingAssets
      .filter((a): a is Asset & { isin: string } => Boolean(a.isin))
      .map((a) => [a.isin.toLowerCase(), a]),
  );
  const assetByTicker = new Map(
    ctx.existingAssets
      .filter((a): a is Asset & { ticker: string } => Boolean(a.ticker))
      .map((a) => [a.ticker.toLowerCase(), a]),
  );
  const accountById = new Map(
    ctx.existingAccounts.map((a) => [a.id.toLowerCase(), a]),
  );

  const matchAsset = (identifier: string): Asset | null => {
    const key = identifier.trim().toLowerCase();
    return (
      assetById.get(key) ??
      assetByIsin.get(key) ??
      assetByTicker.get(key) ??
      null
    );
  };
  const matchAccount = (identifier: string): Account | null => {
    return accountById.get(identifier.trim().toLowerCase()) ?? null;
  };

  return { matchAsset, matchAccount };
}

function registerAssetSuggestion(
  suggestions: Map<string, AssetSuggestion>,
  identifier: string,
) {
  const trimmed = identifier.trim();
  const key = trimmed.toLowerCase();
  const existing = suggestions.get(key);
  if (existing) {
    existing.occurrenceCount += 1;
    return;
  }
  const looksLikeIsin = ISIN_PATTERN.test(trimmed.toUpperCase());
  suggestions.set(key, {
    identifier: trimmed,
    label: trimmed,
    isin: looksLikeIsin ? trimmed.toUpperCase() : undefined,
    occurrenceCount: 1,
  });
}

function registerAccountSuggestion(
  suggestions: Map<string, AccountSuggestion>,
  identifier: string,
) {
  const trimmed = identifier.trim();
  const key = trimmed.toLowerCase();
  const existing = suggestions.get(key);
  if (existing) {
    existing.occurrenceCount += 1;
    return;
  }
  suggestions.set(key, {
    identifier: trimmed,
    label: trimmed,
    occurrenceCount: 1,
  });
}

export function signatureOf(tx: Tx): string {
  const date = tx.date.toISOString().slice(0, 10);
  const price = tx.prixUnitaire ?? "";
  return [
    date,
    tx.type,
    tx.compte,
    tx.compteDestination ?? "",
    tx.actif,
    tx.quantite,
    price,
    tx.devise,
  ].join("|");
}

export function existingTransactionSignatures(transactions: Tx[]): Set<string> {
  const set = new Set<string>();
  for (const tx of transactions) set.add(signatureOf(tx));
  return set;
}
