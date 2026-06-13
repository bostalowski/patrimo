import type { RawRow } from "./types";

export type ParsedCsv = {
  headers: string[];
  rows: RawRow[];
};

const DELIMITERS = [";", ",", "\t", "|"];

export function parseCsv(content: string): ParsedCsv {
  const text = content.replace(/^\uFEFF/, "");
  if (text.trim().length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(text);
  const records = parseDelimited(text, delimiter);
  if (records.length === 0) return { headers: [], rows: [] };

  const rawHeaders = (records[0] ?? []).map((value) => value.trim());
  if (rawHeaders.every((h) => h.length === 0)) {
    return { headers: [], rows: [] };
  }
  const headers = dedupeHeaders(rawHeaders);

  const rows: RawRow[] = [];
  for (let i = 1; i < records.length; i++) {
    const cells = records[i] ?? [];
    if (cells.every((cell) => cell.trim().length === 0)) continue;
    const row: RawRow = {};
    for (let j = 0; j < headers.length; j++) {
      const value = cells[j];
      row[headers[j]] = value === undefined ? null : value;
    }
    rows.push(row);
  }

  return { headers, rows };
}

function detectDelimiter(text: string): string {
  const firstLine =
    text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  let best = DELIMITERS[0];
  let bestCount = -1;
  for (const delimiter of DELIMITERS) {
    const count = splitLine(firstLine, delimiter).length;
    if (count > bestCount) {
      bestCount = count;
      best = delimiter;
    }
  }
  return best;
}

function parseDelimited(text: string, delimiter: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let started = false;

  const pushField = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
    started = false;
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    started = true;

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushField();
    } else if (c === "\n") {
      pushRecord();
    } else if (c === "\r") {
      pushRecord();
      if (text[i + 1] === "\n") i++;
    } else {
      field += c;
    }
  }

  if (started || field.length > 0 || record.length > 0) {
    pushField();
    records.push(record);
  }

  return records;
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
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
