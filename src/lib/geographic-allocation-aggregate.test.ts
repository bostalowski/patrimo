import { describe, expect, it } from "vitest";
import * as core from "@patrimo/core";
import type { GeographicAllocation } from "@patrimo/core/schema";

type GeoSlice = {
  key: string;
  marketValue: number;
  weight: number;
};

type GeoExposure = {
  countries: GeoSlice[];
  regions: GeoSlice[];
  coveredMarketValue: number;
};

type GeoAggregateApi = typeof core & {
  aggregateGeographicExposure?: (
    positions: Array<{ assetId: string; marketValue: number }>,
    allocations: GeographicAllocation[],
  ) => GeoExposure;
  aggregateGeographicExposureForAccount?: (
    positions: Array<{
      assetId: string;
      accountId: string;
      marketValue: number;
    }>,
    allocations: GeographicAllocation[],
    accountId: string,
  ) => GeoExposure;
};

const geoApi = core as GeoAggregateApi;

function allocation(
  assetId: string,
  country: string,
  weight: number,
): GeographicAllocation {
  return { assetId, country, weight, source: "manual" };
}

function requireAggregate(): NonNullable<
  GeoAggregateApi["aggregateGeographicExposure"]
> {
  const implementation = geoApi.aggregateGeographicExposure;
  expect(
    implementation,
    "The shared geographic exposure aggregation is not implemented",
  ).toBeTypeOf("function");
  if (!implementation) {
    throw new Error("Geographic exposure aggregation is unavailable");
  }
  return implementation;
}

function requireAccountAggregate(): NonNullable<
  GeoAggregateApi["aggregateGeographicExposureForAccount"]
> {
  const implementation = geoApi.aggregateGeographicExposureForAccount;
  expect(
    implementation,
    "The shared account geographic exposure aggregation is not implemented",
  ).toBeTypeOf("function");
  if (!implementation) {
    throw new Error("Account geographic exposure aggregation is unavailable");
  }
  return implementation;
}

describe("core geographic exposure aggregation", () => {
  it("aggregates country exposure weighted by market value across assets", () => {
    const aggregate = requireAggregate();

    const result = aggregate(
      [
        { assetId: "world", marketValue: 1000 },
        { assetId: "japan", marketValue: 500 },
      ],
      [
        allocation("world", "US", 0.7),
        allocation("world", "JP", 0.3),
        allocation("japan", "JP", 1),
      ],
    );

    expect(result.coveredMarketValue).toBe(1500);
    expect(result.countries).toEqual([
      { key: "JP", marketValue: 800, weight: 800 / 1500 },
      { key: "US", marketValue: 700, weight: 700 / 1500 },
    ]);
  });

  it("rolls country exposure up to product regions with absolute weights", () => {
    const aggregate = requireAggregate();

    const result = aggregate(
      [{ assetId: "world", marketValue: 1000 }],
      [
        allocation("world", "US", 0.6),
        allocation("world", "JP", 0.2),
        allocation("world", "FR", 0.1),
        allocation("world", "BR", 0.05),
        allocation("world", "OTHER", 0.05),
      ],
    );

    expect(result.coveredMarketValue).toBe(950);
    expect(result.countries.map((slice) => slice.key)).toEqual([
      "US",
      "JP",
      "FR",
      "BR",
    ]);
    expect(result.countries.find((slice) => slice.key === "US")?.weight).toBeCloseTo(
      600 / 950,
      6,
    );
    expect(result.regions.map((slice) => slice.key)).toEqual([
      "NORTH_AMERICA",
      "ASIA_PACIFIC",
      "EUROPE",
      "LATIN_AMERICA",
    ]);
    expect(result.regions.find((slice) => slice.key === "OTHER")).toBeUndefined();
  });

  it("drops OTHER without redistributing its weight onto other countries", () => {
    const aggregate = requireAggregate();

    const result = aggregate(
      [{ assetId: "world", marketValue: 1000 }],
      [
        allocation("world", "US", 0.7),
        allocation("world", "JP", 0.1),
        allocation("world", "OTHER", 0.2),
      ],
    );

    expect(result.coveredMarketValue).toBe(800);
    expect(result.countries).toEqual([
      { key: "US", marketValue: 700, weight: 700 / 800 },
      { key: "JP", marketValue: 100, weight: 100 / 800 },
    ]);
  });

  it("includes a partially allocated asset in country slices with absolute weights", () => {
    const aggregate = requireAggregate();

    const result = aggregate(
      [{ assetId: "world", marketValue: 1000 }],
      [
        allocation("world", "US", 0.7),
        allocation("world", "JP", 0.1),
      ],
    );

    expect(result.coveredMarketValue).toBe(800);
    expect(result.countries).toEqual([
      { key: "US", marketValue: 700, weight: 700 / 800 },
      { key: "JP", marketValue: 100, weight: 100 / 800 },
    ]);
  });

  it("ignores an allocation whose weights sum to more than 1", () => {
    const aggregate = requireAggregate();

    const result = aggregate(
      [{ assetId: "world", marketValue: 1000 }],
      [
        allocation("world", "US", 0.7),
        allocation("world", "JP", 0.4),
      ],
    );

    expect(result.coveredMarketValue).toBe(0);
    expect(result.countries).toEqual([]);
    expect(result.regions).toEqual([]);
  });

  it("excludes assets without allocation from geo slices", () => {
    const aggregate = requireAggregate();

    const result = aggregate(
      [
        { assetId: "world", marketValue: 1000 },
        { assetId: "btc", marketValue: 2000 },
      ],
      [allocation("world", "US", 1)],
    );

    expect(result.coveredMarketValue).toBe(1000);
    expect(result.countries).toEqual([
      { key: "US", marketValue: 1000, weight: 1 },
    ]);
    expect(result.regions).toEqual([
      { key: "NORTH_AMERICA", marketValue: 1000, weight: 1 },
    ]);
  });

  it("aggregates geographic exposure for a single account's positions only", () => {
    const aggregate = requireAccountAggregate();

    const result = aggregate(
      [
        { assetId: "world", accountId: "pea", marketValue: 1000 },
        { assetId: "world", accountId: "cto", marketValue: 500 },
        { assetId: "japan", accountId: "pea", marketValue: 200 },
      ],
      [
        allocation("world", "US", 1),
        allocation("japan", "JP", 1),
      ],
      "pea",
    );

    expect(result.coveredMarketValue).toBe(1200);
    expect(result.countries).toEqual([
      { key: "US", marketValue: 1000, weight: 1000 / 1200 },
      { key: "JP", marketValue: 200, weight: 200 / 1200 },
    ]);
  });
});
