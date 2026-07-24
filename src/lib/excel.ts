import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import * as XLSX from "xlsx";
import type { ZodError } from "zod";
import {
  Account,
  Asset,
  BudgetLine,
  type DcaConfig,
  Property,
  Transaction,
  type Workbook,
} from "@/lib/schema";
import { getConfiguredExcelPath, resolveUserPath } from "@/lib/config";
import { dcaConfigsToRows, parseDcaConfigs } from "@/lib/dca-excel";
import {
  SHEET_TRANSACTIONS,
  SHEET_ACTIFS,
  SHEET_COMPTES,
  SHEET_BUDGET,
  SHEET_IMMOBILIER,
  SHEET_DCA,
  BUDGET_HEADERS,
  IMMOBILIER_HEADERS,
  DCA_HEADERS,
  ALL_SHEETS,
} from "@patrimo/core/workbook-template";

const REQUIRED_SHEETS = [SHEET_TRANSACTIONS, SHEET_ACTIFS, SHEET_COMPTES];

export class ExcelNotConfiguredError extends Error {
  constructor() {
    super(
      "Aucun fichier Excel n'est configuré. Va dans Réglages pour en choisir un ou en créer un.",
    );
    this.name = "ExcelNotConfiguredError";
  }
}

function getExcelPath(): string {
  const configured = getConfiguredExcelPath();
  if (!configured) throw new ExcelNotConfiguredError();
  return configured;
}

export function isExcelConfigured(): boolean {
  return getConfiguredExcelPath() !== null;
}

export type ExcelFileStatus =
  | { valid: true }
  | {
      valid: false;
      reason: "not_found" | "missing_sheets" | "read_error" | "parse_error";
      detail?: string;
    };

export function validateExcelFile(path: string): ExcelFileStatus {
  if (!existsSync(path)) return { valid: false, reason: "not_found" };

  let wb: XLSX.WorkBook;
  try {
    const fileBuffer = readFileSync(path);
    wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  } catch (err) {
    return {
      valid: false,
      reason: "read_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const missing = REQUIRED_SHEETS.filter((name) => !wb.Sheets[name]);
  if (missing.length > 0) {
    return {
      valid: false,
      reason: "missing_sheets",
      detail: missing.join(", "),
    };
  }

  try {
    buildWorkbookFromXlsx(wb);
  } catch (err) {
    return {
      valid: false,
      reason: "parse_error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  return { valid: true };
}

export function createEmptyWorkbook(rawPath: string): string {
  const absolute = resolveUserPath(rawPath);
  if (existsSync(absolute)) {
    throw new Error(`Un fichier existe déjà à ${absolute}.`);
  }
  mkdirSync(dirname(absolute), { recursive: true });

  const wb = XLSX.utils.book_new();
  for (const sheet of ALL_SHEETS) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([[...sheet.headers]]),
      sheet.name,
    );
  }

  const out = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
    cellDates: true,
  }) as Buffer;
  writeFileSync(absolute, out);
  return absolute;
}

export function resetWorkbookCache(): void {
  cache = null;
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

export type LoadedTransaction = { transaction: Transaction; row: number };

function aoaRowToObject(
  headers: string[],
  row: unknown[],
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  headers.forEach((header, i) => {
    obj[header] = row[i] ?? null;
  });
  return obj;
}

function readTransactionRowsFromSheet(workbook: XLSX.WorkBook): {
  headers: string[];
  dataRows: unknown[][];
} {
  const sheet = workbook.Sheets[SHEET_TRANSACTIONS];
  if (!sheet) {
    throw new Error(`Missing sheet "${SHEET_TRANSACTIONS}" in workbook.`);
  }
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  const headers = (aoa[0] ?? []) as string[];
  if (headers.length === 0) {
    throw new Error(`Sheet "${SHEET_TRANSACTIONS}" has no header row.`);
  }
  return { headers, dataRows: aoa.slice(1) as unknown[][] };
}

function describeZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const field = issue.path.join(" → ") || "valeur";
      return `champ « ${field} » : ${issue.message}`;
    })
    .join(" ; ");
}

function rowError(sheet: string, rowNumber: number, err: unknown): Error {
  const base = err instanceof Error ? err.message : String(err);
  return new Error(`Onglet « ${sheet} », ligne ${rowNumber} : ${base}`);
}

