import { describe, expect, it } from "vitest";
import * as core from "@patrimo/core";
import type { Asset, Workbook } from "@patrimo/core/schema";

type ManualPrice = {
  assetId: string;
  date: Date;
  price: number;
};

type ManualPriceWorkbook = Workbook & {
  manualPrices: ManualPrice[];
};

type ManualPriceApi = typeof core & {
  upsertManualPrice?: (
    workbook: ManualPriceWorkbook,
    manualPrice: ManualPrice,
  ) => ManualPriceWorkbook;
  normalizeManualPrices?: (
    manualPrices: ManualPrice[],
    assets: Asset[],
  ) => ManualPrice[];
  deleteManualPrice?: (
    workbook: ManualPriceWorkbook,
    assetId: string,
    date: Date,
  ) => ManualPriceWorkbook;
};

const manualPriceApi = core as ManualPriceApi;

function asset(id: string, source: Asset["source"] = "manual"): Asset {
  return {
    id,
    label: id,
    type: "ETF",
    source,
    currency: "EUR",
  };
}

function workbook(overrides: Partial<ManualPriceWorkbook> = {}): ManualPriceWorkbook {
  return {
    accounts: [],
    assets: [asset("fund")],
    transactions: [],
    budget: [],
    properties: [],
    dca: [],
    manualPrices: [],
    geographicAllocations: [],
    diversificationTargets: [],
    ...overrides,
  };
}

function manualPrice(
  assetId: string,
  date: string,
  price: number,
): ManualPrice {
  return { assetId, date: new Date(`${date}T00:00:00.000Z`), price };
}

function requireManualPriceUpsert(): NonNullable<
  ManualPriceApi["upsertManualPrice"]
> {
  const implementation = manualPriceApi.upsertManualPrice;
  expect(
    implementation,
    "The shared manual-price upsert behavior is not implemented",
  ).toBeTypeOf("function");
  if (!implementation) throw new Error("Manual-price upsert is unavailable");
  return implementation;
}

function upsertManualPrice(
  source: ManualPriceWorkbook,
  entry: ManualPrice,
): ManualPriceWorkbook {
  return requireManualPriceUpsert()(source, entry);
}

function normalizeManualPrices(
  entries: ManualPrice[],
  assets: Asset[],
): ManualPrice[] {
  const implementation = manualPriceApi.normalizeManualPrices;
  expect(
    implementation,
    "The shared manual-price normalization behavior is not implemented",
  ).toBeTypeOf("function");
  if (!implementation) {
    throw new Error("Manual-price normalization is unavailable");
  }
  return implementation(entries, assets);
}

function deleteManualPrice(
  source: ManualPriceWorkbook,
  assetId: string,
  date: Date,
): ManualPriceWorkbook {
  const implementation = manualPriceApi.deleteManualPrice;
  expect(
    implementation,
    "The shared manual-price deletion behavior is not implemented",
  ).toBeTypeOf("function");
  if (!implementation) throw new Error("Manual-price deletion is unavailable");
  return implementation(source, assetId, date);
}

describe("core manual prices", () => {
  it("adds a dated manual price for an existing manual asset", () => {
    const entry = manualPrice("fund", "2026-01-15", 123.45);

    const result = upsertManualPrice(workbook(), entry);

    expect(result.manualPrices).toEqual([entry]);
  });

  it("replaces the price when the same asset and date already exist", () => {
    const existing = manualPrice("fund", "2026-01-15", 100);
    const replacement = manualPrice("fund", "2026-01-15", 125);

    const result = upsertManualPrice(
      workbook({ manualPrices: [existing] }),
      replacement,
    );

    expect(result.manualPrices).toEqual([replacement]);
  });

  it("keeps the last valid row when duplicate asset and date entries are normalized", () => {
    const first = manualPrice("fund", "2026-01-15", 100);
    const invalid = manualPrice("fund", "2026-01-15", -1);
    const last = manualPrice("fund", "2026-01-15", 125);

    const result = normalizeManualPrices(
      [first, invalid, last],
      [asset("fund")],
    );

    expect(result).toEqual([last]);
  });

  it("rejects a manual price for an unknown asset", () => {
    const upsert = requireManualPriceUpsert();

    expect(() =>
      upsert(
        workbook(),
        manualPrice("missing", "2026-01-15", 100),
      ),
    ).toThrow(/asset/i);
  });

  it("rejects a manual price for an asset with a non-manual source", () => {
    const source = workbook({ assets: [asset("fund", "yahoo")] });
    const upsert = requireManualPriceUpsert();

    expect(() =>
      upsert(source, manualPrice("fund", "2026-01-15", 100)),
    ).toThrow(/manual|source/i);
  });

  it("rejects a future-dated manual price", () => {
    const upsert = requireManualPriceUpsert();

    expect(() =>
      upsert(
        workbook(),
        manualPrice("fund", "2999-01-01", 100),
      ),
    ).toThrow(/date|future/i);
  });

  it("rejects zero, negative, and non-finite manual prices", () => {
    const upsert = requireManualPriceUpsert();

    for (const price of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        upsert(
          workbook(),
          manualPrice("fund", "2026-01-15", price),
        ),
      ).toThrow(/price|positive|finite/i);
    }
  });

  it("removes one manual price without affecting other dates or assets", () => {
    const removed = manualPrice("fund", "2026-01-15", 100);
    const otherDate = manualPrice("fund", "2026-01-16", 101);
    const otherAsset = manualPrice("other", "2026-01-15", 200);
    const source = workbook({
      assets: [asset("fund"), asset("other")],
      manualPrices: [removed, otherDate, otherAsset],
    });

    const result = deleteManualPrice(source, "fund", removed.date);

    expect(result.manualPrices).toEqual([otherDate, otherAsset]);
  });
});
