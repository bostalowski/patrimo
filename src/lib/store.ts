import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Asset } from "@/lib/schema";

const DATA_DIR = process.env.FINGRAPHS_DATA_DIR
  ? resolve(process.env.FINGRAPHS_DATA_DIR)
  : resolve(process.cwd(), "data");
const PRICES_FILE = resolve(DATA_DIR, "prices.json");
const MANUAL_PRICES_FILE = resolve(DATA_DIR, "manual-prices.json");

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
