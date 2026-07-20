import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Asset, Transaction } from "@patrimo/core/schema";
import { latestPrice } from "@patrimo/core/format";
import {
  shouldRunSync,
  DEFAULT_SYNC_INTERVAL_MINUTES,
} from "@patrimo/core/prices/schedule";

const PRICES_STORAGE_KEY = "patrimo:prices";
const LAST_SYNC_KEY = "patrimo:last_sync";
const SYNC_INTERVAL_KEY = "patrimo:sync_interval_minutes";

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

export async function getLastSync(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

async function saveLastSync(): Promise<void> {
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

export async function getSyncInterval(): Promise<number> {
  const raw = await AsyncStorage.getItem(SYNC_INTERVAL_KEY);
  if (!raw) return DEFAULT_SYNC_INTERVAL_MINUTES;
  const n = Number(raw);
  return Number.isFinite(n) ? n : DEFAULT_SYNC_INTERVAL_MINUTES;
}

export async function saveSyncInterval(minutes: number): Promise<void> {
  await AsyncStorage.setItem(SYNC_INTERVAL_KEY, String(minutes));
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

export async function fetchInvestirPrice(isin: string): Promise<number | null> {
  try {
    const url = `https://investir.lesechos.fr/cours/opcvm/-${isin.toLowerCase()}`;
    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "fr-FR,fr;q=0.9",
      },
    });
    if (!res.ok) {
      console.log(`[Prices] investir ${isin}: HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const match = html.match(
      /Valeur liquidative \(\d{2}\/\d{2}(?:\/\d{2,4})?\)[^>]*>(?:[^<]|<(?!div)[^>]*>)*<div[^>]*>([\d,.\s\u00a0\u202f]+)\s*€/,
    );
    if (!match) {
      console.log(`[Prices] investir ${isin}: VL regex no match (page length=${html.length})`);
      return null;
    }
    const cleaned = match[1]
      .replace(/[\s\u00a0\u202f]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
  } catch (e) {
    console.log(`[Prices] investir ${isin}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

export async function fetchZoneboursePrice(url: string): Promise<number | null> {
  try {
    const res = await fetch(url + "/", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "fr-FR,fr;q=0.9",
      },
    });
    if (!res.ok) {
      console.log(`[Prices] zonebourse: HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const match = html.match(/last">\s*([\d\s,.]+)\s*(?:EUR|€)/);
    if (!match) {
      console.log(`[Prices] zonebourse: regex no match (page length=${html.length})`);
      return null;
    }
    const cleaned = match[1]
      .replace(/[\s\u00a0\u202f]/g, "")
      .replace(",", ".");
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : null;
  } catch (e) {
    console.log(`[Prices] zonebourse: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

export async function syncPrices(
  assets: Asset[],
  transactions?: Transaction[],
  force = false,
): Promise<PriceStore> {
  const store = await loadPrices();

  const lastSync = await getLastSync();
  const intervalMinutes = await getSyncInterval();
  const needsSync = shouldRunSync({
    ifStale: !force,
    lastSync,
    now: Date.now(),
    intervalMinutes,
  });

  if (!needsSync) {
    console.log(
      `[Prices] Skipped — last sync ${lastSync}, interval ${intervalMinutes}min`,
    );
    return store;
  }

  const today = new Date().toISOString().slice(0, 10);
  let fetched = 0;

  for (const asset of assets) {
    let price: number | null = null;

    if (asset.source === "coingecko" && asset.param) {
      price = await fetchCryptoPrice(asset.param);
    } else if (asset.source === "yahoo" && asset.param) {
      price = await fetchYahooPrice(asset.param);
    } else if (asset.source === "investir" && (asset.isin || asset.param)) {
      price = await fetchInvestirPrice(asset.isin || asset.param!);
    } else if (asset.source === "zonebourse" && asset.param) {
      price = await fetchZoneboursePrice(asset.param);
    }

    if (price === null && transactions) {
      const lastTx = [...transactions]
        .filter((tx) => tx.actif === asset.id && tx.prixUnitaire && tx.prixUnitaire > 0)
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      if (lastTx?.prixUnitaire) {
        price = lastTx.prixUnitaire;
      }
    }

    if (price !== null) {
      if (!store[asset.id]) store[asset.id] = {};
      store[asset.id][today] = price;
      fetched++;
    } else {
      console.log(`[Prices] MISS ${asset.id} (source=${asset.source})`);
    }
  }

  console.log(`[Prices] Synced ${fetched}/${assets.length} asset prices`);
  await savePrices(store);
  await saveLastSync();
  return store;
}
