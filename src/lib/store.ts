import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Asset, DcaConfig, Envelope } from "@/lib/schema";
import { ExpectedReturns, RetirementProfile } from "@/lib/schema";
import { getDcaConfigs, saveDcaConfigs } from "@/lib/excel";
import { latestPrice } from "@patrimo/core/format";
import { z } from "zod";

const DATA_DIR = process.env.FINGRAPHS_DATA_DIR
  ? resolve(process.env.FINGRAPHS_DATA_DIR)
  : resolve(process.cwd(), "data");
const PRICES_FILE = resolve(DATA_DIR, "prices.json");
const MANUAL_PRICES_FILE = resolve(DATA_DIR, "manual-prices.json");
const BENCHMARKS_FILE = resolve(DATA_DIR, "benchmarks.json");
const EXPECTED_RETURNS_FILE = resolve(DATA_DIR, "expected-returns.json");
const RETIREMENT_PROFILE_FILE = resolve(DATA_DIR, "retirement-profile.json");
const SYNC_META_FILE = resolve(DATA_DIR, "sync-meta.json");

export type AssetPriceHistory = Record<string, number>;
export type PriceStore = Record<string, AssetPriceHistory>;

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2) + "\n", "utf-8");
}

export async function readPrices(): Promise<PriceStore> {
  return readJson<PriceStore>(PRICES_FILE, {});
}

export async function writePrices(store: PriceStore): Promise<void> {
  await writeJson(PRICES_FILE, store);
}

export async function readManualPrices(): Promise<PriceStore> {
  return readJson<PriceStore>(MANUAL_PRICES_FILE, {});
}

export async function writeManualPrices(store: PriceStore): Promise<void> {
  await writeJson(MANUAL_PRICES_FILE, store);
}

function withoutAssets(
  store: PriceStore,
  assetIds: ReadonlySet<string>,
): PriceStore {
  return Object.fromEntries(
    Object.entries(store).filter(([assetId]) => !assetIds.has(assetId)),
  );
}

export async function removeAssetsFromPriceCaches(
  assetIds: string[],
): Promise<void> {
  if (assetIds.length === 0) return;

  const deletedAssetIds = new Set(assetIds);
  const [prices, manualPrices] = await Promise.all([
    readPrices(),
    readManualPrices(),
  ]);

  await Promise.all([
    writePrices(withoutAssets(prices, deletedAssetIds)),
    writeManualPrices(withoutAssets(manualPrices, deletedAssetIds)),
  ]);
}

export async function readBenchmarks(): Promise<PriceStore> {
  return readJson<PriceStore>(BENCHMARKS_FILE, {});
}

export async function writeBenchmarks(store: PriceStore): Promise<void> {
  await writeJson(BENCHMARKS_FILE, store);
}

export type SyncMeta = { lastSync: string | null };

export async function readSyncMeta(): Promise<SyncMeta> {
  return readJson<SyncMeta>(SYNC_META_FILE, { lastSync: null });
}

export async function writeSyncMeta(meta: SyncMeta): Promise<void> {
  await writeJson(SYNC_META_FILE, meta);
}

export async function readPriceMap(assets: Asset[]): Promise<Map<string, number>> {
  const [prices, manual] = await Promise.all([readPrices(), readManualPrices()]);
  const map = new Map<string, number>();
  for (const asset of assets) {
    const source = asset.source === "manual" ? manual : prices;
    const value = latestPrice(source[asset.id]);
    if (value !== null) map.set(asset.id, value);
  }
  return map;
}

export async function readDcaConfigs(): Promise<DcaConfig[]> {
  return getDcaConfigs();
}

export async function writeDcaConfigs(configs: DcaConfig[]): Promise<void> {
  saveDcaConfigs(configs);
}

export async function readExpectedReturns(): Promise<
  Partial<Record<Envelope, number>>
> {
  const raw = await readJson<unknown>(EXPECTED_RETURNS_FILE, { rates: {} });
  const parsed = ExpectedReturns.safeParse(raw);
  if (!parsed.success) return {};
  return parsed.data.rates as Partial<Record<Envelope, number>>;
}

const RetirementProfileStoreSchema = z.object({
  profile: RetirementProfile,
});

export async function readRetirementProfile(): Promise<RetirementProfile> {
  const raw = await readJson<unknown>(RETIREMENT_PROFILE_FILE, {});
  const parsed = RetirementProfileStoreSchema.safeParse(raw);
  if (parsed.success) return parsed.data.profile;
  const flat = RetirementProfile.safeParse(raw);
  if (flat.success) return flat.data;
  return RetirementProfile.parse({});
}

export async function writeRetirementProfile(
  profile: RetirementProfile,
): Promise<void> {
  await writeJson(RETIREMENT_PROFILE_FILE, { profile });
}
