import type { SectorAllocation } from "./schema";
import { isValidGeographicWeightSum } from "./geographic-allocation";

export type SectorKey =
	| "ENERGY"
	| "MATERIALS"
	| "INDUSTRIALS"
	| "CONSUMER_DISCRETIONARY"
	| "CONSUMER_STAPLES"
	| "HEALTH_CARE"
	| "FINANCIALS"
	| "INFORMATION_TECHNOLOGY"
	| "COMMUNICATION_SERVICES"
	| "UTILITIES"
	| "REAL_ESTATE"
	| "OTHER";

export const PRODUCT_SECTOR_KEYS: SectorKey[] = [
	"ENERGY",
	"MATERIALS",
	"INDUSTRIALS",
	"CONSUMER_DISCRETIONARY",
	"CONSUMER_STAPLES",
	"HEALTH_CARE",
	"FINANCIALS",
	"INFORMATION_TECHNOLOGY",
	"COMMUNICATION_SERVICES",
	"UTILITIES",
	"REAL_ESTATE",
	"OTHER",
];

export const SECTOR_LABELS: Record<SectorKey, string> = {
	ENERGY: "Énergie",
	MATERIALS: "Matériaux",
	INDUSTRIALS: "Industrie",
	CONSUMER_DISCRETIONARY: "Consommation discrétionnaire",
	CONSUMER_STAPLES: "Consommation de base",
	HEALTH_CARE: "Soins de santé",
	FINANCIALS: "Finance",
	INFORMATION_TECHNOLOGY: "Technologie",
	COMMUNICATION_SERVICES: "Services de communication",
	UTILITIES: "Services aux collectivités",
	REAL_ESTATE: "Immobilier",
	OTHER: "Autre",
};

export function normalizeSectorKey(key: string): string {
	return key.trim().toUpperCase();
}

export function isSectorKey(key: string): boolean {
	return (PRODUCT_SECTOR_KEYS as string[]).includes(normalizeSectorKey(key));
}

export function sectorLabel(key: string): string {
	const normalized = normalizeSectorKey(key);
	return SECTOR_LABELS[normalized as SectorKey] ?? key;
}

export type SectorSlice = {
	key: string;
	marketValue: number;
	weight: number;
};

export type SectorExposure = {
	sectors: SectorSlice[];
	coveredMarketValue: number;
};

type PositionInput = {
	assetId: string;
	marketValue: number;
};

function allocationsByAsset(
	allocations: SectorAllocation[],
): Map<string, SectorAllocation[]> {
	const byAsset = new Map<string, SectorAllocation[]>();
	for (const entry of allocations) {
		const rows = byAsset.get(entry.assetId) ?? [];
		rows.push(entry);
		byAsset.set(entry.assetId, rows);
	}
	return byAsset;
}

function isValidAllocation(rows: SectorAllocation[]): boolean {
	if (rows.length === 0) return false;
	const sum = rows.reduce((total, row) => total + row.weight, 0);
	return isValidGeographicWeightSum(sum);
}

export function lookThroughSectorWeights(
	weights: Array<{ sector: string; weight: number }>,
): Array<{ sector: string; weight: number }> {
	return weights
		.map((row) => ({
			sector: normalizeSectorKey(row.sector),
			weight: row.weight,
		}))
		.filter((row) => isSectorKey(row.sector) && row.sector !== "OTHER" && row.weight > 0);
}

function toSortedSlices(
	totals: Map<string, number>,
	coveredMarketValue: number,
): SectorSlice[] {
	if (coveredMarketValue <= 0) return [];
	return [...totals.entries()]
		.map(([key, marketValue]) => ({
			key,
			marketValue,
			weight: marketValue / coveredMarketValue,
		}))
		.sort(
			(a, b) =>
				b.marketValue - a.marketValue || a.key.localeCompare(b.key),
		);
}

export function aggregateSectorExposure(
	positions: PositionInput[],
	allocations: SectorAllocation[],
): SectorExposure {
	const byAsset = allocationsByAsset(allocations);
	const sectorTotals = new Map<string, number>();
	let coveredMarketValue = 0;

	for (const position of positions) {
		if (!(position.marketValue > 0)) continue;
		const rows = byAsset.get(position.assetId);
		if (!rows || !isValidAllocation(rows)) continue;

		const lookThrough = lookThroughSectorWeights(rows);
		if (lookThrough.length === 0) continue;

		let assetCovered = 0;
		for (const row of lookThrough) {
			const contribution = position.marketValue * row.weight;
			assetCovered += contribution;
			sectorTotals.set(
				row.sector,
				(sectorTotals.get(row.sector) ?? 0) + contribution,
			);
		}
		coveredMarketValue += assetCovered;
	}

	return {
		coveredMarketValue,
		sectors: toSortedSlices(sectorTotals, coveredMarketValue),
	};
}

export function aggregateSectorExposureForAccount(
	positions: Array<PositionInput & { accountId: string }>,
	allocations: SectorAllocation[],
	accountId: string,
): SectorExposure {
	return aggregateSectorExposure(
		positions.filter((position) => position.accountId === accountId),
		allocations,
	);
}

export type UnmappedSectorSlice = {
	marketValue: number;
	weight: number;
};

export type PortfolioSectorBreakdown = {
	liquidInvested: number;
	sectors: SectorSlice[];
	unmapped: UnmappedSectorSlice | null;
};

export function aggregatePortfolioSectorBreakdown(
	positions: Array<{ assetId: string; marketValue: number }>,
	allocations: SectorAllocation[],
): PortfolioSectorBreakdown | null {
	const liquidPositions = positions.filter((position) => position.marketValue > 0);
	const liquidInvested = liquidPositions.reduce(
		(total, position) => total + position.marketValue,
		0,
	);
	if (liquidInvested <= 0) return null;

	const exposure = aggregateSectorExposure(positions, allocations);
	const sectorMapped = exposure.sectors.reduce(
		(total, slice) => total + slice.marketValue,
		0,
	);
	const unmappedMarketValue = Math.max(0, liquidInvested - sectorMapped);
	const unmapped =
		unmappedMarketValue > 1e-6
			? {
					marketValue: unmappedMarketValue,
					weight: unmappedMarketValue / liquidInvested,
				}
			: null;

	return {
		liquidInvested,
		sectors: exposure.sectors.map((slice) => ({
			...slice,
			weight: slice.marketValue / liquidInvested,
		})),
		unmapped,
	};
}
