import type { AssetPriceHistory } from "@/lib/store";

const BASE_URL = "https://api.coingecko.com/api/v3";

type MarketChartResponse = {
  prices: [number, number][];
};

function buildHeaders(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-demo-api-key": key, accept: "application/json" } : { accept: "application/json" };
}

function toIsoDate(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

export async function fetchCoingeckoHistory(
  coinId: string,
  days = 365,
): Promise<AssetPriceHistory> {
  const url = `${BASE_URL}/coins/${coinId}/market_chart?vs_currency=eur&days=${days}&interval=daily`;
  const res = await fetch(url, { headers: buildHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CoinGecko ${coinId}: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as MarketChartResponse;
  const history: AssetPriceHistory = {};
  for (const [ts, price] of json.prices) {
    history[toIsoDate(ts)] = price;
  }
  return history;
}

export async function fetchCoingeckoSpot(coinId: string): Promise<number> {
  const url = `${BASE_URL}/simple/price?ids=${coinId}&vs_currencies=eur`;
  const res = await fetch(url, { headers: buildHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`CoinGecko spot ${coinId}: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as Record<string, { eur?: number }>;
  const eur = json[coinId]?.eur;
  if (typeof eur !== "number") {
    throw new Error(`CoinGecko spot ${coinId}: no EUR price in response`);
  }
  return eur;
}
