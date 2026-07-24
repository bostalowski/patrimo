import * as XLSX from "xlsx";
import {
  Transaction,
  Asset,
  Account,
  BudgetLine,
  Property,
  DcaConfig,
  type Workbook,
} from "@patrimo/core/schema";
import {
  ACTIFS_HEADERS,
  COMPTES_HEADERS,
  DCA_HEADERS,
  SHEET_ACTIFS,
  SHEET_COMPTES,
  SHEET_DCA,
  SHEET_TRANSACTIONS,
  TRANSACTIONS_HEADERS,
} from "@patrimo/core/workbook-template";

export type ParsedWorkbook = {
  workbook: Workbook;
  transactionKeys: string[];
};

export function parseWorkbook(buffer: ArrayBuffer): ParsedWorkbook {
  console.log("[Parser v2] Starting parse...");
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  const rawTransactions = readSheet(wb, "Transactions");
  const rawAssets = readSheet(wb, "Actifs");
  const rawAccounts = readSheet(wb, "Comptes");
  const rawBudget = readSheet(wb, "Budget");
  const rawProperties = readSheet(wb, "Immobilier");
  const rawDca = readSheet(wb, "DCA");

  const { transactions, keys: transactionKeys } = parseTransactions(rawTransactions);
  const assets = parseAssets(rawAssets);
  const accounts = parseAccounts(rawAccounts);
  const budget = parseBudget(rawBudget);
  const properties = parseProperties(rawProperties);
  const dca = parseDca(rawDca);

  console.log("[Parser v2] Results:", { transactions: transactions.length, assets: assets.length, accounts: accounts.length, budget: budget.length, properties: properties.length, dca: dca.length });

  return {
    workbook: { transactions, assets, accounts, budget, properties, dca },
    transactionKeys,
  };
}

function replaceRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
  headers: readonly string[],
  rows: Record<string, unknown>[],
): void {
  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(
    [
      [...headers],
      ...rows.map((row) => headers.map((header) => row[header] ?? null)),
    ],
    { cellDates: true },
  );
  if (!workbook.SheetNames.includes(sheetName)) {
    workbook.SheetNames.push(sheetName);
  }
}

export function serializeWorkbook(
  source: ArrayBuffer,
  workbookData: Workbook,
): ArrayBuffer {
  const workbook = XLSX.read(source, { type: "array", cellDates: true });

  replaceRows(
    workbook,
    SHEET_TRANSACTIONS,
    TRANSACTIONS_HEADERS,
    workbookData.transactions.map((transaction) => ({
      Date: transaction.date,
      Type: transaction.type,
      Compte: transaction.compte,
      "Compte destination": transaction.compteDestination ?? null,
      Actif: transaction.actif || null,
      "Quantité": transaction.quantite,
      "Prix unitaire": transaction.prixUnitaire,
      Devise: transaction.devise,
      Frais: transaction.frais,
      "Frais devise": transaction.fraisDevise,
      Notes: transaction.notes ?? null,
    })),
  );
  replaceRows(
    workbook,
    SHEET_ACTIFS,
    ACTIFS_HEADERS,
    workbookData.assets.map((asset) => ({
      ID: asset.id,
      "Libellé": asset.label,
      Type: asset.type,
      ISIN: asset.isin ?? null,
      Ticker: asset.ticker ?? null,
      "Source prix": asset.source,
      "Param source": asset.param ?? null,
      Devise: asset.currency,
      TER: asset.ter ?? null,
    })),
  );
  replaceRows(
    workbook,
    SHEET_COMPTES,
    COMPTES_HEADERS,
    workbookData.accounts.map((account) => ({
      ID: account.id,
      "Libellé": account.label,
      Type: account.type,
      Enveloppe: account.envelope,
      "Date d'ouverture": account.openDate ?? null,
      Taux: account.rate ?? null,
      Plafond: account.plafond ?? null,
    })),
  );
  replaceRows(
    workbook,
    SHEET_DCA,
    DCA_HEADERS,
    workbookData.dca.flatMap((config) =>
      config.lines.map((line) => ({
        ID: config.id,
        "Libellé": config.label,
        Enveloppe: config.envelope,
        Montant: config.amount,
        "Fréquence": config.frequency,
        "Mois versement": config.paymentMonth ?? null,
        Panier: line.label ?? null,
        Actifs: line.assetIds.join(", "),
        "Cible %": Math.round(line.targetPct * 1000) / 10,
      })),
    ),
  );

  return XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;
}

function readSheet(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });
}

