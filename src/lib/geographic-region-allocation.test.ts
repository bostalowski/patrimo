import { describe, expect, it } from "vitest";
import type { Asset, GeographicAllocation, Workbook } from "@patrimo/core/schema";
import { replaceGeographicAllocation } from "@patrimo/core/geographic-allocation";
import { aggregateGeographicExposure } from "@patrimo/core/geographic-exposure";

function asset(id: string): Asset {
  return {
    id,
    label: id,
    type: "ETF",
    source: "yahoo",
    currency: "EUR",
  };
}

function workbook(
  overrides: Partial<Workbook & { geographicAllocations: GeographicAllocation[] }> = {},
): Workbook {
  return {
    accounts: [],
    assets: [asset("world"), asset("europe-fund")],
    transactions: [],
    budget: [],
    properties: [],
    dca: [],
    manualPrices: [],
    geographicAllocations: [],
    ...overrides,
  };
}

describe("core geographic region-level allocations", () => {
  it("core rejects mixed country and region keys on one asset allocation", () => {
    expect(() =>
      replaceGeographicAllocation(
        workbook(),
        "world",
        [
          { country: "US", weight: 0.5 },
          { country: "EUROPE", weight: 0.5 },
        ],
        "manual",
      ),
    ).toThrow(/mix|region|country/i);
  });

  it("core accepts homogeneous region-key rows and aggregates them into the region breakdown only", () => {
    const next = replaceGeographicAllocation(
      workbook(),
      "europe-fund",
      [
        { country: "EUROPE", weight: 0.6 },
        { country: "NORTH_AMERICA", weight: 0.4 },
      ],
      "manual",
    );

    expect(next.geographicAllocations).toEqual([
      {
        assetId: "europe-fund",
        country: "EUROPE",
        weight: 0.6,
        source: "manual",
      },
      {
        assetId: "europe-fund",
        country: "NORTH_AMERICA",
        weight: 0.4,
        source: "manual",
      },
    ]);

    const exposure = aggregateGeographicExposure(
      [{ assetId: "europe-fund", marketValue: 1000 }],
      next.geographicAllocations ?? [],
    );

    expect(exposure.countries).toEqual([]);
    expect(exposure.regions.map((slice) => slice.key)).toEqual([
      "EUROPE",
      "NORTH_AMERICA",
    ]);
    expect(exposure.regions[0]?.marketValue).toBe(600);
    expect(exposure.regions[1]?.marketValue).toBe(400);
  });

  it("country breakdown excludes region-only assets; region breakdown includes country rollups and region-only assets", () => {
    const withCountry = replaceGeographicAllocation(
      workbook(),
      "world",
      [
        { country: "US", weight: 0.7 },
        { country: "JP", weight: 0.3 },
      ],
      "manual",
    );
    const withBoth = replaceGeographicAllocation(
      withCountry,
      "europe-fund",
      [
        { country: "EUROPE", weight: 1 },
      ],
      "manual",
    );

    const exposure = aggregateGeographicExposure(
      [
        { assetId: "world", marketValue: 1000 },
        { assetId: "europe-fund", marketValue: 500 },
      ],
      withBoth.geographicAllocations ?? [],
    );

    expect(exposure.countries.map((slice) => slice.key)).toEqual(["US", "JP"]);
    expect(exposure.countries.find((slice) => slice.key === "US")?.marketValue).toBe(
      700,
    );
    expect(exposure.regions.map((slice) => slice.key).sort()).toEqual([
      "ASIA_PACIFIC",
      "EUROPE",
      "NORTH_AMERICA",
    ].sort());
    expect(
      exposure.regions.find((slice) => slice.key === "EUROPE")?.marketValue,
    ).toBe(500);
    expect(
      exposure.regions.find((slice) => slice.key === "NORTH_AMERICA")?.marketValue,
    ).toBe(700);
  });
});
