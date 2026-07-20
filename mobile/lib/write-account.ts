import * as XLSX from "xlsx";
import type { Account } from "@patrimo/core/schema";
import { downloadFile, uploadFile } from "./google-drive";

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

export async function appendAccountToDrive(
  token: string,
  fileId: string,
  account: Account,
): Promise<void> {
  const buffer = await downloadFile(token, fileId);
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[SHEET_COMPTES];
  if (!sheet) throw new Error("Comptes sheet not found in workbook");

  const row = accountToRow(account);
  XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1 });

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true }) as ArrayBuffer;
  await uploadFile(token, fileId, out);
}
