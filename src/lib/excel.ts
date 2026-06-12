import { readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
import {
  Account,
  Asset,
  BudgetLine,
  Transaction,
  type Workbook,
} from "@/lib/schema";

const SHEET_TRANSACTIONS = "Transactions";
const SHEET_ACTIFS = "Actifs";
const SHEET_COMPTES = "Comptes";
const SHEET_BUDGET = "Budget";

const BUDGET_HEADERS = [
  "ID",
  "Libellé",
  "Type",
  "Montant",
  "Fréquence",
  "Catégorie",
  "Notes",
];

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

function readSheetOptional(
  workbook: XLSX.WorkBook,
  sheetName: string,
): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
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

function parseBudget(rows: Record<string, unknown>[]): BudgetLine[] {
  return rows
    .filter((row) => emptyToUndefined(row["ID"]) !== undefined)
    .map((row, i) => {
      const parsed = BudgetLine.safeParse({
        id: row["ID"],
        label: row["Libellé"],
        kind: row["Type"],
        amount: toNumber(row["Montant"]) ?? 0,
        frequency: row["Fréquence"],
        category: row["Catégorie"],
        notes: emptyToUndefined(row["Notes"]),
      });
      if (!parsed.success) {
        throw new Error(
          `Invalid budget line at row ${i + 2}: ${parsed.error.message}`,
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
  const budget = parseBudget(readSheetOptional(sheet, SHEET_BUDGET));

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  const workbook: Workbook = { transactions, assets, accounts, budget };
  cache = { mtime, workbook };
  return workbook;
}

export function getBudget(): BudgetLine[] {
  return loadWorkbook().budget;
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

function upsertRow(
  sheetName: string,
  idHeader: string,
  id: string,
  valueByHeader: Record<string, unknown>,
  defaultHeaders?: string[],
): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  let sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    if (!defaultHeaders) {
      throw new Error(`Missing sheet "${sheetName}" in workbook.`);
    }
    sheet = XLSX.utils.aoa_to_sheet([defaultHeaders]);
    workbook.Sheets[sheetName] = sheet;
    workbook.SheetNames.push(sheetName);
  }

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });
  const headers = (aoa[0] ?? []) as string[];
  if (headers.length === 0) {
    throw new Error(`Sheet "${sheetName}" has no header row.`);
  }
  const idIndex = headers.indexOf(idHeader);
  if (idIndex === -1) {
    throw new Error(`Missing column "${idHeader}" in sheet "${sheetName}".`);
  }

  const row = headers.map((h) =>
    h in valueByHeader ? (valueByHeader[h] ?? null) : null,
  );

  let existingRowIndex = -1;
  for (let i = 1; i < aoa.length; i++) {
    const cell = aoa[i]?.[idIndex];
    if (cell !== null && cell !== undefined && String(cell) === id) {
      existingRowIndex = i;
      break;
    }
  }

  if (existingRowIndex === -1) {
    XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1, cellDates: true });
  } else {
    XLSX.utils.sheet_add_aoa(sheet, [row], {
      origin: { r: existingRowIndex, c: 0 },
      cellDates: true,
    });
  }

  const out = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    cellDates: true,
  }) as Buffer;
  writeFileSync(path, out);

  cache = null;
}

export function upsertAsset(asset: Asset): void {
  upsertRow(SHEET_ACTIFS, "ID", asset.id, {
    ID: asset.id,
    "Libellé": asset.label,
    Type: asset.type,
    ISIN: asset.isin ?? null,
    Ticker: asset.ticker ?? null,
    "Source prix": asset.source,
    "Param source": asset.param ?? null,
    Devise: asset.currency,
  });
}

export function upsertAccount(account: Account): void {
  upsertRow(SHEET_COMPTES, "ID", account.id, {
    ID: account.id,
    "Libellé": account.label,
    Type: account.type,
    Enveloppe: account.envelope,
  });
}

function deleteRow(sheetName: string, idHeader: string, id: string): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });
  const headers = (aoa[0] ?? []) as string[];
  const idIndex = headers.indexOf(idHeader);
  if (idIndex === -1) return;

  const kept = aoa
    .slice(1)
    .filter((row) => String(row?.[idIndex] ?? "") !== id);
  const nextSheet = XLSX.utils.aoa_to_sheet([headers, ...kept], {
    cellDates: true,
  });
  workbook.Sheets[sheetName] = nextSheet;

  const out = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    cellDates: true,
  }) as Buffer;
  writeFileSync(path, out);

  cache = null;
}

export function upsertBudgetLine(line: BudgetLine): void {
  upsertRow(
    SHEET_BUDGET,
    "ID",
    line.id,
    {
      ID: line.id,
      "Libellé": line.label,
      Type: line.kind,
      Montant: line.amount,
      "Fréquence": line.frequency,
      "Catégorie": line.category,
      Notes: line.notes ?? null,
    },
    BUDGET_HEADERS,
  );
}

export function deleteBudgetLine(id: string): void {
  deleteRow(SHEET_BUDGET, "ID", id);
}