function parseTransactions(rows: Record<string, unknown>[]): Transaction[] {
  return rows.map((row, i) => {
    try {
      const parsed = Transaction.safeParse({
        date: coerceDate(row["Date"]),
        type: row["Type"],
        compte: row["Compte"],
        compteDestination: emptyToUndefined(row["Compte destination"]),
        actif: emptyToUndefined(row["Actif"]) ?? "",
        quantite: toNumber(row["Quantité"]) ?? 0,
        prixUnitaire: toNumber(row["Prix unitaire"]),
        devise: (row["Devise"] as string) ?? "EUR",
        frais: toNumber(row["Frais"]) ?? 0,
        fraisDevise: (row["Frais devise"] as string) ?? "EUR",
        notes: emptyToUndefined(row["Notes"]),
      });
      if (!parsed.success) throw new Error(describeZodError(parsed.error));
      return parsed.data;
    } catch (err) {
      throw rowError(SHEET_TRANSACTIONS, i + 2, err);
    }
  });
}

function parseAssets(rows: Record<string, unknown>[]): Asset[] {
  return rows.map((row, i) => {
    try {
      const parsed = Asset.safeParse({
        id: row["ID"],
        label: row["Libellé"],
        type: row["Type"],
        isin: emptyToUndefined(row["ISIN"]),
        ticker: emptyToUndefined(row["Ticker"]),
        source: row["Source prix"],
        param: emptyToUndefined(row["Param source"]),
        currency: (row["Devise"] as string) ?? "EUR",
        ter: toNumber(row["TER"]) ?? undefined,
      });
      if (!parsed.success) throw new Error(describeZodError(parsed.error));
      return parsed.data;
    } catch (err) {
      throw rowError(SHEET_ACTIFS, i + 2, err);
    }
  });
}

function parseAccounts(rows: Record<string, unknown>[]): Account[] {
  return rows.map((row, i) => {
    try {
      const rawOpenDate = row["Date d'ouverture"];
      const parsed = Account.safeParse({
        id: row["ID"],
        label: row["Libellé"],
        type: row["Type"],
        envelope: row["Enveloppe"],
        openDate:
          rawOpenDate === null || rawOpenDate === undefined || rawOpenDate === ""
            ? undefined
            : coerceDate(rawOpenDate),
        rate: toNumber(row["Taux"]) ?? undefined,
        plafond: toNumber(row["Plafond"]) ?? undefined,
      });
      if (!parsed.success) throw new Error(describeZodError(parsed.error));
      return parsed.data;
    } catch (err) {
      throw rowError(SHEET_COMPTES, i + 2, err);
    }
  });
}

function parseBudget(rows: Record<string, unknown>[]): BudgetLine[] {
  return rows
    .filter((row) => emptyToUndefined(row["ID"]) !== undefined)
    .map((row, i) => {
      try {
        const parsed = BudgetLine.safeParse({
          id: row["ID"],
          label: row["Libellé"],
          kind: row["Type"],
          amount: toNumber(row["Montant"]) ?? 0,
          frequency: row["Fréquence"],
          category: row["Catégorie"],
          notes: emptyToUndefined(row["Notes"]),
        });
        if (!parsed.success) throw new Error(describeZodError(parsed.error));
        return parsed.data;
      } catch (err) {
        throw rowError(SHEET_BUDGET, i + 2, err);
      }
    });
}

