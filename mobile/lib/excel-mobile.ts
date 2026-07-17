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

export function parseWorkbook(buffer: ArrayBuffer): Workbook {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });

  return {
    transactions: parseSheet(wb, "Transactions", Transaction),
    assets: parseSheet(wb, "Actifs", Asset),
    accounts: parseSheet(wb, "Comptes", Account),
    budget: parseSheet(wb, "Budget", BudgetLine),
    properties: parseSheet(wb, "Immobilier", Property),
    dca: parseSheet(wb, "DCA", DcaConfig),
  };
}

function parseSheet<T>(
  wb: XLSX.WorkBook,
  sheetName: string,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T } },
): T[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const results: T[] = [];

  for (const row of rows) {
    const parsed = schema.safeParse(row);
    if (parsed.success && parsed.data !== undefined) {
      results.push(parsed.data);
    }
  }

  return results;
}
