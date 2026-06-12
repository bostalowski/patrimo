import * as XLSX from "xlsx";
import type { RawRow } from "./types";

export type ParsedCsv = {
  headers: string[];
  rows: RawRow[];
};

export function parseCsv(content: string): ParsedCsv {
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  if (trimmed.length === 0) return { headers: [], rows: [] };

  const workbook = XLSX.read(content, {
    type: "string",
    raw: false,
    cellDates: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { headers: [], rows: [] };

  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  if (aoa.length === 0) return { headers: [], rows: [] };

  const rawHeaders = (aoa[0] ?? []).map((value) =>
    value === null || value === undefined ? "" : String(value).trim(),
  );
  if (rawHeaders.every((h) => h.length === 0)) {
    return { headers: [], rows: [] };
  }
  const headers = dedupeHeaders(rawHeaders);

  const rows: RawRow[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const cells = aoa[i] ?? [];
    if (
      cells.every((cell) => cell === "" || cell === null || cell === undefined)
    ) {
      continue;
    }
    const row: RawRow = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j];
      const value = cells[j];
      if (value === undefined || value === null) {
        row[key] = null;
      } else if (typeof value === "number") {
        row[key] = value;
      } else {
        row[key] = String(value);
      }
    }
    rows.push(row);
  }

  return { headers, rows };
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header.length === 0 ? `colonne_${index + 1}` : header;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}