function parseProperties(rows: Record<string, unknown>[]): Property[] {
  return rows
    .filter((row) => emptyToUndefined(row["ID"]) !== undefined)
    .map((row, i) => {
      try {
        const rawAcquisition = row["Date acquisition"];
        const rawDebutCredit = row["Date début crédit"];
        const parsed = Property.safeParse({
          id: row["ID"],
          label: row["Libellé"],
          detention: emptyToUndefined(row["Détention"]) ?? "SCI",
          regime: row["Régime"],
          partDetenue: toNumber(row["Part détenue"]) ?? 1,
          dateAcquisition: optionalDate(rawAcquisition),
          prixAchat: toNumber(row["Prix achat"]) ?? 0,
          fraisNotaire: toNumber(row["Frais notaire"]) ?? 0,
          travaux: toNumber(row["Travaux"]) ?? 0,
          valeurActuelle: toNumber(row["Valeur actuelle"]) ?? 0,
          revaloAnnuelle: toNumber(row["Revalo annuelle"]) ?? 0,
          montantEmprunte: toNumber(row["Montant emprunté"]) ?? 0,
          tauxCredit: toNumber(row["Taux crédit"]) ?? 0,
          dureeMois: toNumber(row["Durée (mois)"]) ?? 0,
          dateDebutCredit: optionalDate(rawDebutCredit),
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
        if (!parsed.success) throw new Error(describeZodError(parsed.error));
        return parsed.data;
      } catch (err) {
        throw rowError(SHEET_IMMOBILIER, i + 2, err);
      }
    });
}

function optionalDate(value: unknown): Date | string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  return coerceDate(value);
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

let cache: {
  mtime: number;
  workbook: Workbook;
  transactionRows: LoadedTransaction[];
} | null = null;

function buildWorkbookFromXlsx(sheet: XLSX.WorkBook): {
  workbook: Workbook;
  transactionRows: LoadedTransaction[];
} {
  const { headers, dataRows } = readTransactionRowsFromSheet(sheet);
  const parsedTransactions = parseTransactions(
    dataRows.map((row) => aoaRowToObject(headers, row)),
  );
  const transactionRows: LoadedTransaction[] = parsedTransactions.map(
    (transaction, row) => ({ transaction, row }),
  );

  const assets = parseAssets(readSheet(sheet, SHEET_ACTIFS));
  const accounts = parseAccounts(readSheet(sheet, SHEET_COMPTES));
  const budget = parseBudget(readSheetOptional(sheet, SHEET_BUDGET));
  const properties = parseProperties(readSheetOptional(sheet, SHEET_IMMOBILIER));
  const dca = parseDcaConfigs(readSheetOptional(sheet, SHEET_DCA));

  const transactions = [...parsedTransactions].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  return {
    workbook: { transactions, assets, accounts, budget, properties, dca },
    transactionRows,
  };
}

export function loadWorkbook(): Workbook {
  const path = getExcelPath();
  const mtime = statSync(path).mtimeMs;

  if (cache && cache.mtime === mtime && process.env.NODE_ENV === "production") {
    return cache.workbook;
  }

  const fileBuffer = readFileSync(path);
  const sheet = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

  const { workbook, transactionRows } = buildWorkbookFromXlsx(sheet);

  cache = { mtime, workbook, transactionRows };
  return workbook;
}

export function loadTransactionRows(): LoadedTransaction[] {
  loadWorkbook();
  return cache?.transactionRows ?? [];
}

export function getBudget(): BudgetLine[] {
  return loadWorkbook().budget;
}

export function getProperties(): Property[] {
  return loadWorkbook().properties;
}

export function getDcaConfigs(): DcaConfig[] {
  if (!isExcelConfigured()) return [];
  return loadWorkbook().dca;
}

export function saveDcaConfigs(configs: DcaConfig[]): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

  const headers = [...DCA_HEADERS];
  const rows = dcaConfigsToRows(configs).map((row) =>
    headers.map((header) => row[header] ?? null),
  );
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  workbook.Sheets[SHEET_DCA] = sheet;
  if (!workbook.SheetNames.includes(SHEET_DCA)) {
    workbook.SheetNames.push(SHEET_DCA);
  }
  writeWorkbook(workbook, path);
}

export function getAssetMap(): Map<string, Asset> {
  return new Map(loadWorkbook().assets.map((a) => [a.id, a]));
}

export function getAccountMap(): Map<string, Account> {
  return new Map(loadWorkbook().accounts.map((a) => [a.id, a]));
}

function transactionValueByHeader(
  transaction: Transaction,
): Record<string, unknown> {
  return {
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
  };
}

export function appendTransaction(transaction: Transaction): void {
  appendTransactions([transaction]);
}

export function appendTransactions(transactions: Transaction[]): void {
  if (transactions.length === 0) return;
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

  const rows = transactions.map((tx) => {
    const valueByHeader = transactionValueByHeader(tx);
    return headers.map((h) => valueByHeader[h] ?? null);
  });

  XLSX.utils.sheet_add_aoa(sheet, rows, { origin: -1, cellDates: true });

  const out = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    cellDates: true,
  }) as Buffer;
  writeFileSync(path, out);

  cache = null;
}

export function updateTransactionAt(row: number, transaction: Transaction): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const { headers, dataRows } = readTransactionRowsFromSheet(workbook);

  if (row < 0 || row >= dataRows.length) {
    throw new Error(`Transaction introuvable (ligne ${row}).`);
  }

  const valueByHeader = transactionValueByHeader(transaction);
  dataRows[row] = headers.map((h) => valueByHeader[h] ?? null);

  const nextSheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows], {
    cellDates: true,
  });
  workbook.Sheets[SHEET_TRANSACTIONS] = nextSheet;
  writeWorkbook(workbook, path);
}

export function deleteTransactionAt(row: number): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const { headers, dataRows } = readTransactionRowsFromSheet(workbook);

  if (row < 0 || row >= dataRows.length) {
    throw new Error(`Transaction introuvable (ligne ${row}).`);
  }

  dataRows.splice(row, 1);

  const nextSheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows], {
    cellDates: true,
  });
  workbook.Sheets[SHEET_TRANSACTIONS] = nextSheet;
  writeWorkbook(workbook, path);
}

