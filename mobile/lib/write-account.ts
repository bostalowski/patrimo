import * as XLSX from "xlsx";
import type { Account } from "@patrimo/core/schema";
import {
  deleteAccount,
  type AccountDeletionMode,
} from "@patrimo/core/deletion";
import {
  getActiveSource,
  readSourceFile,
  writeSourceFile,
} from "./file-source";
import { parseWorkbook, serializeWorkbook } from "./excel-mobile";
import { removeAssetsFromPriceCache } from "./price-sync";

const SHEET_COMPTES = "Comptes";

const ACCOUNT_HEADERS = [
  "ID",
  "Libellé",
  "Type",
  "Enveloppe",
  "Date d'ouverture",
  "Taux",
  "Plafond",
] as const;

function accountToRow(account: Account): unknown[] {
  const mapping: Record<string, unknown> = {
    ID: account.id,
    "Libellé": account.label,
    Type: account.type,
    Enveloppe: account.envelope,
    "Date d'ouverture": account.openDate ?? null,
    Taux: account.rate ?? null,
    Plafond: account.plafond ?? null,
  };
  return ACCOUNT_HEADERS.map((h) => mapping[h] ?? null);
}

export async function appendAccount(account: Account): Promise<void> {
  const source = await getActiveSource();
  if (!source) throw new Error("No file source configured");

  const buffer = await readSourceFile(source);
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[SHEET_COMPTES];
  if (!sheet) throw new Error("Comptes sheet not found in workbook");

  const row = accountToRow(account);
  XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1 });

  const out = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;

  await writeSourceFile(source, out);
}

export async function deleteAccountFromSource(
  accountId: string,
  mode: AccountDeletionMode,
): Promise<void> {
  const source = await getActiveSource();
  if (!source) throw new Error("No file source configured");

  const buffer = await readSourceFile(source);
  const { workbook } = parseWorkbook(buffer);
  const result = deleteAccount(workbook, accountId, mode);
  const serialized = serializeWorkbook(buffer, result.workbook);

  await writeSourceFile(source, serialized);
  try {
    await removeAssetsFromPriceCache(result.deletedAssetIds);
  } catch {
    return;
  }
}

/** @deprecated Use appendAccount() instead */
export async function appendAccountToDrive(
  token: string,
  fileId: string,
  account: Account,
): Promise<void> {
  const { downloadFile, uploadFile } = await import("./google-drive");
  const buffer = await downloadFile(token, fileId);
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[SHEET_COMPTES];
  if (!sheet) throw new Error("Comptes sheet not found in workbook");

  const row = accountToRow(account);
  XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1 });

  const out = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;

  await uploadFile(token, fileId, out);
}
