import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Asset } from "@/lib/schema";

type ManualPrice = {
  assetId: string;
  date: Date;
  price: number;
};

type WorkbookAwarePriceMap = (
  assets: Asset[],
  manualPrices: ManualPrice[],
) => Promise<Map<string, number>>;

const originalDataDir = process.env.FINGRAPHS_DATA_DIR;
let testDataDir: string | null = null;

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

async function loadStore() {
  testDataDir = await mkdtemp(join(tmpdir(), "patrimo-manual-prices-"));
  process.env.FINGRAPHS_DATA_DIR = testDataDir;
  vi.resetModules();
  return import("@/lib/store");
}

afterEach(async () => {
  process.env.FINGRAPHS_DATA_DIR = originalDataDir;
  vi.resetModules();
  if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
  testDataDir = null;
});

describe("web price map", () => {
  it("price map uses the latest workbook price for manual assets", async () => {
    const store = await loadStore();
    const readPriceMap = store.readPriceMap as WorkbookAwarePriceMap;

    const priceMap = await readPriceMap(
      [manualAsset],
      [
        {
          assetId: manualAsset.id,
          date: new Date("2026-01-01T00:00:00.000Z"),
          price: 100,
        },
        {
          assetId: manualAsset.id,
          date: new Date("2026-03-01T00:00:00.000Z"),
          price: 120,
        },
      ],
    );

    expect(priceMap.get(manualAsset.id)).toBe(120);
  });

  it("price map leaves a manual asset unvalued when the workbook has no price", async () => {
    const store = await loadStore();
    const readPriceMap = store.readPriceMap as WorkbookAwarePriceMap;

    const priceMap = await readPriceMap([manualAsset], []);

    expect(priceMap.has(manualAsset.id)).toBe(false);
  });

  it("price map continues to use prices.json for automatic-source assets", async () => {
    const store = await loadStore();
    await store.writePrices({
      [automaticAsset.id]: {
        "2026-01-01": 70,
        "2026-03-01": 75,
      },
    });
    const readPriceMap = store.readPriceMap as WorkbookAwarePriceMap;

    const priceMap = await readPriceMap(
      [automaticAsset],
      [
        {
          assetId: automaticAsset.id,
          date: new Date("2026-04-01T00:00:00.000Z"),
          price: 999,
        },
      ],
    );

    expect(priceMap.get(automaticAsset.id)).toBe(75);
  });
});
