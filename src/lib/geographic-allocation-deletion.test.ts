import { describe, expect, it } from "vitest";
import { deleteAsset } from "@patrimo/core/deletion";
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

function asset(id: string): Asset {
  return {
    id,
    label: id,
    type: "ETF",
    source: "yahoo",
    currency: "EUR",
  };
}

function allocation(
  assetId: string,
  country: string,
  weight: number,
): GeographicAllocation {
  return { assetId, country, weight, source: "manual" };
}

function workbook(
  overrides: Partial<GeographicWorkbook>,
): GeographicWorkbook {
  return {
    accounts: [],
    assets: [],
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

function allocationsFrom(result: Workbook): GeographicAllocation[] {
  return (result as GeographicWorkbook).geographicAllocations ?? [];
}

describe("core deletion of geographic allocations", () => {
  it("deleting an asset removes its geographic allocation rows", () => {
    const retained = allocation("bond", "FR", 1);
    const source = workbook({
      assets: [asset("world"), asset("bond")],
      geographicAllocations: [
        allocation("world", "US", 0.7),
        allocation("world", "JP", 0.3),
        retained,
      ],
    });

    const result = deleteAsset(source, "world");

    expect(allocationsFrom(result.workbook)).toEqual([retained]);
  });
});
