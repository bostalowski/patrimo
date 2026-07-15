import type { AssetPriceHistory } from "@/lib/store";

const BROWSER_HEADERS: HeadersInit = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
};

const DATE_REGEX = /March[eé].*?(\d{2})\/(\d{2})\/(\d{4})/s;
const PRICE_REGEX =
  /class="last\s+txt-bold\s+js-last[^"]*"[^>]*>([\d,.\s\u00a0\u202f]+)<\/span>/;

function parseFrenchNumber(raw: string): number {
  const cleaned = raw
    .replace(/[\s\u00a0\u202f]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot parse French number: "${raw}"`);
  }
  return value;
}

async function fetchZoneboursePage(url: string): Promise<string> {
  const res = await fetch(url, { headers: BROWSER_HEADERS, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Zonebourse: ${res.status} ${res.statusText} for ${url}`);
  }
  return res.text();
}

export async function fetchZonebourseSpot(
  url: string,
): Promise<{ date: string; price: number }> {
  const html = await fetchZoneboursePage(url);

  const dateMatch = html.match(DATE_REGEX);
  if (!dateMatch) {
    throw new Error(`Zonebourse: date not found in page ${url}`);
  }
  const [, day, month, year] = dateMatch;
  const date = `${year}-${month}-${day}`;

  const priceMatch = html.match(PRICE_REGEX);
  if (!priceMatch) {
    throw new Error(`Zonebourse: price not found in page ${url}`);
  }

  return { date, price: parseFrenchNumber(priceMatch[1]) };
}

export async function fetchZonebourseHistory(
  url: string,
): Promise<AssetPriceHistory> {
  const { date, price } = await fetchZonebourseSpot(url);
  return { [date]: price };
}
