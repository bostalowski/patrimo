import type { AssetPriceHistory } from "@/lib/store";

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

type ChartResponse = {
  chart: {
    result?: Array<{
      timestamp: number[];
      indicators: { quote: Array<{ close: (number | null)[] }> };
      meta: { regularMarketPrice?: number };
    }>;
    error?: { description?: string } | null;
  };
};

function toIsoDate(timestampSec: number): string {
  return new Date(timestampSec * 1000).toISOString().slice(0, 10);
}

async function fetchChart(
  symbol: string,
  range: string,
  interval: string,
): Promise<ChartResponse> {
  const url = `${BASE_URL}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) financial-graphs/0.1",
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Yahoo ${symbol}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ChartResponse;
}

export async function fetchYahooHistory(
  symbol: string,
  range = "1y",
): Promise<AssetPriceHistory> {
  const data = await fetchChart(symbol, range, "1d");
  const result = data.chart.result?.[0];
  if (!result) {
    throw new Error(`Yahoo ${symbol}: empty result`);
  }
  const closes = result.indicators.quote[0]?.close ?? [];
  const history: AssetPriceHistory = {};
  result.timestamp.forEach((ts, i) => {
    const price = closes[i];
    if (typeof price === "number") {
      history[toIsoDate(ts)] = price;
    }
  });
  return history;
}

export async function fetchYahooSpot(symbol: string): Promise<number> {
  const data = await fetchChart(symbol, "1d", "1d");
  const meta = data.chart.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== "number") {
    throw new Error(`Yahoo ${symbol}: no spot price in response`);
  }
  return meta.regularMarketPrice;
}