type UpsertEntry = {
  id: string;
  valueByHeader: Record<string, unknown>;
};

function upsertRowsInWorkbook(
  workbook: XLSX.WorkBook,
  sheetName: string,
  idHeader: string,
  entries: UpsertEntry[],
  defaultHeaders?: readonly string[],
): void {
  if (entries.length === 0) return;
  let sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    if (!defaultHeaders) {
      throw new Error(`Missing sheet "${sheetName}" in workbook.`);
    }
    sheet = XLSX.utils.aoa_to_sheet([[...defaultHeaders]]);
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

  const missingHeaders: string[] = [];
  for (const { valueByHeader } of entries) {
    for (const key of Object.keys(valueByHeader)) {
      if (!headers.includes(key) && !missingHeaders.includes(key)) {
        missingHeaders.push(key);
      }
    }
  }
  if (missingHeaders.length > 0) {
    headers.push(...missingHeaders);
    XLSX.utils.sheet_add_aoa(sheet, [headers], { origin: "A1" });
  }

  const existingByKey = new Map<string, number>();
  for (let i = 1; i < aoa.length; i++) {
    const cell = aoa[i]?.[idIndex];
    if (cell !== null && cell !== undefined) {
      existingByKey.set(String(cell), i);
    }
  }

  for (const { id, valueByHeader } of entries) {
    const row = headers.map((h) =>
      h in valueByHeader ? (valueByHeader[h] ?? null) : null,
    );
    const existingRowIndex = existingByKey.get(id);
    if (existingRowIndex === undefined) {
      XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1, cellDates: true });
      existingByKey.set(id, aoa.length);
      aoa.push(row);
    } else {
      XLSX.utils.sheet_add_aoa(sheet, [row], {
        origin: { r: existingRowIndex, c: 0 },
        cellDates: true,
      });
    }
  }
}

function writeWorkbook(workbook: XLSX.WorkBook, path: string): void {
  const out = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    cellDates: true,
  }) as Buffer;
  const temporaryPath = `${path}.tmp`;
  try {
    writeFileSync(temporaryPath, out);
    renameSync(temporaryPath, path);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
  cache = null;
}

function upsertRow(
  sheetName: string,
  idHeader: string,
  id: string,
  valueByHeader: Record<string, unknown>,
  defaultHeaders?: readonly string[],
): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  upsertRowsInWorkbook(
    workbook,
    sheetName,
    idHeader,
    [{ id, valueByHeader }],
    defaultHeaders,
  );
  writeWorkbook(workbook, path);
}

function assetEntry(asset: Asset): UpsertEntry {
  return {
    id: asset.id,
    valueByHeader: {
      ID: asset.id,
      "Libellé": asset.label,
      Type: asset.type,
      ISIN: asset.isin ?? null,
      Ticker: asset.ticker ?? null,
      "Source prix": asset.source,
      "Param source": asset.param ?? null,
      Devise: asset.currency,
      TER: asset.ter ?? null,
    },
  };
}

function accountEntry(account: Account): UpsertEntry {
  return {
    id: account.id,
    valueByHeader: {
      ID: account.id,
      "Libellé": account.label,
      Type: account.type,
      Enveloppe: account.envelope,
      "Date d'ouverture": account.openDate ?? null,
      Taux: account.rate ?? null,
      Plafond: account.plafond ?? null,
    },
  };
}

function replaceSheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
  valueByHeaderRows: Record<string, unknown>[],
  defaultHeaders?: readonly string[],
): void {
  const existingSheet = workbook.Sheets[sheetName];
  const existingRows = existingSheet
    ? XLSX.utils.sheet_to_json<unknown[]>(existingSheet, {
        header: 1,
        defval: null,
      })
    : [];
  const headers = ((existingRows[0] as string[] | undefined) ??
    defaultHeaders) as readonly string[] | undefined;

  if (!headers || headers.length === 0) {
    throw new Error(`Sheet "${sheetName}" has no header row.`);
  }

  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(
    [
      [...headers],
      ...valueByHeaderRows.map((row) =>
        headers.map((header) => row[header] ?? null),
      ),
    ],
    { cellDates: true },
  );
  if (!workbook.SheetNames.includes(sheetName)) {
    workbook.SheetNames.push(sheetName);
  }
}

