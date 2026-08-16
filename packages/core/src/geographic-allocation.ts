import type {
  Asset,
  GeographicAllocation,
  GeographicAllocationSource,
  Workbook,
} from "./schema";

const WEIGHT_SUM_TOLERANCE = 1e-3;

function findAsset(assets: Asset[], assetId: string): Asset {
  const asset = assets.find((candidate) => candidate.id === assetId);
  if (!asset) {
    throw new Error(`Unknown asset: ${assetId}`);
  }
  return asset;
}

function assertValidWeightRows(
  weights: Array<{ country: string; weight: number }>,
): void {
  if (weights.length === 0) {
    throw new Error("Geographic allocation weights cannot be empty");
  }

  let sum = 0;
  for (const row of weights) {
    const country = row.country.trim();
    if (!country) {
      throw new Error("Geographic allocation country is required");
    }
    if (
      typeof row.weight !== "number" ||
      !Number.isFinite(row.weight) ||
      row.weight < 0
    ) {
      throw new Error("Geographic allocation weight must be a non-negative finite number");
    }
    sum += row.weight;
  }

  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new Error(
      `Geographic allocation weights must sum to 1 (got ${sum})`,
    );
  }
}

export function normalizeGeographicAllocations(
  allocations: GeographicAllocation[],
  assets: Asset[],
): GeographicAllocation[] {
  const knownAssets = new Set(assets.map((asset) => asset.id));
  const byAsset = new Map<string, GeographicAllocation[]>();

  for (const entry of allocations) {
    if (!knownAssets.has(entry.assetId)) continue;
    const country = entry.country.trim();
    if (!country) continue;
    if (
      typeof entry.weight !== "number" ||
      !Number.isFinite(entry.weight) ||
      entry.weight < 0
    ) {
      continue;
    }
    if (entry.source !== "justetf" && entry.source !== "manual") continue;

    const rows = byAsset.get(entry.assetId) ?? [];
    rows.push({
      assetId: entry.assetId,
      country,
      weight: entry.weight,
      source: entry.source,
    });
    byAsset.set(entry.assetId, rows);
  }

  const normalized: GeographicAllocation[] = [];
  for (const rows of byAsset.values()) {
    const sum = rows.reduce((total, row) => total + row.weight, 0);
    if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) continue;
    normalized.push(...rows);
  }
  return normalized;
}

export function replaceGeographicAllocation(
  workbook: Workbook,
  assetId: string,
  weights: Array<{ country: string; weight: number }>,
  source: GeographicAllocationSource,
): Workbook {
  findAsset(workbook.assets, assetId);
  assertValidWeightRows(weights);

  const retained = (workbook.geographicAllocations ?? []).filter(
    (entry) => entry.assetId !== assetId,
  );
  const nextRows: GeographicAllocation[] = weights.map((row) => ({
    assetId,
    country: row.country.trim(),
    weight: row.weight,
    source,
  }));

  return {
    ...workbook,
    geographicAllocations: normalizeGeographicAllocations(
      [...retained, ...nextRows],
      workbook.assets,
    ),
  };
}

export function removeGeographicAllocationsForAssets(
  workbook: Workbook,
  assetIds: ReadonlySet<string>,
): Workbook {
  if (assetIds.size === 0) return workbook;
  return {
    ...workbook,
    geographicAllocations: (workbook.geographicAllocations ?? []).filter(
      (entry) => !assetIds.has(entry.assetId),
    ),
  };
}

export function allocationSourceForAsset(
  allocations: GeographicAllocation[],
  assetId: string,
): GeographicAllocationSource | null {
  const row = allocations.find((entry) => entry.assetId === assetId);
  return row?.source ?? null;
}

export function applyFetchedGeographicAllocation(
  workbook: Workbook,
  assetId: string,
  weights: Array<{ country: string; weight: number }>,
  options: { restore?: boolean } = {},
): Workbook {
  const currentSource = allocationSourceForAsset(
    workbook.geographicAllocations ?? [],
    assetId,
  );
  if (currentSource === "manual" && !options.restore) {
    return workbook;
  }
  return replaceGeographicAllocation(workbook, assetId, weights, "justetf");
}
