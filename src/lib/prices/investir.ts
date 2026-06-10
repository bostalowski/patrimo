import type { AssetPriceHistory } from "@/lib/store";

const BASE_URL = "https://investir.lesechos.fr/cours/opcvm";

const BROWSER_HEADERS: HeadersInit = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "accept-language": "fr-FR,fr;q=0.9,en;q=0.8",
  "sec-ch-ua":
    '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
};

const VL_REGEX =
  /Valeur liquidative \((\d{2}\/\d{2})(?:\/\d{2,4})?\)[^>]*>(?:[^<]|<(?!div)[^>]*>)*<div[^>]*>([\d,.\s\u00a0\u202f]+)\s*€/;

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

function toIsoFromFrenchDayMonth(dayMonth: string): string {
  const [day, month] = dayMonth.split("/").map((s) => parseInt(s, 10));
  const now = new Date();
  let year = now.getUTCFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getTime() > now.getTime() + 86_400_000) {
    year -= 1;
  }
  const iso = new Date(Date.UTC(year, month - 1, day))
    .toISOString()
    .slice(0, 10);
  return iso;
}

async function fetchInvestirPage(isin: string): Promise<string> {
  const url = `${BASE_URL}/-${isin.toLowerCase()}`;
  const res = await fetch(url, { headers: BROWSER_HEADERS, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Investir ${isin}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

export async function fetchInvestirSpot(
  isin: string,
): Promise<{ date: string; price: number }> {
  const html = await fetchInvestirPage(isin);
  const match = html.match(VL_REGEX);
  if (!match) {
    throw new Error(`Investir ${isin}: VL not found in page`);
  }
  return {
    date: toIsoFromFrenchDayMonth(match[1]),
    price: parseFrenchNumber(match[2]),
  };
}

export async function fetchInvestirHistory(
  isin: string,
): Promise<AssetPriceHistory> {
  const { date, price } = await fetchInvestirSpot(isin);
  return { [date]: price };
}
