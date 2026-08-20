import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Asset, Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
  loadWorkbook: vi.fn(),
  replaceWorkbook: vi.fn(),
}));

vi.mock("@/lib/prices/justetf-geography", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/prices/justetf-geography")
  >("@/lib/prices/justetf-geography");
  return {
    ...actual,
    fetchJustEtfProfileHtml: vi.fn(),
  };
});

import * as excel from "@/lib/excel";
import * as justetf from "@/lib/prices/justetf-geography";
import * as syncRoute from "@/app/api/geography/sync/route";

const etf: Asset = {
  id: "world",
  label: "World",
  type: "ETF",
  source: "yahoo",
  currency: "EUR",
  isin: "IE00B4L5Y983",
};

function workbook(
  overrides: Partial<Workbook> = {},
): Workbook {
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
		financialGoals: [],
    ...overrides,
  };
}

function request(body: unknown): Request {
  return new Request("http://localhost/api/geography/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/geography/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
    vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
  });

  it("web geography sync route still soft-fails without writing when fetch/parse fails", async () => {
    vi.mocked(justetf.fetchJustEtfProfileHtml).mockRejectedValue(
      new Error("network down"),
    );

    const response = await syncRoute.POST(request({ assetId: "world" }));

    expect(response.status).toBe(502);
    expect(excel.replaceWorkbook).not.toHaveBeenCalled();
  });
});
