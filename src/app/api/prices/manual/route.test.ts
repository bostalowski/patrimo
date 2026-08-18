import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Asset, Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
  loadWorkbook: vi.fn(),
  replaceWorkbook: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  manualPricesToPriceStore: (manualPrices: ManualPrice[]) => {
    const store: Record<string, Record<string, number>> = {};
    for (const entry of manualPrices) {
      const dateKey = entry.date.toISOString().slice(0, 10);
      store[entry.assetId] = {
        ...(store[entry.assetId] ?? {}),
        [dateKey]: entry.price,
      };
    }
    return store;
  },
}));

import * as excel from "@/lib/excel";
import * as manualPriceRoute from "@/app/api/prices/manual/route";

type ManualPrice = {
  assetId: string;
  date: Date;
  price: number;
};

type WorkbookWithManualPrices = Workbook & {
  manualPrices: ManualPrice[];
};

const manualAsset: Asset = {
  id: "manual-fund",
  label: "Manual fund",
  type: "FCPE",
  source: "manual",
  currency: "EUR",
};

const automaticAsset: Asset = {
  id: "automatic-fund",
  label: "Automatic fund",
  type: "ETF",
  source: "yahoo",
  ticker: "AUTO.PA",
  currency: "EUR",
};

function workbook(
  manualPrices: ManualPrice[] = [
    {
      assetId: manualAsset.id,
      date: new Date("2026-01-10T00:00:00.000Z"),
      price: 101,
    },
  ],
): WorkbookWithManualPrices {
  return {
    transactions: [],
    assets: [manualAsset, automaticAsset],
    accounts: [],
    budget: [],
    properties: [],
    dca: [],
    geographicAllocations: [],
    diversificationTargets: [],
    manualPrices,
  };
}

function request(method: "POST" | "DELETE", body: unknown): Request {
  return new Request("http://localhost/api/prices/manual", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/prices/manual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
    vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
  });

  it("GET /api/prices/manual returns manual prices from the workbook", async () => {
    const response = await manualPriceRoute.GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      "manual-fund": { "2026-01-10": 101 },
    });
  });

  it("POST /api/prices/manual persists a dated price in the workbook", async () => {
    const response = await manualPriceRoute.POST(
      request("POST", {
        assetId: manualAsset.id,
        date: "2026-02-15",
        price: 108.5,
      }),
    );

    expect(response.status).toBe(200);
    expect(excel.replaceWorkbook).toHaveBeenCalledTimes(1);
    expect(excel.replaceWorkbook).toHaveBeenCalledWith({
      ...workbook(),
      manualPrices: [
        ...workbook().manualPrices,
        {
          assetId: manualAsset.id,
          date: new Date("2026-02-15T00:00:00.000Z"),
          price: 108.5,
        },
      ],
    });
  });

  it("POST /api/prices/manual replaces an existing asset and date entry", async () => {
    const response = await manualPriceRoute.POST(
      request("POST", {
        assetId: manualAsset.id,
        date: "2026-01-10",
        price: 115,
      }),
    );

    expect(response.status).toBe(200);
    expect(excel.replaceWorkbook).toHaveBeenCalledWith({
      ...workbook(),
      manualPrices: [
        {
          assetId: manualAsset.id,
          date: new Date("2026-01-10T00:00:00.000Z"),
          price: 115,
        },
      ],
    });
  });

  it("POST /api/prices/manual rejects future dates, unknown assets, and non-manual assets", async () => {
    const invalidInputs = [
      {
        assetId: manualAsset.id,
        date: "2999-01-01",
        price: 100,
      },
      {
        assetId: "unknown-asset",
        date: "2026-01-01",
        price: 100,
      },
      {
        assetId: automaticAsset.id,
        date: "2026-01-01",
        price: 100,
      },
    ];

    for (const input of invalidInputs) {
      const response = await manualPriceRoute.POST(request("POST", input));
      expect(response.ok, JSON.stringify(input)).toBe(false);
    }
    expect(excel.replaceWorkbook).not.toHaveBeenCalled();
  });

  it("DELETE /api/prices/manual removes the workbook entry", async () => {
    const response = await manualPriceRoute.DELETE(
      request("DELETE", {
        assetId: manualAsset.id,
        date: "2026-01-10",
      }),
    );

    expect(response.status).toBe(200);
    expect(excel.replaceWorkbook).toHaveBeenCalledTimes(1);
    expect(excel.replaceWorkbook).toHaveBeenCalledWith({
      ...workbook(),
      manualPrices: [],
    geographicAllocations: [],
    diversificationTargets: [],
    });
  });

  it("manual price API operations only load and replace the workbook", async () => {
    await manualPriceRoute.GET();
    await manualPriceRoute.POST(
      request("POST", {
        assetId: manualAsset.id,
        date: "2026-02-15",
        price: 108.5,
      }),
    );
    await manualPriceRoute.DELETE(
      request("DELETE", {
        assetId: manualAsset.id,
        date: "2026-01-10",
      }),
    );

    expect(excel.loadWorkbook).toHaveBeenCalledTimes(3);
    expect(excel.replaceWorkbook).toHaveBeenCalledTimes(2);
  });
});