function parseTransactions(rows: Record<string, unknown>[]): { transactions: Transaction[]; keys: string[] } {
  const results: { tx: Transaction; rowKey: string }[] = [];
  let failCount = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const mapped = {
      date: coerceDate(row["Date"]),
      type: trimStr(row["Type"]),
      compte: trimStr(row["Compte"]),
      compteDestination: emptyToUndefined(row["Compte destination"]),
      actif: emptyToUndefined(row["Actif"]) ?? "",
      quantite: toNumber(row["Quantité"]) ?? 0,
      prixUnitaire: toNumber(row["Prix unitaire"]),
      devise: trimStr(row["Devise"]) || "EUR",
      frais: toNumber(row["Frais"]) ?? 0,
      fraisDevise: trimStr(row["Frais devise"]) || "EUR",
      notes: emptyToUndefined(row["Notes"]),
    };
    const parsed = Transaction.safeParse(mapped);
    if (parsed.success) {
      results.push({ tx: parsed.data, rowKey: `row${i + 2}` });
    } else if (failCount < 3) {
      failCount++;
      console.log("[Transactions] FAIL:", JSON.stringify(mapped).slice(0, 200));
      console.log("[Transactions] error:", JSON.stringify(parsed.error).slice(0, 300));
    }
  }
  console.log(`[Transactions] ${results.length} OK / ${rows.length} total`);

  const sorted = results.sort((a, b) => a.tx.date.getTime() - b.tx.date.getTime());
  return {
    transactions: sorted.map((r) => r.tx),
    keys: sorted.map((r) => r.rowKey),
  };
}

function parseAssets(rows: Record<string, unknown>[]): Asset[] {
  const results: Asset[] = [];
  let failCount = 0;
  for (const row of rows) {
    const mapped = {
      id: trimStr(row["ID"]),
      label: trimStr(row["Libellé"]),
      type: trimStr(row["Type"]),
      isin: emptyToUndefined(row["ISIN"]),
      ticker: emptyToUndefined(row["Ticker"]),
      source: emptyToUndefined(row["Source prix"]) ?? "manual",
      param: emptyToUndefined(row["Param source"]),
      currency: trimStr(row["Devise"]) || "EUR",
      ter: toNumber(row["TER"] ?? row["Taux"]) ?? undefined,
    };
    const parsed = Asset.safeParse(mapped);
    if (parsed.success) {
      results.push(parsed.data);
    } else if (failCount < 3) {
      failCount++;
      console.log("[Assets] FAIL:", JSON.stringify(mapped).slice(0, 200));
      console.log("[Assets] error:", JSON.stringify(parsed.error).slice(0, 300));
    }
  }
  console.log(`[Assets] ${results.length} OK / ${rows.length} total`);
  return results;
}

function parseAccounts(rows: Record<string, unknown>[]): Account[] {
  const results: Account[] = [];
  let failCount = 0;
  for (const row of rows) {
    const rawOpenDate = row["Date d'ouverture"];
    const mapped = {
      id: trimStr(row["ID"]),
      label: trimStr(row["Libellé"]),
      type: trimStr(row["Type"]),
      envelope: trimStr(row["Enveloppe"]),
      openDate: optionalDate(rawOpenDate),
      rate: toNumber(row["Taux"]) ?? undefined,
      plafond: toNumber(row["Plafond"]) ?? undefined,
    };
    const parsed = Account.safeParse(mapped);
    if (parsed.success) {
      results.push(parsed.data);
    } else if (failCount < 3) {
      failCount++;
      console.log("[Accounts] FAIL:", JSON.stringify(mapped).slice(0, 200));
      console.log("[Accounts] error:", JSON.stringify(parsed.error).slice(0, 300));
    }
  }
  console.log(`[Accounts] ${results.length} OK / ${rows.length} total`);
  return results;
}

function parseBudget(rows: Record<string, unknown>[]): BudgetLine[] {
  const results: BudgetLine[] = [];
  let failCount = 0;
  for (const row of rows) {
    if (emptyToUndefined(row["ID"]) === undefined) continue;
    const mapped = {
      id: trimStr(row["ID"]),
      label: trimStr(row["Libellé"]),
      kind: trimStr(row["Type"]),
      amount: toNumber(row["Montant"]) ?? 0,
      frequency: trimStr(row["Fréquence"]),
      category: trimStr(row["Catégorie"]),
      notes: emptyToUndefined(row["Notes"]),
    };
    const parsed = BudgetLine.safeParse(mapped);
    if (parsed.success) {
      results.push(parsed.data);
    } else if (failCount < 3) {
      failCount++;
      console.log("[Budget] FAIL:", JSON.stringify(mapped).slice(0, 200));
      console.log("[Budget] error:", JSON.stringify(parsed.error).slice(0, 300));
    }
  }
  console.log(`[Budget] ${results.length} OK / ${rows.length} total`);
  return results;
}

