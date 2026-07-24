import * as XLSX from "xlsx";
import type { Asset } from "@patrimo/core/schema";
import { deleteAsset } from "@patrimo/core/deletion";
import {
  getActiveSource,
  readSourceFile,
  writeSourceFile,
} from "./file-source";
import { parseWorkbook, serializeWorkbook } from "./excel-mobile";
import { removeAssetsFromPriceCache } from "./price-sync";

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

export async function appendAsset(asset: Asset): Promise<void> {
  const source = await getActiveSource();
  if (!source) throw new Error("No file source configured");

  const buffer = await readSourceFile(source);
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[SHEET_ACTIFS];
  if (!sheet) throw new Error("Actifs sheet not found in workbook");

  const row = assetToRow(asset);
  XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1 });

  const out = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;

  await writeSourceFile(source, out);
}

export async function deleteAssetFromSource(assetId: string): Promise<void> {
  const source = await getActiveSource();
  if (!source) throw new Error("No file source configured");

  const buffer = await readSourceFile(source);
  const { workbook } = parseWorkbook(buffer);
  const result = deleteAsset(workbook, assetId);
  const serialized = serializeWorkbook(buffer, result.workbook);

  await writeSourceFile(source, serialized);
  try {
    await removeAssetsFromPriceCache(result.deletedAssetIds);
  } catch {
    return;
  }
}

/** @deprecated Use appendAsset() instead */
export async function appendAssetToDrive(
  token: string,
  fileId: string,
  asset: Asset,
): Promise<void> {
  const { downloadFile, uploadFile } = await import("./google-drive");
  const buffer = await downloadFile(token, fileId);
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = wb.Sheets[SHEET_ACTIFS];
  if (!sheet) throw new Error("Actifs sheet not found in workbook");

  const row = assetToRow(asset);
  XLSX.utils.sheet_add_aoa(sheet, [row], { origin: -1 });

  const out = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;

  await uploadFile(token, fileId, out);
}
