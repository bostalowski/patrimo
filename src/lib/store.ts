import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Asset, DcaConfig, Envelope } from "@/lib/schema";
import {
  DcaConfig as DcaConfigSchema,
  ExpectedReturns,
  RetirementProfile,
} from "@/lib/schema";
import { z } from "zod";

const DATA_DIR = process.env.FINGRAPHS_DATA_DIR
  ? resolve(process.env.FINGRAPHS_DATA_DIR)
  : resolve(process.cwd(), "data");
const PRICES_FILE = resolve(DATA_DIR, "prices.json");
const MANUAL_PRICES_FILE = resolve(DATA_DIR, "manual-prices.json");
const BENCHMARKS_FILE = resolve(DATA_DIR, "benchmarks.json");
const DCA_CONFIGS_FILE = resolve(DATA_DIR, "dca-configs.json");
const EXPECTED_RETURNS_FILE = resolve(DATA_DIR, "expected-returns.json");
const RETIREMENT_PROFILE_FILE = resolve(DATA_DIR, "retirement-profile.json");

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

export async function readBenchmarks(): Promise<PriceStore> {
  return readJson<PriceStore>(BENCHMARKS_FILE, {});
}

export async function writeBenchmarks(store: PriceStore): Promise<void> {
  await writeJson(BENCHMARKS_FILE, store);
}

function latestPrice(history: AssetPriceHistory | undefined): number | null {
  if (!history) return null;
  const dates = Object.keys(history).sort();
  if (dates.length === 0) return null;
  return history[dates[dates.length - 1]];
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

const DcaStoreSchema = z.object({
  configs: z.array(DcaConfigSchema),
});

export async function readDcaConfigs(): Promise<DcaConfig[]> {
  const raw = await readJson<unknown>(DCA_CONFIGS_FILE, { configs: [] });
  const parsed = DcaStoreSchema.safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data.configs;
}

export async function writeDcaConfigs(configs: DcaConfig[]): Promise<void> {
  await writeJson(DCA_CONFIGS_FILE, { configs });
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
