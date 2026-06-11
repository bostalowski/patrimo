import { readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import {
  Account,
  AllocationTarget,
  Asset,
  Transaction,
  type Workbook,
} from "@/lib/schema";

const SHEET_TRANSACTIONS = "Transactions";
const SHEET_ACTIFS = "Actifs";
const SHEET_COMPTES = "Comptes";
const SHEET_ALLOCATION = "Allocation cible";

function getExcelPath(): string {
  const raw = process.env.EXCEL_PATH;
  if (!raw) {
    throw new Error("EXCEL_PATH is not set in your environment (.env.local).");
  }
  const expanded = raw.startsWith("~")
    ? raw.replace(/^~(?=$|\/|\\)/, homedir())
    : raw;
  return resolve(process.cwd(), expanded);
}

function readSheet(
  workbook: XLSX.WorkBook,
  sheetName: string,
): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Missing sheet "${sheetName}" in workbook.`);
  }
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
  });
}

function parseTransactions(rows: Record<string, unknown>[]): Transaction[] {
  return rows.map((row, i) => {
    const parsed = Transaction.safeParse({
      date: coerceDate(row["Date"]),
      type: row["Type"],
      compte: row["Compte"],
      compteDestination: emptyToUndefined(row["Compte destination"]),
      actif: row["Actif"],
      quantite: toNumber(row["Quantité"]) ?? 0,
      prixUnitaire: toNumber(row["Prix unitaire"]),
      devise: (row["Devise"] as string) ?? "EUR",
      frais: toNumber(row["Frais"]) ?? 0,
      fraisDevise: (row["Frais devise"] as string) ?? "EUR",
      notes: emptyToUndefined(row["Notes"]),
    });
    if (!parsed.success) {
      throw new Error(
        `Invalid transaction at row ${i + 2}: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  });
}

function parseAssets(rows: Record<string, unknown>[]): Asset[] {
  return rows.map((row, i) => {
    const parsed = Asset.safeParse({
      id: row["ID"],
      label: row["Libellé"],
      type: row["Type"],
      isin: emptyToUndefined(row["ISIN"]),
      ticker: emptyToUndefined(row["Ticker"]),
      source: row["Source prix"],
      param: emptyToUndefined(row["Param source"]),
      currency: (row["Devise"] as string) ?? "EUR",
    });
    if (!parsed.success) {
      throw new Error(`Invalid asset at row ${i + 2}: ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

function parseAccounts(rows: Record<string, unknown>[]): Account[] {
  return rows.map((row, i) => {
    const parsed = Account.safeParse({
      id: row["ID"],
      label: row["Libellé"],
      type: row["Type"],
      envelope: row["Enveloppe"],
    });
    if (!parsed.success) {
      throw new Error(`Invalid account at row ${i + 2}: ${parsed.error.message}`);
    }
    return parsed.data;
  });
}

function parseAllocation(rows: Record<string, unknown>[]): AllocationTarget[] {
  return rows.map((row, i) => {
    const actifsRaw = (row["Actifs (séparés par virgule)"] as string) ?? "";
    const parsed = AllocationTarget.safeParse({
      categorie: row["Catégorie"],
      pourcentage: toNumber(row["Pourcentage cible"]) ?? 0,
      actifs: actifsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      throw new Error(
        `Invalid allocation target at row ${i + 2}: ${parsed.error.message}`,
      );
    }
    return parsed.data;
  });
}

function coerceDate(value: unknown): Date | string {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) throw new Error(`Cannot parse Excel date: ${value}`);
    return new Date(Date.UTC(date.y, date.m - 1, date.d));
  }
  if (typeof value === "string") return value;
  throw new Error(`Cannot coerce date from value: ${value}`);
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

let cache: { mtime: number; workbook: Workbook } | null = null;

export function loadWorkbook(): Workbook {
  const path = getExcelPath();
  const mtime = statSync(path).mtimeMs;

  if (cache && cache.mtime === mtime && process.env.NODE_ENV === "production") {
    return cache.workbook;
  }

  const fileBuffer = readFileSync(path);
  const sheet = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

  const transactions = parseTransactions(readSheet(sheet, SHEET_TRANSACTIONS));
  const assets = parseAssets(readSheet(sheet, SHEET_ACTIFS));
  const accounts = parseAccounts(readSheet(sheet, SHEET_COMPTES));
  const allocation = parseAllocation(readSheet(sheet, SHEET_ALLOCATION));

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  const workbook: Workbook = { transactions, assets, accounts, allocation };
  cache = { mtime, workbook };
  return workbook;
}

export function getAssetMap(): Map<string, Asset> {
  return new Map(loadWorkbook().assets.map((a) => [a.id, a]));
}

export function getAccountMap(): Map<string, Account> {
  return new Map(loadWorkbook().accounts.map((a) => [a.id, a]));
}

export function appendTransaction(transaction: Transaction): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[SHEET_TRANSACTIONS];
  if (!sheet) {
    throw new Error(`Missing sheet "${SHEET_TRANSACTIONS}" in workbook.`);
  }

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  const headers = (aoa[0] ?? []) as string[];
  if (headers.length === 0) {
    throw new Error(`Sheet "${SHEET_TRANSACTIONS}" has no header row.`);
  }

  const valueByHeader: Record<string, unknown> = {
    Date: transaction.date,
    Type: transaction.type,
    Compte: transaction.compte,
    "Compte destination": transaction.compteDestination ?? null,
    Actif: transaction.actif,
    "Quantité": transaction.quantite,
    "Prix unitaire": transaction.prixUnitaire,
    Devise: transaction.devise,
    Frais: transaction.frais,
    "Frais devise": transaction.fraisDevise,
    Notes: transaction.notes ?? null,
  };

  const row = headers.map((h) => valueByHeader[h] ?? null);
  XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1, cellDates: true });

  const out = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    cellDates: true,
  }) as Buffer;
  writeFileSync(path, out);

  cache = null;
}
