import type { GeographicAllocation } from "./schema";
import { GEOGRAPHIC_WEIGHT_SUM_TOLERANCE } from "./geographic-allocation";

export type GeographicRegion =
  | "NORTH_AMERICA"
  | "EUROPE"
  | "ASIA_PACIFIC"
  | "EMERGING"
  | "OTHER";

export const GEOGRAPHIC_REGION_LABELS: Record<GeographicRegion, string> = {
  NORTH_AMERICA: "Amérique du Nord",
  EUROPE: "Europe",
  ASIA_PACIFIC: "Asie-Pacifique",
  EMERGING: "Marchés émergents",
  OTHER: "Autre",
};

export function regionLabel(key: string): string {
  return GEOGRAPHIC_REGION_LABELS[key as GeographicRegion] ?? key;
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
  JP: "ASIA_PACIFIC",
  AU: "ASIA_PACIFIC",
  NZ: "ASIA_PACIFIC",
  HK: "ASIA_PACIFIC",
  SG: "ASIA_PACIFIC",
  KR: "ASIA_PACIFIC",
  TW: "ASIA_PACIFIC",
  CN: "EMERGING",
  IN: "EMERGING",
  BR: "EMERGING",
  ZA: "EMERGING",
  SA: "EMERGING",
  AE: "EMERGING",
  KW: "EMERGING",
  QA: "EMERGING",
  TR: "EMERGING",
  PL: "EMERGING",
  GR: "EMERGING",
  HU: "EMERGING",
  CZ: "EMERGING",
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
  let coveredMarketValue = 0;

  for (const position of positions) {
    if (!(position.marketValue > 0)) continue;
    const rows = byAsset.get(position.assetId);
    if (!rows || !isValidAllocation(rows)) continue;

    const lookThrough = lookThroughRows(rows);
    if (lookThrough.length === 0) continue;

    coveredMarketValue += position.marketValue;
    for (const row of lookThrough) {
      const contribution = position.marketValue * row.weight;
      countryTotals.set(
        row.country,
        (countryTotals.get(row.country) ?? 0) + contribution,
      );
    }
  }

  const regionTotals = new Map<string, number>();
  for (const [country, marketValue] of countryTotals) {
    const region = regionForCountry(country);
    regionTotals.set(region, (regionTotals.get(region) ?? 0) + marketValue);
  }

  return {
    coveredMarketValue,
    countries: toSortedSlices(countryTotals, coveredMarketValue),
    regions: toSortedSlices(regionTotals, coveredMarketValue),
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