function parseProperties(rows: Record<string, unknown>[]): Property[] {
  const results: Property[] = [];
  let failCount = 0;
  for (const row of rows) {
    if (emptyToUndefined(row["ID"]) === undefined) continue;
    const parsed = Property.safeParse({
      id: trimStr(row["ID"]),
      label: trimStr(row["Libellé"]),
      detention: emptyToUndefined(row["Détention"]) ?? "SCI",
      regime: trimStr(row["Régime"]),
      partDetenue: toNumber(row["Part détenue"]) ?? 1,
      dateAcquisition: optionalDate(row["Date acquisition"]),
      prixAchat: toNumber(row["Prix achat"]) ?? 0,
      fraisNotaire: toNumber(row["Frais notaire"]) ?? 0,
      travaux: toNumber(row["Travaux"]) ?? 0,
      valeurActuelle: toNumber(row["Valeur actuelle"]) ?? 0,
      revaloAnnuelle: toNumber(row["Revalo annuelle"]) ?? 0,
      montantEmprunte: toNumber(row["Montant emprunté"]) ?? 0,
      tauxCredit: toNumber(row["Taux crédit"]) ?? 0,
      dureeMois: toNumber(row["Durée (mois)"]) ?? 0,
      dateDebutCredit: optionalDate(row["Date début crédit"]),
      tauxAssurance: toNumber(row["Taux assurance"]) ?? 0,
      loyerMensuelHC: toNumber(row["Loyer mensuel HC"]) ?? 0,
      chargesNonRecupAnnuelles: toNumber(row["Charges non récup"]) ?? 0,
      taxeFonciere: toNumber(row["Taxe foncière"]) ?? 0,
      vacancePct: toNumber(row["Vacance"]) ?? 0,
      fraisGestionPct: toNumber(row["Frais gestion"]) ?? 0,
      tmiAssocie: toNumber(row["TMI associé"]) ?? 0.3,
      partAmortissable: toNumber(row["Part amortissable"]) ?? 0.85,
      dureeAmortissement: toNumber(row["Durée amortissement"]) ?? 30,
      notes: emptyToUndefined(row["Notes"]),
    });
    if (parsed.success) {
      results.push(parsed.data);
    } else if (failCount < 3) {
      failCount++;
      console.log("[Properties] FAIL:", JSON.stringify(row).slice(0, 200));
      console.log("[Properties] error:", JSON.stringify(parsed.error).slice(0, 300));
    }
  }
  console.log(`[Properties] ${results.length} OK / ${rows.length} total`);
  return results;
}

function parseDca(rows: Record<string, unknown>[]): DcaConfig[] {
  const byId = new Map<string, {
    id: string;
    label: string;
    envelope: string;
    amount: number;
    frequency: string;
    paymentMonth?: number;
    lines: { label?: string; assetIds: string[]; targetPct: number }[];
  }>();
  const order: string[] = [];

  for (const row of rows) {
    const id = emptyToUndefined(row["ID"]);
    if (!id) continue;

    const assetIds = String(row["Actifs"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (assetIds.length === 0) continue;

    const rawCible = toNumber(row["Cible %"]) ?? 0;
    const line = {
      label: emptyToUndefined(row["Panier"]),
      assetIds,
      targetPct: rawCible / 100,
    };

    const existing = byId.get(id);
    if (existing) {
      existing.lines.push(line);
      continue;
    }

    const monthStr = emptyToUndefined(row["Mois versement"]);
    const paymentMonth = monthStr
      ? Math.round(Number(monthStr.replace(",", ".")))
      : undefined;

    byId.set(id, {
      id,
      label: emptyToUndefined(row["Libellé"]) ?? id,
      envelope: row["Enveloppe"] as string,
      amount: toNumber(row["Montant"]) ?? 0,
      frequency: emptyToUndefined(row["Fréquence"])?.toUpperCase() ?? "MENSUEL",
      paymentMonth:
        paymentMonth && paymentMonth >= 1 && paymentMonth <= 12
          ? paymentMonth
          : undefined,
      lines: [line],
    });
    order.push(id);
  }

  const results: DcaConfig[] = [];
  let failCount = 0;
  for (const id of order) {
    const parsed = DcaConfig.safeParse(byId.get(id));
    if (parsed.success) {
      results.push(parsed.data);
    } else if (failCount < 3) {
      failCount++;
      console.log("[DCA] FAIL:", JSON.stringify(byId.get(id)).slice(0, 200));
      console.log("[DCA] error:", JSON.stringify(parsed.error).slice(0, 300));
    }
  }
  console.log(`[DCA] ${results.length} OK / ${order.length} total`);
  return results;
}

function trimStr(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function coerceDate(value: unknown): Date | string {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return new Date(0);
    return value;
  }
  if (typeof value === "number") {
    if (value > 25569 && value < 100000) {
      const msPerDay = 86400000;
      const epoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(epoch.getTime() + value * msPerDay);
    }
    return new Date(value);
  }
  if (typeof value === "string" && value.length > 0) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function optionalDate(value: unknown): Date | string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return coerceDate(value);
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function emptyToUndefined(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  return str.length === 0 ? undefined : str;
}
