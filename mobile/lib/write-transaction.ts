import * as XLSX from "xlsx";
import type { Transaction } from "@patrimo/core/schema";
import { downloadFile, uploadFile } from "./google-drive";

const SHEET_TRANSACTIONS = "Transactions";

const TRANSACTION_HEADERS = [
  "Date",
  "Type",
  "Compte",
  "Compte destination",
  "Actif",
  "Quantité",
  "Prix unitaire",
  "Devise",
  "Frais",
  "Frais devise",
  "Notes",
] as const;

function transactionToRow(tx: Transaction): unknown[] {
  const mapping: Record<string, unknown> = {
    Date: tx.date,
    Type: tx.type,
    Compte: tx.compte,
    "Compte destination": tx.compteDestination ?? null,
    Actif: tx.actif || null,
    "Quantité": tx.quantite,
    "Prix unitaire": tx.prixUnitaire,
    Devise: tx.devise,
    Frais: tx.frais,
    "Frais devise": tx.fraisDevise,
    Notes: tx.notes ?? null,
  };
  return TRANSACTION_HEADERS.map((header) => mapping[header] ?? null);
}

export async function appendTransactionToDrive(
  token: string,
  fileId: string,
  transaction: Transaction,
): Promise<void> {
  const buffer = await downloadFile(token, fileId);

  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[SHEET_TRANSACTIONS];
  if (!sheet) throw new Error("Transactions sheet not found in workbook");

  const row = transactionToRow(transaction);
  XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1, cellDates: true });

  const out = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;

  await uploadFile(token, fileId, out);
}