export function replaceWorkbook(nextWorkbook: Workbook): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

  replaceSheetRows(
    workbook,
    SHEET_TRANSACTIONS,
    nextWorkbook.transactions.map(transactionValueByHeader),
  );
  replaceSheetRows(
    workbook,
    SHEET_ACTIFS,
    nextWorkbook.assets.map((asset) => assetEntry(asset).valueByHeader),
  );
  replaceSheetRows(
    workbook,
    SHEET_COMPTES,
    nextWorkbook.accounts.map((account) => accountEntry(account).valueByHeader),
  );
  replaceSheetRows(
    workbook,
    SHEET_DCA,
    dcaConfigsToRows(nextWorkbook.dca),
    DCA_HEADERS,
  );

  writeWorkbook(workbook, path);
}

export function upsertAsset(asset: Asset): void {
  upsertAssets([asset]);
}

export function upsertAssets(assets: Asset[]): void {
  if (assets.length === 0) return;
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  upsertRowsInWorkbook(workbook, SHEET_ACTIFS, "ID", assets.map(assetEntry));
  writeWorkbook(workbook, path);
}

export function upsertAccount(account: Account): void {
  upsertAccounts([account]);
}

export function upsertAccounts(accounts: Account[]): void {
  if (accounts.length === 0) return;
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  upsertRowsInWorkbook(
    workbook,
    SHEET_COMPTES,
    "ID",
    accounts.map(accountEntry),
  );
  writeWorkbook(workbook, path);
}

export function commitImport(payload: {
  newAccounts: Account[];
  newAssets: Asset[];
  transactions: Transaction[];
}): void {
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });

  if (payload.newAccounts.length > 0) {
    upsertRowsInWorkbook(
      workbook,
      SHEET_COMPTES,
      "ID",
      payload.newAccounts.map(accountEntry),
    );
  }
  if (payload.newAssets.length > 0) {
    upsertRowsInWorkbook(
      workbook,
      SHEET_ACTIFS,
      "ID",
      payload.newAssets.map(assetEntry),
    );
  }
  if (payload.transactions.length > 0) {
    const sheet = workbook.Sheets[SHEET_TRANSACTIONS];
    if (!sheet) {
      throw new Error(`Missing sheet "${SHEET_TRANSACTIONS}" in workbook.`);
    }
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    const headers = (aoa[0] ?? []) as string[];
    if (headers.length === 0) {
      throw new Error(`Sheet "${SHEET_TRANSACTIONS}" has no header row.`);
    }
    const rows = payload.transactions.map((tx) => {
      const valueByHeader = transactionValueByHeader(tx);
      return headers.map((h) => valueByHeader[h] ?? null);
    });
    XLSX.utils.sheet_add_aoa(sheet, rows, { origin: -1, cellDates: true });
  }

  writeWorkbook(workbook, path);
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

function propertyEntry(property: Property): UpsertEntry {
  return {
    id: property.id,
    valueByHeader: {
      ID: property.id,
      "Libellé": property.label,
      "Détention": property.detention,
      "Régime": property.regime,
      "Part détenue": property.partDetenue,
      "Date acquisition": property.dateAcquisition ?? null,
      "Prix achat": property.prixAchat,
      "Frais notaire": property.fraisNotaire,
      Travaux: property.travaux,
      "Valeur actuelle": property.valeurActuelle,
      "Revalo annuelle": property.revaloAnnuelle,
      "Montant emprunté": property.montantEmprunte,
      "Taux crédit": property.tauxCredit,
      "Durée (mois)": property.dureeMois,
      "Date début crédit": property.dateDebutCredit ?? null,
      "Taux assurance": property.tauxAssurance,
      "Loyer mensuel HC": property.loyerMensuelHC,
      "Charges non récup": property.chargesNonRecupAnnuelles,
      "Taxe foncière": property.taxeFonciere,
      Vacance: property.vacancePct,
      "Frais gestion": property.fraisGestionPct,
      "TMI associé": property.tmiAssocie,
      "Part amortissable": property.partAmortissable,
      "Durée amortissement": property.dureeAmortissement,
      Notes: property.notes ?? null,
    },
  };
}

export function upsertProperty(property: Property): void {
  upsertProperties([property]);
}

export function upsertProperties(properties: Property[]): void {
  if (properties.length === 0) return;
  const path = getExcelPath();
  const fileBuffer = readFileSync(path);
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  upsertRowsInWorkbook(
    workbook,
    SHEET_IMMOBILIER,
    "ID",
    properties.map(propertyEntry),
    IMMOBILIER_HEADERS,
  );
  writeWorkbook(workbook, path);
}

export function deleteProperty(id: string): void {
  deleteRow(SHEET_IMMOBILIER, "ID", id);
}
