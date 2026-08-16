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

    coveredMarketValue += position.marketValue;
    for (const row of rows) {
      const country = row.country.trim().toUpperCase();
      const contribution = position.marketValue * row.weight;
      countryTotals.set(
        country,
        (countryTotals.get(country) ?? 0) + contribution,
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
