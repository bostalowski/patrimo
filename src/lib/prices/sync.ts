import type { Asset } from "@/lib/schema";
import { readPrices, writePrices, type PriceStore } from "@/lib/store";
import { fetchCoingeckoHistory } from "@/lib/prices/coingecko";
import { fetchYahooHistory } from "@/lib/prices/yahoo";
import { fetchInvestirHistory } from "@/lib/prices/investir";

export type SyncResult = {
  asset: string;
  source: string;
  status: "ok" | "skipped" | "error";
  pointsAdded?: number;
  error?: string;
};

async function fetchHistoryForAsset(
  asset: Asset,
): Promise<Record<string, number> | null> {
  if (!asset.param) return null;
  switch (asset.source) {
    case "coingecko":
      return fetchCoingeckoHistory(asset.param);
    case "yahoo":
      return fetchYahooHistory(asset.param);
    case "investir":
      return fetchInvestirHistory(asset.param);
    case "manual":
      return null;
    default:
      return null;
  }
}

export async function syncPrices(assets: Asset[]): Promise<SyncResult[]> {
  const store: PriceStore = await readPrices();
  const results: SyncResult[] = [];

  for (const asset of assets) {
    if (asset.source === "manual") {
      results.push({ asset: asset.id, source: asset.source, status: "skipped" });
      continue;
    }
    try {
      const history = await fetchHistoryForAsset(asset);
      if (!history) {
        results.push({ asset: asset.id, source: asset.source, status: "skipped" });
        continue;
      }
      const existing = store[asset.id] ?? {};
      const merged = { ...existing, ...history };
      store[asset.id] = merged;
      const added =
        Object.keys(merged).length - Object.keys(existing).length;
      results.push({
        asset: asset.id,
        source: asset.source,
        status: "ok",
        pointsAdded: added,
      });
    } catch (err) {
      results.push({
        asset: asset.id,
        source: asset.source,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await writePrices(store);
  return results;
}
