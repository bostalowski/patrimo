import type { GeographicAllocation } from "./schema";
import { GEOGRAPHIC_WEIGHT_SUM_TOLERANCE } from "./geographic-allocation";

export type GeographicRegion =
  | "NORTH_AMERICA"
  | "LATIN_AMERICA"
  | "EUROPE"
  | "ASIA_PACIFIC"
  | "AFRICA_MIDDLE_EAST"
  | "OTHER";

export const PRODUCT_GEOGRAPHIC_REGIONS: GeographicRegion[] = [
  "NORTH_AMERICA",
  "LATIN_AMERICA",
  "EUROPE",
  "ASIA_PACIFIC",
  "AFRICA_MIDDLE_EAST",
  "OTHER",
];

export const GEOGRAPHIC_REGION_LABELS: Record<GeographicRegion, string> = {
  NORTH_AMERICA: "Amérique du Nord",
  LATIN_AMERICA: "Amérique latine",
  EUROPE: "Europe",
  ASIA_PACIFIC: "Asie-Pacifique",
  AFRICA_MIDDLE_EAST: "Afrique & Moyen-Orient",
  OTHER: "Autre",
};

const LEGACY_REGION_ALIASES: Record<string, GeographicRegion> = {
  EMERGING: "OTHER",
};

export function normalizeGeographicRegionKey(key: string): string {
  const normalized = key.trim().toUpperCase();
  return LEGACY_REGION_ALIASES[normalized] ?? normalized;
}

export function isGeographicRegionKey(key: string): boolean {
  const normalized = normalizeGeographicRegionKey(key);
  return (PRODUCT_GEOGRAPHIC_REGIONS as string[]).includes(normalized);
}

export function isIsoCountryKey(key: string): boolean {
  const normalized = key.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized);
}

export type GeographicAllocationGranularity = "country" | "region";

export function geographicAllocationGranularity(
  keys: string[],
): GeographicAllocationGranularity {
  let hasCountry = false;
  let hasNamedRegion = false;
  let hasOther = false;

  for (const raw of keys) {
    const key = raw.trim().toUpperCase();
    if (!key) {
      throw new Error("Geographic allocation country is required");
    }
    if (key === "OTHER") {
      hasOther = true;
      continue;
    }
    if (isGeographicRegionKey(key)) {
      hasNamedRegion = true;
      continue;
    }
    if (isIsoCountryKey(key)) {
      hasCountry = true;
      continue;
    }
    throw new Error(`Invalid geographic allocation key: ${raw}`);
  }

  if (hasCountry && hasNamedRegion) {
    throw new Error(
      "Geographic allocation cannot mix country and region keys",
    );
  }
  if (hasNamedRegion) return "region";
  if (hasCountry) return "country";
  if (hasOther) return "region";
  throw new Error("Geographic allocation country is required");
}

export function regionLabel(key: string): string {
  const normalized = normalizeGeographicRegionKey(key);
  return GEOGRAPHIC_REGION_LABELS[normalized as GeographicRegion] ?? key;
}

export function geographicCountryLabel(countryCode: string): string {
  const code = countryCode.trim().toUpperCase();
  if (code === "OTHER") return "Autre";
  if (!/^[A-Z]{2}$/.test(code)) return code;
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function isMappableCountryCode(countryCode: string): boolean {
  const code = countryCode.trim().toUpperCase();
  if (code === "OTHER" || !/^[A-Z]{2}$/.test(code)) return false;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code);
    return Boolean(name && name !== code && name !== "Unknown Region");
  } catch {
    return false;
  }
}

export type GeographicSlice = {
  key: string;
  marketValue: number;
  weight: number;
};

export type GeographicExposure = {
  countries: GeographicSlice[];
  regions: GeographicSlice[];
  coveredMarketValue: number;
};

const REGION_BY_COUNTRY: Record<string, GeographicRegion> = {
  US: "NORTH_AMERICA",
  CA: "NORTH_AMERICA",
  MX: "NORTH_AMERICA",
  BR: "LATIN_AMERICA",
  AR: "LATIN_AMERICA",
  CL: "LATIN_AMERICA",
  CO: "LATIN_AMERICA",
  PE: "LATIN_AMERICA",
  GB: "EUROPE",
  FR: "EUROPE",
  DE: "EUROPE",
  CH: "EUROPE",
  NL: "EUROPE",
  IT: "EUROPE",
  ES: "EUROPE",
  SE: "EUROPE",
  DK: "EUROPE",
  NO: "EUROPE",
  FI: "EUROPE",
  IE: "EUROPE",
  BE: "EUROPE",
  AT: "EUROPE",
  PT: "EUROPE",
  PL: "EUROPE",
  GR: "EUROPE",
  HU: "EUROPE",
  CZ: "EUROPE",
  JP: "ASIA_PACIFIC",
  AU: "ASIA_PACIFIC",
  NZ: "ASIA_PACIFIC",
  HK: "ASIA_PACIFIC",
  SG: "ASIA_PACIFIC",
  KR: "ASIA_PACIFIC",
  TW: "ASIA_PACIFIC",
  CN: "ASIA_PACIFIC",
  IN: "ASIA_PACIFIC",
  ZA: "AFRICA_MIDDLE_EAST",
  SA: "AFRICA_MIDDLE_EAST",
  AE: "AFRICA_MIDDLE_EAST",
  KW: "AFRICA_MIDDLE_EAST",
  QA: "AFRICA_MIDDLE_EAST",
  TR: "AFRICA_MIDDLE_EAST",
  EG: "AFRICA_MIDDLE_EAST",
  NG: "AFRICA_MIDDLE_EAST",
  OTHER: "OTHER",
};

