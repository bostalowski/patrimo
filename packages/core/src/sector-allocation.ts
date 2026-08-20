import type {
	Asset,
	GeographicAllocationSource,
	SectorAllocation,
	Workbook,
} from "./schema";
import {
	GEOGRAPHIC_WEIGHT_SUM_TOLERANCE,
	isValidGeographicWeightSum,
} from "./geographic-allocation";
import { isSectorKey, normalizeSectorKey } from "./sector-exposure";

export {
	GEOGRAPHIC_WEIGHT_SUM_TOLERANCE as SECTOR_WEIGHT_SUM_TOLERANCE,
	isValidGeographicWeightSum as isValidSectorWeightSum,
} from "./geographic-allocation";

export function sumSectorDraftWeightPercents(
	weightPercents: readonly string[],
): number {
	return weightPercents.reduce((total, raw) => {
		const trimmed = raw.trim();
		if (!trimmed) return total;
		const value = Number(trimmed.replace(",", "."));
		return Number.isFinite(value) ? total + value : total;
	}, 0);
}

export function isIncompleteSectorDraftSum(
	sumPercent: number,
	tolerance = 0.1,
): boolean {
	return sumPercent > 0 && Math.abs(sumPercent - 100) > tolerance;
}

function findAsset(assets: Asset[], assetId: string): Asset {
	const asset = assets.find((candidate) => candidate.id === assetId);
	if (!asset) {
		throw new Error(`Unknown asset: ${assetId}`);
	}
	return asset;
}

function assertValidWeightRows(
	weights: Array<{ sector: string; weight: number }>,
): void {
	if (weights.length === 0) {
		throw new Error("Sector allocation weights cannot be empty");
	}

	let sum = 0;
	for (const row of weights) {
		const sector = normalizeSectorKey(row.sector);
		if (!isSectorKey(sector)) {
			throw new Error(`Invalid sector allocation key: ${row.sector}`);
		}
		if (
			typeof row.weight !== "number" ||
			!Number.isFinite(row.weight) ||
			row.weight < 0
		) {
			throw new Error("Sector allocation weight must be a non-negative finite number");
		}
		sum += row.weight;
	}

	if (!isValidGeographicWeightSum(sum)) {
		throw new Error(
			sum > 1 + GEOGRAPHIC_WEIGHT_SUM_TOLERANCE
				? `Sector allocation weights must not exceed 1 (got ${sum})`
				: `Sector allocation weights must sum to a positive amount (got ${sum})`,
		);
	}
}

export function normalizeSectorAllocations(
	allocations: SectorAllocation[],
	assets: Asset[],
): SectorAllocation[] {
	const knownAssets = new Set(assets.map((asset) => asset.id));
	const byAsset = new Map<string, SectorAllocation[]>();

	for (const entry of allocations) {
		if (!knownAssets.has(entry.assetId)) continue;
		const sector = normalizeSectorKey(entry.sector);
		if (!isSectorKey(sector)) continue;
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
			sector,
			weight: entry.weight,
			source: entry.source,
		});
		byAsset.set(entry.assetId, rows);
	}

	const normalized: SectorAllocation[] = [];
	for (const rows of byAsset.values()) {
		const sum = rows.reduce((total, row) => total + row.weight, 0);
		if (!isValidGeographicWeightSum(sum)) continue;
		normalized.push(...rows);
	}
	return normalized;
}

export function replaceSectorAllocation(
	workbook: Workbook,
	assetId: string,
	weights: Array<{ sector: string; weight: number }>,
	source: GeographicAllocationSource,
): Workbook {
	findAsset(workbook.assets, assetId);
	assertValidWeightRows(weights);

	const retained = (workbook.sectorAllocations ?? []).filter(
		(entry) => entry.assetId !== assetId,
	);
	const nextRows: SectorAllocation[] = weights.map((row) => ({
		assetId,
		sector: normalizeSectorKey(row.sector),
		weight: row.weight,
		source,
	}));

	return {
		...workbook,
		sectorAllocations: normalizeSectorAllocations(
			[...retained, ...nextRows],
			workbook.assets,
		),
	};
}

export function removeSectorAllocationsForAssets(
	workbook: Workbook,
	assetIds: ReadonlySet<string>,
): Workbook {
	if (assetIds.size === 0) return workbook;
	return {
		...workbook,
		sectorAllocations: (workbook.sectorAllocations ?? []).filter(
			(entry) => !assetIds.has(entry.assetId),
		),
	};
}

export function sectorAllocationSourceForAsset(
	allocations: SectorAllocation[],
	assetId: string,
): GeographicAllocationSource | null {
	const row = allocations.find((entry) => entry.assetId === assetId);
	return row?.source ?? null;
}

export function applyFetchedSectorAllocation(
	workbook: Workbook,
	assetId: string,
	weights: Array<{ sector: string; weight: number }>,
	options: { restore?: boolean } = {},
): Workbook {
	const currentSource = sectorAllocationSourceForAsset(
		workbook.sectorAllocations ?? [],
		assetId,
	);
	if (currentSource === "manual" && !options.restore) {
		return workbook;
	}
	return replaceSectorAllocation(workbook, assetId, weights, "justetf");
}
