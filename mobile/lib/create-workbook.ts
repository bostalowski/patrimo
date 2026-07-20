import * as XLSX from "xlsx";
import { ALL_SHEETS } from "@patrimo/core/workbook-template";
import { uploadNewFile } from "./google-drive";
import { createLocalFile, saveLocalFile, writeLocalFile } from "./local-file";

function buildBlankWorkbook(): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of ALL_SHEETS) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([sheet.headers]),
      sheet.name,
    );
  }
  return XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    cellDates: true,
  }) as ArrayBuffer;
}

export async function createBlankWorkbookOnDrive(
  token: string,
  fileName: string,
): Promise<string> {
  const buffer = buildBlankWorkbook();
  const fileId = await uploadNewFile(token, fileName, buffer);
  return fileId;
}

export async function createBlankWorkbookLocally(
  fileName: string,
): Promise<{ uri: string; name: string }> {
  const buffer = buildBlankWorkbook();
  const uri = await createLocalFile(fileName);
  await writeLocalFile(uri, buffer);
  await saveLocalFile(uri, fileName);
  return { uri, name: fileName };
}
