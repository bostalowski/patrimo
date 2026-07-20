import * as XLSX from "xlsx";
import type { DcaConfig } from "@patrimo/core/schema";
import {
  SHEET_DCA,
  DCA_HEADERS,
} from "@patrimo/core/workbook-template";
import {
  getActiveSource,
  readSourceFile,
  writeSourceFile,
} from "./file-source";

function dcaConfigsToRows(
  configs: DcaConfig[],
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const config of configs) {
    for (const line of config.lines) {
      rows.push({
        ID: config.id,
        Libellé: config.label,
        Enveloppe: config.envelope,
        Montant: config.amount,
        Fréquence: config.frequency,
        "Mois versement": config.paymentMonth ?? null,
        Panier: line.label ?? null,
        Actifs: line.assetIds.join(", "),
        "Cible %": Math.round(line.targetPct * 1000) / 10,
      });
    }
  }
  return rows;
}

export async function saveDcaConfigs(configs: DcaConfig[]): Promise<void> {
  const source = await getActiveSource();
  if (!source) throw new Error("No active file source configured");

  const buffer = await readSourceFile(source);
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const headers = [...DCA_HEADERS];
  const rows = dcaConfigsToRows(configs).map((row) =>
    headers.map((header) => row[header] ?? null),
  );
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  workbook.Sheets[SHEET_DCA] = sheet;
  if (!workbook.SheetNames.includes(SHEET_DCA)) {
    workbook.SheetNames.push(SHEET_DCA);
  }

  const output = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  await writeSourceFile(source, output);
}
