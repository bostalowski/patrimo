import type { Asset, ManualPrice, Workbook } from "./schema";

function sameCalendarDate(left: Date, right: Date): boolean {
  return (
    Number.isFinite(left.getTime()) &&
    Number.isFinite(right.getTime()) &&
    left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10)
  );
}

function isCalendarDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function isFutureDate(value: Date, now = new Date()): boolean {
  return value.toISOString().slice(0, 10) > now.toISOString().slice(0, 10);
}

function isPositiveFinitePrice(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function findManualAsset(assets: Asset[], assetId: string): Asset {
  const asset = assets.find((candidate) => candidate.id === assetId);
  if (!asset) {
    throw new Error(`Unknown asset: ${assetId}`);
  }
  if (asset.source !== "manual") {
    throw new Error(`Asset ${assetId} does not use a manual price source`);
  }
  return asset;
}

function assertPersistableManualPrice(
  assets: Asset[],
  manualPrice: ManualPrice,
  now = new Date(),
): void {
  findManualAsset(assets, manualPrice.assetId);

  if (!isCalendarDate(manualPrice.date)) {
    throw new Error("Manual price date is invalid");
  }
  if (isFutureDate(manualPrice.date, now)) {
    throw new Error("Manual price date cannot be in the future");
  }
  if (!isPositiveFinitePrice(manualPrice.price)) {
    throw new Error("Manual price must be a positive finite number");
  }
}

export function normalizeManualPrices(
  manualPrices: ManualPrice[],
  assets: Asset[],
  now = new Date(),
): ManualPrice[] {
  const knownManualAssets = new Set(
    assets
      .filter((asset) => asset.source === "manual")
      .map((asset) => asset.id),
  );
  const byKey = new Map<string, ManualPrice>();

  for (const entry of manualPrices) {
    if (!knownManualAssets.has(entry.assetId)) continue;
    if (!isCalendarDate(entry.date)) continue;
    if (isFutureDate(entry.date, now)) continue;
    if (!isPositiveFinitePrice(entry.price)) continue;

    const key = `${entry.assetId}|${entry.date.toISOString().slice(0, 10)}`;
    byKey.set(key, entry);
  }

  return [...byKey.values()];
}

export function upsertManualPrice(
  workbook: Workbook,
  manualPrice: ManualPrice,
  now = new Date(),
): Workbook {
  assertPersistableManualPrice(workbook.assets, manualPrice, now);

  const nextPrices = workbook.manualPrices.filter(
    (entry) =>
      !(
        entry.assetId === manualPrice.assetId &&
        sameCalendarDate(entry.date, manualPrice.date)
      ),
  );
  nextPrices.push(manualPrice);

  return {
    ...workbook,
    manualPrices: normalizeManualPrices(nextPrices, workbook.assets, now),
  };
}

export function deleteManualPrice(
  workbook: Workbook,
  assetId: string,
  date: Date,
): Workbook {
  return {
    ...workbook,
    manualPrices: workbook.manualPrices.filter(
      (entry) =>
        !(entry.assetId === assetId && sameCalendarDate(entry.date, date)),
    ),
  };
}

export function removeManualPricesForAssets(
  workbook: Workbook,
  assetIds: ReadonlySet<string>,
): Workbook {
  if (assetIds.size === 0) return workbook;
  return {
    ...workbook,
    manualPrices: (workbook.manualPrices ?? []).filter(
      (entry) => !assetIds.has(entry.assetId),
    ),
  };
}

export function latestManualPrice(
  manualPrices: ManualPrice[],
  assetId: string,
): number | null {
  let latest: ManualPrice | null = null;
  for (const entry of manualPrices) {
    if (entry.assetId !== assetId) continue;
    if (!latest || entry.date.getTime() > latest.date.getTime()) {
      latest = entry;
    }
  }
  return latest?.price ?? null;
}

export function manualPricesToPriceStore(
  manualPrices: ManualPrice[],
): Record<string, Record<string, number>> {
  const store: Record<string, Record<string, number>> = {};
  for (const entry of manualPrices) {
    const dateKey = entry.date.toISOString().slice(0, 10);
    store[entry.assetId] = {
      ...(store[entry.assetId] ?? {}),
      [dateKey]: entry.price,
    };
  }
  return store;
}