export function regionForCountry(country: string): GeographicRegion {
  return REGION_BY_COUNTRY[country.trim().toUpperCase()] ?? "OTHER";
}

type PositionInput = {
  assetId: string;
  marketValue: number;
};

function allocationsByAsset(
  allocations: GeographicAllocation[],
): Map<string, GeographicAllocation[]> {
  const byAsset = new Map<string, GeographicAllocation[]>();
  for (const entry of allocations) {
    const rows = byAsset.get(entry.assetId) ?? [];
    rows.push(entry);
    byAsset.set(entry.assetId, rows);
  }
  return byAsset;
}

function isValidAllocation(rows: GeographicAllocation[]): boolean {
  if (rows.length === 0) return false;
  const sum = rows.reduce((total, row) => total + row.weight, 0);
  return Math.abs(sum - 1) <= GEOGRAPHIC_WEIGHT_SUM_TOLERANCE;
}

function lookThroughRows(
  rows: GeographicAllocation[],
): Array<{ country: string; weight: number }> {
  return lookThroughCountryWeights(rows);
}

export function lookThroughCountryWeights(
  weights: Array<{ country: string; weight: number }>,
): Array<{ country: string; weight: number }> {
  const known = weights
    .map((row) => ({
      country: row.country.trim().toUpperCase(),
      weight: row.weight,
    }))
    .filter((row) => row.country && row.country !== "OTHER" && row.weight > 0);

  const sum = known.reduce((total, row) => total + row.weight, 0);
  if (sum <= 0) return [];

  return known.map((row) => ({
    country: row.country,
    weight: Math.round((row.weight / sum) * 1e6) / 1e6,
  }));
}

function toSortedSlices(
  totals: Map<string, number>,
  coveredMarketValue: number,
): GeographicSlice[] {
  if (coveredMarketValue <= 0) return [];
  return [...totals.entries()]
    .map(([key, marketValue]) => ({
      key,
      marketValue,
      weight: marketValue / coveredMarketValue,
    }))
    .sort(
      (a, b) =>
        b.marketValue - a.marketValue || a.key.localeCompare(b.key),
    );
}

export function aggregateGeographicExposure(
  positions: PositionInput[],
  allocations: GeographicAllocation[],
): GeographicExposure {
  const byAsset = allocationsByAsset(allocations);
  const countryTotals = new Map<string, number>();
  const regionTotals = new Map<string, number>();
  let countryCoveredMarketValue = 0;
  let regionCoveredMarketValue = 0;

  for (const position of positions) {
    if (!(position.marketValue > 0)) continue;
    const rows = byAsset.get(position.assetId);
    if (!rows || !isValidAllocation(rows)) continue;

    let granularity: GeographicAllocationGranularity;
    try {
      granularity = geographicAllocationGranularity(
        rows.map((row) => row.country),
      );
    } catch {
      continue;
    }

    if (granularity === "region") {
      const regionWeights = rows
        .map((row) => ({
          country: normalizeGeographicRegionKey(row.country),
          weight: row.weight,
        }))
        .filter((row) => row.weight > 0);
      const sum = regionWeights.reduce((total, row) => total + row.weight, 0);
      if (sum <= 0) continue;

      regionCoveredMarketValue += position.marketValue;
      for (const row of regionWeights) {
        const contribution = position.marketValue * (row.weight / sum);
        regionTotals.set(
          row.country,
          (regionTotals.get(row.country) ?? 0) + contribution,
        );
      }
      continue;
    }

    const lookThrough = lookThroughRows(rows);
    if (lookThrough.length === 0) continue;

    countryCoveredMarketValue += position.marketValue;
    regionCoveredMarketValue += position.marketValue;
    for (const row of lookThrough) {
      const contribution = position.marketValue * row.weight;
      countryTotals.set(
        row.country,
        (countryTotals.get(row.country) ?? 0) + contribution,
      );
      const region = regionForCountry(row.country);
      regionTotals.set(region, (regionTotals.get(region) ?? 0) + contribution);
    }
  }

  return {
    coveredMarketValue: Math.max(
      countryCoveredMarketValue,
      regionCoveredMarketValue,
    ),
    countries: toSortedSlices(countryTotals, countryCoveredMarketValue),
    regions: toSortedSlices(regionTotals, regionCoveredMarketValue),
  };
}

export function aggregateGeographicExposureForAccount(
  positions: Array<PositionInput & { accountId: string }>,
  allocations: GeographicAllocation[],
  accountId: string,
): GeographicExposure {
  return aggregateGeographicExposure(
    positions.filter((position) => position.accountId === accountId),
    allocations,
  );
}
