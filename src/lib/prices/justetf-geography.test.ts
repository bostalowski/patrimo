import { describe, expect, it, vi } from "vitest";
import * as core from "@patrimo/core";
import type { Asset, GeographicAllocation, Workbook } from "@patrimo/core/schema";
import {
  applyJustEtfGeographicSync,
  parseJustEtfCountryWeights,
} from "@/lib/prices/justetf-geography";

type GeographicWorkbook = Workbook & {
  geographicAllocations: GeographicAllocation[];
};

type GeoApi = typeof core & {
  applyFetchedGeographicAllocation?: (
    workbook: GeographicWorkbook,
    assetId: string,
    weights: Array<{ country: string; weight: number }>,
    options?: { restore?: boolean },
  ) => GeographicWorkbook;
};

const geoApi = core as GeoApi;

const JUSTETF_COUNTRIES_FIXTURE = `
<section>
  <h3>Pays</h3>
  <table>
    <tr><td>États-Unis</td><td>70,32%</td></tr>
    <tr><td>Japon</td><td>5,71%</td></tr>
    <tr><td>Grande-Bretagne</td><td>3,59%</td></tr>
    <tr><td>Canada</td><td>3,30%</td></tr>
    <tr><td>Autre</td><td>17,08%</td></tr>
  </table>
</section>
`;

const JUSTETF_LIVE_MARKUP_FIXTURE = `
<div data-testid="etf-holdings_countries_container">
  <h3 data-testid="hl_etf-holdings_countries_header"> Pays </h3>
  <table data-testid="etf-holdings_countries_table">
    <tbody>
      <tr data-testid="etf-holdings_countries_row">
        <td data-testid="tl_etf-holdings_countries_value_name">États-Unis</td>
        <td>
          <div class="right ws">
            <span data-testid="tl_etf-holdings_countries_value_percentage">69,70%</span>
          </div>
        </td>
      </tr>
      <tr data-testid="etf-holdings_countries_row">
        <td data-testid="tl_etf-holdings_countries_value_name">Japon</td>
        <td>
          <span data-testid="tl_etf-holdings_countries_value_percentage">5,62%</span>
        </td>
      </tr>
      <tr data-testid="etf-holdings_countries_row">
        <td data-testid="tl_etf-holdings_countries_value_name">Grande-Bretagne</td>
        <td>
          <span data-testid="tl_etf-holdings_countries_value_percentage">3,56%</span>
        </td>
      </tr>
      <tr data-testid="etf-holdings_countries_row">
        <td data-testid="tl_etf-holdings_countries_value_name">Canada</td>
        <td>
          <span data-testid="tl_etf-holdings_countries_value_percentage">3,28%</span>
        </td>
      </tr>
      <tr data-testid="etf-holdings_countries_row">
        <td data-testid="tl_etf-holdings_countries_value_name">Autre</td>
        <td>
          <span data-testid="tl_etf-holdings_countries_value_percentage">17,84%</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
`;

function asset(id: string, isin = "IE00B4L5Y983"): Asset {
  return {
    id,
    label: id,
    type: "ETF",
    source: "yahoo",
    currency: "EUR",
    isin,
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
    sectorAllocations: [],
    diversificationTargets: [],
    ...overrides,
  };
}

function requireApply(): NonNullable<GeoApi["applyFetchedGeographicAllocation"]> {
  const implementation = geoApi.applyFetchedGeographicAllocation;
  expect(
    implementation,
    "The shared JustETF geographic apply behavior is not implemented",
  ).toBeTypeOf("function");
  if (!implementation) {
    throw new Error("JustETF geographic apply is unavailable");
  }
  return implementation;
}

describe("JustETF geographic sync", () => {
  it("maps a JustETF fixture to ISO country weights and writes source=justetf", async () => {
    const parsed = parseJustEtfCountryWeights(JUSTETF_COUNTRIES_FIXTURE);
    expect(parsed).toEqual([
      { country: "US", weight: 0.7032 },
      { country: "JP", weight: 0.0571 },
      { country: "GB", weight: 0.0359 },
      { country: "CA", weight: 0.033 },
      { country: "OTHER", weight: 0.1708 },
    ]);

    const result = await applyJustEtfGeographicSync(workbook(), "world", {
      fetchHtml: async () => JUSTETF_COUNTRIES_FIXTURE,
    });

    expect(result.ok).toBe(true);
    expect(result.workbook.geographicAllocations.map((row) => row.country)).toEqual([
      "US",
      "JP",
      "GB",
      "CA",
    ]);
    expect(
      result.workbook.geographicAllocations.every((row) => row.source === "justetf"),
    ).toBe(true);
    const us = result.workbook.geographicAllocations.find((row) => row.country === "US");
    expect(us?.weight).toBeCloseTo(0.7032, 5);
  });

  it("parses nested JustETF country percentage markup", () => {
    expect(parseJustEtfCountryWeights(JUSTETF_LIVE_MARKUP_FIXTURE)).toEqual([
      { country: "US", weight: 0.697 },
      { country: "JP", weight: 0.0562 },
      { country: "GB", weight: 0.0356 },
      { country: "CA", weight: 0.0328 },
      { country: "OTHER", weight: 0.1784 },
    ]);
  });

  it("returns no weights when the profile has no countries table", () => {
    expect(
      parseJustEtfCountryWeights(
        `<html><title>ETF</title><td>Volatilité</td><td>14,37%</td></html>`,
      ),
    ).toEqual([]);
  });

  it("does not overwrite an existing manual allocation on ordinary sync", () => {
    const apply = requireApply();
    const manualRows: GeographicAllocation[] = [
      {
        assetId: "world",
        country: "FR",
        weight: 1,
        source: "manual",
      },
    ];
    const source = workbook({ geographicAllocations: manualRows });

    const result = apply(source, "world", [
      { country: "US", weight: 1 },
    ]);

    expect(result.geographicAllocations).toEqual(manualRows);
  });

  it("explicit restore from JustETF replaces a manual allocation", () => {
    const apply = requireApply();
    const source = workbook({
      geographicAllocations: [
        {
          assetId: "world",
          country: "FR",
          weight: 1,
          source: "manual",
        },
      ],
    });

    const result = apply(
      source,
      "world",
      [{ country: "US", weight: 1 }],
      { restore: true },
    );

    expect(result.geographicAllocations).toEqual([
      {
        assetId: "world",
        country: "US",
        weight: 1,
        source: "justetf",
      },
    ]);
  });

  it("JustETF fetch/parse failure does not write workbook rows", async () => {
    const source = workbook();
    const fetchHtml = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await applyJustEtfGeographicSync(source, "world", {
      fetchHtml,
    });

    expect(result.workbook.geographicAllocations).toEqual([]);
    expect(result.ok).toBe(false);
    expect(fetchHtml).toHaveBeenCalled();
  });
});
