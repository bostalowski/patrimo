import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Asset, Transaction } from "@patrimo/core/schema";
import * as priceSync from "./price-sync";

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storageMocks,
}));

type ManualPrice = {
  assetId: string;
  date: Date;
  price: number;
};

type BuildPriceMapWithWorkbookPrices = (
  assets: Asset[],
  automaticPrices: priceSync.PriceStore,
  manualPrices: ManualPrice[],
) => Map<string, number>;

const buildPriceMap =
  priceSync.buildPriceMap as unknown as BuildPriceMapWithWorkbookPrices;

const manualAsset: Asset = {
  id: "fund",
  label: "Employee fund",
  type: "FCPE",
  source: "manual",
  currency: "EUR",
};

const automaticAsset: Asset = {
  id: "etf",
  label: "Automatic ETF",
  type: "ETF",
  source: "yahoo",
  param: "CW8.PA",
  currency: "EUR",
};

describe("mobile manual price valuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.getItem.mockResolvedValue(null);
    storageMocks.setItem.mockResolvedValue(undefined);
  });

  it("mobile valuation uses the latest workbook price for a manual asset", () => {
    const prices = buildPriceMap(
      [manualAsset],
      { fund: { "2026-07-25": 999 } },
      [
        {
          assetId: "fund",
          date: new Date("2026-07-20T00:00:00.000Z"),
          price: 100,
        },
        {
          assetId: "fund",
          date: new Date("2026-07-25T00:00:00.000Z"),
          price: 125,
        },
        {
          assetId: "fund",
          date: new Date("2026-07-22T00:00:00.000Z"),
          price: 110,
        },
      ],
    );

    expect(prices.get("fund")).toBe(125);
  });

  it("mobile valuation does not fall back to the latest transaction for a manual asset without prices", async () => {
    const transaction: Transaction = {
      date: new Date("2026-07-20T00:00:00.000Z"),
      type: "ACHAT",
      compte: "broker",
      actif: "fund",
      quantite: 1,
      prixUnitaire: 140,
      devise: "EUR",
      frais: 0,
      fraisDevise: "EUR",
    };

    const prices = await priceSync.syncPrices(
      [manualAsset],
      [transaction],
      true,
    );

    expect(prices).not.toHaveProperty("fund");
  });

  it("mobile valuation continues to use the local automatic cache for non-manual assets", () => {
    const prices = buildPriceMap(
      [automaticAsset],
      { etf: { "2026-07-24": 510, "2026-07-25": 515 } },
      [],
    );

    expect(prices.get("etf")).toBe(515);
  });
});
