import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Asset, Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
  loadWorkbook: vi.fn(),
  replaceWorkbook: vi.fn(),
}));

import * as excel from "@/lib/excel";
import * as geographyRoute from "@/app/api/geography/route";

const etf: Asset = {
  id: "world",
  label: "World",
  type: "ETF",
  source: "yahoo",
  currency: "EUR",
  isin: "IE00B4L5Y983",
};

function workbook(): Workbook {
  return {
    transactions: [],
    assets: [etf],
    accounts: [],
    budget: [],
    properties: [],
    dca: [],
    manualPrices: [],
    geographicAllocations: [],
    sectorAllocations: [],
    diversificationTargets: [],
  };
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/geography", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/geography", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
    vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
  });

  it("asset detail can save a manual allocation through the API", async () => {
    const response = await geographyRoute.POST(
      request({
        assetId: "world",
        source: "manual",
        weights: [
          { country: "US", weight: 0.7 },
          { country: "JP", weight: 0.3 },
        ],
      }),
    );

    expect(response.status).toBe(200);
    expect(excel.replaceWorkbook).toHaveBeenCalled();
    const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0][0];
    expect(saved.geographicAllocations).toEqual([
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
