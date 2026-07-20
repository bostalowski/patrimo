import * as XLSX from "xlsx";
import type { BudgetLine } from "@patrimo/core/schema";
import {
  SHEET_BUDGET,
  BUDGET_HEADERS,
} from "@patrimo/core/workbook-template";
import {
  getActiveSource,
  readSourceFile,
  writeSourceFile,
} from "./file-source";

function budgetLinesToRows(
  lines: BudgetLine[],
): Record<string, unknown>[] {
  return lines.map((line) => ({
    ID: line.id,
    Libellé: line.label,
    Type: line.kind,
    Montant: line.amount,
    Fréquence: line.frequency,
    Catégorie: line.category,
    Notes: line.notes ?? null,
  }));
}

export async function saveBudgetLines(lines: BudgetLine[]): Promise<void> {
  const source = await getActiveSource();
  if (!source) throw new Error("No active file source configured");

  const buffer = await readSourceFile(source);
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const headers = [...BUDGET_HEADERS];
  const rows = budgetLinesToRows(lines).map((row) =>
    headers.map((header) => row[header] ?? null),
  );
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  workbook.Sheets[SHEET_BUDGET] = sheet;
  if (!workbook.SheetNames.includes(SHEET_BUDGET)) {
    workbook.SheetNames.push(SHEET_BUDGET);
  }

  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  await writeSourceFile(source, output);
}
