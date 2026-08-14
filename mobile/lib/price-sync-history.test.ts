import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Asset } from "@patrimo/core/schema";
import * as priceSync from "./price-sync";

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: storageMocks,
}));

const yahooAsset: Asset = {
  id: "etf",
  label: "CW8",
  type: "ETF",
  source: "yahoo",
  param: "CW8.PA",
  currency: "EUR",
};

const cryptoAsset: Asset = {
  id: "btc",
  label: "Bitcoin",
  type: "CRYPTO",
  source: "coingecko",
  param: "bitcoin",
  currency: "EUR",
};

const investirAsset: Asset = {
  id: "opcvm",
  label: "Fund",
  type: "OPCVM",
  source: "investir",
  isin: "FR0000000001",
  currency: "EUR",
};

const zonebourseAsset: Asset = {
  id: "zb",
  label: "ZB Fund",
  type: "OPCVM",
  source: "zonebourse",
  param: "https://www.zonebourse.com/cours/foo",
  currency: "EUR",
};

const manualAsset: Asset = {
  id: "fund",
  label: "Employee fund",
  type: "FCPE",
  source: "manual",
  currency: "EUR",
};

function yahooHistoryBody() {
  return {
    chart: {
      result: [
        {
          timestamp: [
            Date.parse("2024-01-02T00:00:00.000Z") / 1000,
            Date.parse("2024-01-03T00:00:00.000Z") / 1000,
            Date.parse("2024-06-01T00:00:00.000Z") / 1000,
          ],
          indicators: { quote: [{ close: [100, 105, 120] }] },
        },
      ],
    },
  };
}

function coingeckoHistoryBody() {
  return {
    prices: [
      [Date.parse("2024-02-01T00:00:00.000Z"), 40_000],
      [Date.parse("2024-02-02T00:00:00.000Z"), 41_000],
    ],
  };
}

describe("mobile historical price sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.getItem.mockResolvedValue(null);
    storageMocks.setItem.mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("merges full yahoo history into the price store instead of spot-only for today", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => yahooHistoryBody(),
      text: async () => "",
    } as Response);

    const store = await priceSync.syncPrices([yahooAsset], undefined, true);

    expect(store.etf).toMatchObject({
      "2024-01-02": 100,
      "2024-01-03": 105,
      "2024-06-01": 120,
    });
    expect(Object.keys(store.etf).length).toBeGreaterThanOrEqual(3);
  });

  it("fetches history for coingecko, investir, and zonebourse sources", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("coingecko.com") && url.includes("market_chart")) {
        return {
          ok: true,
          json: async () => coingeckoHistoryBody(),
          text: async () => "",
        } as Response;
      }
      if (url.includes("investir.lesechos.fr")) {
        return {
          ok: true,
          json: async () => ({}),
          text: async () =>
            `Valeur liquidative (15/03)</span><div>1 234,56 €</div>`,
        } as Response;
      }
      if (url.includes("zonebourse.com")) {
        return {
          ok: true,
          json: async () => ({}),
          text: async () =>
            `Marché 10/04/2024<span class="last txt-bold js-last">98,50</span>`,
        } as Response;
      }
      return { ok: false, json: async () => ({}), text: async () => "" } as Response;
    });

    const store = await priceSync.syncPrices(
      [cryptoAsset, investirAsset, zonebourseAsset],
      undefined,
      true,
    );

    expect(store.btc).toMatchObject({
      "2024-02-01": 40_000,
      "2024-02-02": 41_000,
    });
    expect(store.opcvm).toBeDefined();
    expect(Object.keys(store.opcvm).length).toBeGreaterThanOrEqual(1);
    expect(store.zb).toBeDefined();
    expect(Object.keys(store.zb).length).toBeGreaterThanOrEqual(1);
  });

  it("skips manual assets during historical sync", async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => yahooHistoryBody(),
      text: async () => "",
    } as Response);

    const store = await priceSync.syncPrices(
      [manualAsset, yahooAsset],
      undefined,
      true,
    );

    expect(store).not.toHaveProperty("fund");
    expect(store.etf).toBeDefined();
    expect(
      fetchMock.mock.calls.every(
        (call) => !String(call[0]).includes("manual"),
      ),
    ).toBe(true);
  });
});
