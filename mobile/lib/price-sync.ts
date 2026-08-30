import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Asset, ManualPrice, Transaction } from "@patrimo/core/schema";
import { latestPrice } from "@patrimo/core/format";
import { latestManualPrice } from "@patrimo/core/manual-prices";
import {
  shouldRunSync,
  DEFAULT_SYNC_INTERVAL_MINUTES,
} from "@patrimo/core/prices/schedule";
import { syncLivretRates } from "./livret-rates";

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

export async function removeAssetsFromPriceCache(
  assetIds: string[],
): Promise<void> {
  if (assetIds.length === 0) return;

  const deletedAssetIds = new Set(assetIds);
  const prices = await loadPrices();
  const retainedPrices = Object.fromEntries(
    Object.entries(prices).filter(
      ([assetId]) => !deletedAssetIds.has(assetId),
    ),
  );
  await savePrices(retainedPrices);
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
  manualPrices: ManualPrice[] = [],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const asset of assets) {
    if (asset.source === "manual") {
      const value = latestManualPrice(manualPrices, asset.id);
      if (value !== null) map.set(asset.id, value);
      continue;
    }
    const value = latestPrice(prices[asset.id]);
    if (value !== null) map.set(asset.id, value);
  }
  return map;
}

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

const BROWSER_HEADERS: HeadersInit = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "fr-FR,fr;q=0.9",
};

const INVESTIR_VL_REGEX =
  /Valeur liquidative \((\d{2}\/\d{2})(?:\/\d{2,4})?\)[^>]*>(?:[^<]|<(?!div)[^>]*>)*<div[^>]*>([\d,.\s\u00a0\u202f]+)\s*€/;
const ZONEBOURSE_DATE_REGEX = /March[eé].*?(\d{2})\/(\d{2})\/(\d{4})/s;
const ZONEBOURSE_PRICE_REGEX =
  /class="last\s+txt-bold\s+js-last[^"]*"[^>]*>([\d,.\s\u00a0\u202f]+)<\/span>/;

function toIsoDateFromMs(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function toIsoDateFromSec(timestampSec: number): string {
  return new Date(timestampSec * 1000).toISOString().slice(0, 10);
}

function parseFrenchNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/[\s\u00a0\u202f]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function toIsoFromFrenchDayMonth(dayMonth: string): string {
  const [day, month] = dayMonth.split("/").map((s) => parseInt(s, 10));
  const now = new Date();
  let year = now.getUTCFullYear();
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getTime() > now.getTime() + 86_400_000) {
    year -= 1;
  }
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

export async function fetchYahooHistory(
  symbol: string,
  range = "5y",
): Promise<Record<string, number> | null> {
  try {
    const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?range=${range}&interval=1d`;
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) patrimo/0.1",
        accept: "application/json",
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close;
    const timestamps = result?.timestamp;
    if (!Array.isArray(closes) || !Array.isArray(timestamps)) return null;
    const history: Record<string, number> = {};
    timestamps.forEach((ts: number, i: number) => {
      const price = closes[i];
      if (typeof price === "number") {
        history[toIsoDateFromSec(ts)] = price;
      }
    });
    return Object.keys(history).length > 0 ? history : null;
  } catch (e) {
    console.log(`[Prices] yahoo history: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

export async function fetchCoingeckoHistory(
  coinId: string,
  days = 365,
): Promise<Record<string, number> | null> {
  try {
    const url = `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=eur&days=${days}&interval=daily`;
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data?.prices)) return null;
    const history: Record<string, number> = {};
    for (const [ts, price] of data.prices) {
      if (typeof price === "number") {
        history[toIsoDateFromMs(ts)] = price;
      }
    }
    return Object.keys(history).length > 0 ? history : null;
  } catch (e) {
    console.log(
      `[Prices] coingecko history: ${e instanceof Error ? e.message : e}`,
    );
    return null;
  }
}

export async function fetchInvestirHistory(
  isin: string,
): Promise<Record<string, number> | null> {
  try {
    const url = `https://investir.lesechos.fr/cours/opcvm/-${isin.toLowerCase()}`;
    const res = await fetch(url, { headers: BROWSER_HEADERS });
    if (!res.ok) {
      console.log(`[Prices] investir ${isin}: HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const match = html.match(INVESTIR_VL_REGEX);
    if (!match) {
      console.log(
        `[Prices] investir ${isin}: VL regex no match (page length=${html.length})`,
      );
      return null;
    }
    const price = parseFrenchNumber(match[2]);
    if (price === null) return null;
    return { [toIsoFromFrenchDayMonth(match[1])]: price };
  } catch (e) {
    console.log(
      `[Prices] investir ${isin}: ${e instanceof Error ? e.message : e}`,
    );
    return null;
  }
}

export async function fetchZonebourseHistory(
  pageUrl: string,
): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(pageUrl.endsWith("/") ? pageUrl : `${pageUrl}/`, {
      headers: BROWSER_HEADERS,
    });
    if (!res.ok) {
      console.log(`[Prices] zonebourse: HTTP ${res.status}`);
      return null;
    }
    const html = await res.text();
    const dateMatch = html.match(ZONEBOURSE_DATE_REGEX);
    const priceMatch = html.match(ZONEBOURSE_PRICE_REGEX);
    if (!dateMatch || !priceMatch) {
      console.log(
        `[Prices] zonebourse: regex no match (page length=${html.length})`,
      );
      return null;
    }
    const [, day, month, year] = dateMatch;
    const price = parseFrenchNumber(priceMatch[1]);
    if (price === null) return null;
    return { [`${year}-${month}-${day}`]: price };
  } catch (e) {
    console.log(`[Prices] zonebourse: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function fetchHistoryForAsset(
  asset: Asset,
): Promise<Record<string, number> | null> {
  switch (asset.source) {
    case "yahoo":
      return asset.param ? fetchYahooHistory(asset.param) : null;
    case "coingecko":
      return asset.param ? fetchCoingeckoHistory(asset.param) : null;
    case "investir": {
      const isin = asset.isin || asset.param;
      return isin ? fetchInvestirHistory(isin) : null;
    }
    case "zonebourse":
      return asset.param ? fetchZonebourseHistory(asset.param) : null;
    default:
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
    if (asset.source === "manual") {
      continue;
    }

    const history = await fetchHistoryForAsset(asset);
    if (history) {
      store[asset.id] = { ...(store[asset.id] ?? {}), ...history };
      fetched++;
      continue;
    }

    let fallback: number | null = null;
    if (transactions) {
      const lastTx = [...transactions]
        .filter(
          (tx) =>
            tx.actif === asset.id && tx.prixUnitaire && tx.prixUnitaire > 0,
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
      if (lastTx?.prixUnitaire) {
        fallback = lastTx.prixUnitaire;
      }
    }

    if (fallback !== null) {
      if (!store[asset.id]) store[asset.id] = {};
      store[asset.id][today] = fallback;
      fetched++;
    } else {
      console.log(`[Prices] MISS ${asset.id} (source=${asset.source})`);
    }
  }

  console.log(`[Prices] Synced ${fetched}/${assets.length} asset prices`);
  await savePrices(store);
  await saveLastSync();

  // Same gesture as web: attempt livret rate cache merge without failing prices (D9).
  const livretRates = await syncLivretRates();
  if (livretRates.status === "error") {
    console.log(`[LivretRates] sync skipped: ${livretRates.error}`);
  } else {
    console.log(
      `[LivretRates] cache ${livretRates.steps} paliers (+${livretRates.added})`,
    );
  }

  return store;
}
