import {
  applyFetchedGeographicAllocation,
  allocationSourceForAsset,
} from "./geographic-allocation";
import { lookThroughCountryWeights } from "./geographic-exposure";
import type { Workbook } from "./schema";

export type JustEtfCountryWeight = {
  country: string;
  weight: number;
};

const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  "États-Unis": "US",
  "Etats-Unis": "US",
  "United States": "US",
  Japon: "JP",
  Japan: "JP",
  "Grande-Bretagne": "GB",
  "Royaume-Uni": "GB",
  "United Kingdom": "GB",
  Canada: "CA",
  France: "FR",
  Allemagne: "DE",
  Germany: "DE",
  Suisse: "CH",
  Switzerland: "CH",
  "Pays-Bas": "NL",
  Netherlands: "NL",
  Italie: "IT",
  Italy: "IT",
  Espagne: "ES",
  Spain: "ES",
  Australie: "AU",
  Australia: "AU",
  Chine: "CN",
  China: "CN",
  Inde: "IN",
  India: "IN",
  Brésil: "BR",
  Brazil: "BR",
  "Corée du Sud": "KR",
  "Hong Kong": "HK",
  Taïwan: "TW",
  Taiwan: "TW",
  Singapour: "SG",
  Autre: "OTHER",
  Other: "OTHER",
  Sonstige: "OTHER",
};

const SIMPLE_ROW_REGEX =
  /<t[dh][^>]*>\s*([^<]+?)\s*<\/t[dh]>\s*<t[dh][^>]*>\s*([\d\s\u00a0\u202f]+(?:[.,]\d+)?)\s*%\s*<\/t[dh]>/gi;

const JUSTETF_COUNTRY_ROW_REGEX =
  /data-testid="etf-holdings_countries_row"[^>]*>[\s\S]*?data-testid="tl_etf-holdings_countries_value_name"[^>]*>([^<]+)<[\s\S]*?data-testid="tl_etf-holdings_countries_value_percentage"[^>]*>\s*([\d\s\u00a0\u202f]+(?:[.,]\d+)?)\s*%/gi;

function parseFrenchPercent(raw: string): number | null {
  const cleaned = raw.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value / 100;
}

function toCountryCode(name: string): string {
  const trimmed = name.trim();
  if (COUNTRY_NAME_TO_ISO[trimmed]) return COUNTRY_NAME_TO_ISO[trimmed];
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return "OTHER";
}

function collectWeights(
  matches: IterableIterator<RegExpMatchArray>,
): JustEtfCountryWeight[] {
  const totals = new Map<string, number>();
  for (const match of matches) {
    const label = match[1].replace(/<[^>]+>/g, "").trim();
    if (!label || /secteur|sector|technologie|finance/i.test(label)) continue;
    const weight = parseFrenchPercent(match[2]);
    if (weight === null || weight < 0) continue;
    const country = toCountryCode(label);
    totals.set(country, (totals.get(country) ?? 0) + weight);
  }

  return [...totals.entries()].map(([country, weight]) => ({
    country,
    weight: Math.round(weight * 10000) / 10000,
  }));
}

export function parseJustEtfCountryWeights(html: string): JustEtfCountryWeight[] {
  const fromTestIds = collectWeights(html.matchAll(JUSTETF_COUNTRY_ROW_REGEX));
  if (fromTestIds.length > 0) return fromTestIds;

  const countriesTableIndex = html.search(
    /etf-holdings_countries_(?:table|container)|data-testid="hl_etf-holdings_countries_header"/i,
  );
  const paysHeadingIndex = html.search(
    /<(?:h[1-6]|div|section)[^>]*>\s*(?:Pays|Countries|Länder)\s*</i,
  );
  const sectionStart =
    countriesTableIndex >= 0
      ? countriesTableIndex
      : paysHeadingIndex >= 0
        ? paysHeadingIndex
        : -1;
  if (sectionStart < 0) return [];

  return collectWeights(
    html.slice(sectionStart, sectionStart + 12000).matchAll(SIMPLE_ROW_REGEX),
  );
}

export async function applyJustEtfGeographicSync(
  workbook: Workbook,
  assetId: string,
  options: {
    fetchHtml: (isin: string) => Promise<string>;
    restore?: boolean;
  },
): Promise<{
  workbook: Workbook;
  ok: boolean;
  updated: boolean;
  skippedManual: boolean;
}> {
  const asset = workbook.assets.find((candidate) => candidate.id === assetId);
  if (!asset?.isin) {
    return { workbook, ok: false, updated: false, skippedManual: false };
  }

  try {
    const html = await options.fetchHtml(asset.isin);
    const weights = lookThroughCountryWeights(parseJustEtfCountryWeights(html));
    if (weights.length === 0) {
      return { workbook, ok: false, updated: false, skippedManual: false };
    }
    const currentSource = allocationSourceForAsset(
      workbook.geographicAllocations ?? [],
      assetId,
    );
    if (currentSource === "manual" && !options.restore) {
      return { workbook, ok: true, updated: false, skippedManual: true };
    }
    const before = workbook.geographicAllocations ?? [];
    const next = applyFetchedGeographicAllocation(
      workbook,
      assetId,
      weights,
      { restore: options.restore },
    );
    const after = next.geographicAllocations ?? [];
    const updated = JSON.stringify(before) !== JSON.stringify(after);
    return { workbook: next, ok: true, updated, skippedManual: false };
  } catch {
    return { workbook, ok: false, updated: false, skippedManual: false };
  }
}
