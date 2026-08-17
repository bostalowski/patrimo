import { describe, expect, it } from "vitest";
import * as core from "@patrimo/core";
import type { Asset, Workbook } from "@patrimo/core/schema";

type GeographicAllocation = {
  assetId: string;
  country: string;
  weight: number;
  source: "justetf" | "manual";
};

type GeographicWorkbook = Workbook & {
  geographicAllocations: GeographicAllocation[];
};

type GeographicApi = typeof core & {
  replaceGeographicAllocation?: (
    workbook: GeographicWorkbook,
    assetId: string,
    weights: Array<{ country: string; weight: number }>,
    source: GeographicAllocation["source"],
  ) => GeographicWorkbook;
  weightFromExcelPercentCell?: (
    raw: number,
    rawValuesForAsset: readonly number[],
  ) => number;
};

const geographicApi = core as GeographicApi;

function asset(id: string): Asset {
  return {
    id,
    label: id,
    type: "ETF",
    source: "yahoo",
    currency: "EUR",
    isin: "IE00B4L5Y983",
  };
}

function workbook(
  overrides: Partial<GeographicWorkbook> = {},
): GeographicWorkbook {
  return {
    accounts: [],
    assets: [asset("world")],
    transactions: [],
    budget: [],
    properties: [],
    dca: [],
    manualPrices: [],
    geographicAllocations: [],
    ...overrides,
  };
}

function requireReplace(): NonNullable<
  GeographicApi["replaceGeographicAllocation"]
> {
  const implementation = geographicApi.replaceGeographicAllocation;
  expect(
    implementation,
    "The shared geographic-allocation replace behavior is not implemented",
  ).toBeTypeOf("function");
  if (!implementation) {
    throw new Error("Geographic allocation replace is unavailable");
  }
  return implementation;
}

describe("core geographic allocations", () => {
  it("accepts an allocation whose weights sum to less than 1", () => {
    const replace = requireReplace();

    const result = replace(
      workbook(),
      "world",
      [
        { country: "US", weight: 0.7 },
        { country: "JP", weight: 0.1 },
      ],
      "manual",
    );

    expect(result.geographicAllocations).toEqual([
      {
        assetId: "world",
        country: "US",
        weight: 0.7,
        source: "manual",
      },
      {
        assetId: "world",
        country: "JP",
        weight: 0.1,
        source: "manual",
      },
    ]);
  });

  it("accepts an allocation whose weights sum to ~1", () => {
    const replace = requireReplace();

    const result = replace(
      workbook(),
      "world",
      [
        { country: "US", weight: 0.7 },
        { country: "JP", weight: 0.3 },
      ],
      "manual",
    );

    expect(result.geographicAllocations).toEqual([
      {
        assetId: "world",
        country: "US",
        weight: 0.7,
        source: "manual",
      },
      {
        assetId: "world",
        country: "JP",
        weight: 0.3,
        source: "manual",
      },
    ]);
  });

  it("rejects an allocation whose weights sum to more than 1", () => {
    const replace = requireReplace();

    expect(() =>
      replace(
        workbook(),
        "world",
        [
          { country: "US", weight: 0.7 },
          { country: "JP", weight: 0.4 },
        ],
        "manual",
      ),
    ).toThrow(/sum|weight/i);
  });

  it("rejects a negative or empty country weight row", () => {
    const replace = requireReplace();

    expect(() =>
      replace(
        workbook(),
        "world",
        [
          { country: "US", weight: -0.1 },
          { country: "OTHER", weight: 1.1 },
        ],
        "manual",
      ),
    ).toThrow(/weight|country/i);

    expect(() =>
      replace(
        workbook(),
        "world",
        [
          { country: "", weight: 0.5 },
          { country: "US", weight: 0.5 },
        ],
        "manual",
      ),
    ).toThrow(/country/i);
  });

  it("replaces all geographic rows for an asset on upsert", () => {
    const replace = requireReplace();
    const source = workbook({
      geographicAllocations: [
        {
          assetId: "world",
          country: "US",
          weight: 1,
          source: "justetf",
        },
        {
          assetId: "other",
          country: "FR",
          weight: 1,
          source: "manual",
        },
      ],
      assets: [asset("world"), asset("other")],
    });

    const result = replace(
      source,
      "world",
      [
        { country: "US", weight: 0.7 },
        { country: "JP", weight: 0.3 },
      ],
      "manual",
    );

    expect(result.geographicAllocations).toEqual([
      {
        assetId: "other",
        country: "FR",
        weight: 1,
        source: "manual",
      },
      {
        assetId: "world",
        country: "US",
        weight: 0.7,
        source: "manual",
      },
      {
        assetId: "world",
        country: "JP",
        weight: 0.3,
        source: "manual",
      },
    ]);
  });
});

describe("weightFromExcelPercentCell", () => {
  it("treats percent-point rows (70) as percent points when any value is > 1", () => {
    expect(
      geographicApi.weightFromExcelPercentCell?.(0.9, [30.4, 0.9]),
    ).toBeCloseTo(0.009);
    expect(
      geographicApi.weightFromExcelPercentCell?.(30.4, [30.4, 0.9]),
    ).toBeCloseTo(0.304);
  });

  it("treats Excel percentage-format fractions (0.7) as model weights", () => {
    expect(
      geographicApi.weightFromExcelPercentCell?.(0.697, [0.697, 0.303]),
    ).toBe(0.697);
    expect(
      geographicApi.weightFromExcelPercentCell?.(1, [1]),
    ).toBe(1);
  });
});
