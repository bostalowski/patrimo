import * as XLSX from "xlsx";
import type { Asset } from "@patrimo/core/schema";
import { downloadFile, uploadFile } from "./google-drive";

const SHEET_ACTIFS = "Actifs";

const ASSET_HEADERS = [
  "ID",
  "Libellé",
  "Type",
  "ISIN",
  "Ticker",
  "Source prix",
  "Param source",
  "Devise",
  "TER",
] as const;

function assetToRow(asset: Asset): unknown[] {
  const mapping: Record<string, unknown> = {
    ID: asset.id,
    "Libellé": asset.label,
    Type: asset.type,
    ISIN: asset.isin ?? null,
    Ticker: asset.ticker ?? null,
    "Source prix": asset.source,
    "Param source": asset.param ?? null,
    Devise: asset.currency,
    TER: asset.ter ?? null,
  };
  return ASSET_HEADERS.map((h) => mapping[h] ?? null);
}

export async function appendAssetToDrive(
  token: string,
  fileId: string,
  asset: Asset,
): Promise<void> {
  const buffer = await downloadFile(token, fileId);
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[SHEET_ACTIFS];
  if (!sheet) throw new Error("Actifs sheet not found in workbook");

  const row = assetToRow(asset);
  XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1 });

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true }) as ArrayBuffer;
  await uploadFile(token, fileId, out);
}
