export type DetectedHeaders = {
  delimiter: string;
  headers: string[];
};

export function detectHeaders(content: string): DetectedHeaders {
  const stripped = content.replace(/^\uFEFF/, "");
  const firstLine = stripped.split(/\r?\n/).find((line) => line.trim().length > 0);
  if (!firstLine) return { delimiter: ",", headers: [] };

  const delimiters = [";", ",", "\t", "|"];
  const scored = delimiters.map((d) => ({
    d,
    count: splitCsvLine(firstLine, d).length,
  }));
  const best = scored.reduce((a, b) => (b.count > a.count ? b : a));
  const headers = splitCsvLine(firstLine, best.d).map((h) => h.trim());
  return { delimiter: best.d, headers };
}

function splitCsvLine(line: string, delimiter: string): string[] {
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

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function looksLikeIsin(value: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(value.trim().toUpperCase());
}
