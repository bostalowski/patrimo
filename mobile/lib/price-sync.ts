import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Asset } from "@patrimo/core/schema";

const PRICES_STORAGE_KEY = "patrimo:prices";

export type PriceStore = Record<string, Record<string, number>>;

export async function loadPrices(): Promise<PriceStore> {
  const raw = await AsyncStorage.getItem(PRICES_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function savePrices(store: PriceStore): Promise<void> {
  await AsyncStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(store));
}

export function latestPrice(
  history: Record<string, number> | undefined,
): number | null {
  if (!history) return null;
  const dates = Object.keys(history).sort();
  if (dates.length === 0) return null;
  return history[dates[dates.length - 1]];
}

export function buildPriceMap(
  assets: Asset[],
  prices: PriceStore,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const asset of assets) {
    const value = latestPrice(prices[asset.id]);
    if (value !== null) map.set(asset.id, value);
  }
  return map;
}

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

export async function fetchCryptoPrice(coinId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `${COINGECKO_BASE}/simple/price?ids=${coinId}&vs_currencies=eur`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data[coinId]?.eur ?? null;
  } catch {
    return null;
  }
}

export async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!Array.isArray(closes) || closes.length === 0) return null;
    for (let i = closes.length - 1; i >= 0; i--) {
      if (typeof closes[i] === "number") return closes[i];
    }
    return null;
  } catch {
    return null;
  }
}

export async function syncPrices(assets: Asset[]): Promise<PriceStore> {
  const store = await loadPrices();
  const today = new Date().toISOString().slice(0, 10);

  for (const asset of assets) {
    let price: number | null = null;

    if (asset.source === "coingecko" && asset.param) {
      price = await fetchCryptoPrice(asset.param);
    } else if (asset.source === "yahoo" && asset.param) {
      price = await fetchYahooPrice(asset.param);
    }

    if (price !== null) {
      if (!store[asset.id]) store[asset.id] = {};
      store[asset.id][today] = price;
    }
  }

  await savePrices(store);
  return store;
}
