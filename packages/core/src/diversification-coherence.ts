import { isValidGeographicWeightSum } from "./geographic-allocation";
import {
	aggregateGeographicExposure,
	geographicAllocationGranularity,
	lookThroughCountryWeights,
	normalizeGeographicRegionKey,
	regionForCountry,
	type GeographicSlice,
} from "./geographic-exposure";
import type { AssetPosition } from "./portfolio";
import type {
	Asset,
	DcaConfig,
	DiversificationTarget,
	GeographicAllocation,
} from "./schema";
import {
	DIVERSIFICATION_CRYPTO_KEY,
	isValidDiversificationKey,
	isValueInDiversificationBand,
	normalizeDiversificationKey,
} from "./diversification-targets";

export type DiversificationFindingKind = "band_drift" | "flow_misalign";

export type DiversificationFinding = {
	kind: DiversificationFindingKind;
	key: string;
};

export type DiversificationCoherenceStatus = "aligned" | "misaligned";

export type DiversificationBandResult = {
	key: string;
	minPct: number;
	maxPct: number;
	stockPct: number;
	flowPct: number | null;
};

export type DiversificationCoherenceResult = {
	bands: DiversificationBandResult[];
	findings: DiversificationFinding[];
	status: DiversificationCoherenceStatus;
	liquidInvested: number;
	annualDcaTotal: number;
};

export function annualizeDcaAmount(
	amount: number,
	frequency: DcaConfig["frequency"],
): number {
	if (frequency === "MENSUEL") return amount * 12;
	if (frequency === "TRIMESTRIEL") return amount * 4;
	return amount;
}

export function computeFlowMixByAsset(dca: DcaConfig[]): Map<string, number> {
	const result = new Map<string, number>();
	for (const config of dca) {
		const annual = annualizeDcaAmount(config.amount, config.frequency);
		for (const line of config.lines) {
			const lineAnnual = annual * line.targetPct;
			const perAsset =
				line.assetIds.length > 0 ? lineAnnual / line.assetIds.length : 0;
			for (const assetId of line.assetIds) {
				result.set(assetId, (result.get(assetId) ?? 0) + perAsset);
			}
		}
	}
	return result;
}

function allocationsByAsset(
	allocations: GeographicAllocation[],
): Map<string, GeographicAllocation[]> {
	const byAsset = new Map<string, GeographicAllocation[]>();
	for (const entry of allocations) {
		const rows = byAsset.get(entry.assetId) ?? [];
		rows.push(entry);
		byAsset.set(entry.assetId, rows);
	}
	return byAsset;
}

function assetTypeById(assets: Asset[]): Map<string, Asset["type"]> {
	const types = new Map<string, Asset["type"]>();
	for (const asset of assets) {
		types.set(asset.id, asset.type);
	}
	return types;
}

function contributionToKey(
	amount: number,
	key: string,
	assetId: string,
	assetType: Asset["type"] | undefined,
	rows: GeographicAllocation[] | undefined,
): number {
	if (!(amount > 0)) return 0;

	if (key === DIVERSIFICATION_CRYPTO_KEY) {
		return assetType === "CRYPTO" ? amount : 0;
	}
	if (!rows || rows.length === 0) return 0;

	const sum = rows.reduce((total, row) => total + row.weight, 0);
	if (!isValidGeographicWeightSum(sum)) return 0;

	let granularity: ReturnType<typeof geographicAllocationGranularity>;
	try {
		granularity = geographicAllocationGranularity(rows.map((row) => row.country));
	} catch {
		return 0;
	}

	if (isIsoCountryTarget(key)) {
		if (granularity !== "country") return 0;
		return lookThroughCountryWeights(rows)
			.filter((row) => row.country === key)
			.reduce((total, row) => total + amount * row.weight, 0);
	}

	if (granularity === "region") {
		return rows
			.map((row) => ({
				region: normalizeGeographicRegionKey(row.country),
				weight: row.weight,
			}))
			.filter((row) => row.region === key && row.weight > 0)
			.reduce((total, row) => total + amount * row.weight, 0);
	}

	return lookThroughCountryWeights(rows)
		.filter((row) => regionForCountry(row.country) === key)
		.reduce((total, row) => total + amount * row.weight, 0);
}

function isIsoCountryTarget(key: string): boolean {
	return /^[A-Z]{2}$/.test(key);
}

export type CryptoExposureSlice = {
	marketValue: number;
	weight: number;
	liquidInvested: number;
};

export type UnmappedExposureSlice = {
	marketValue: number;
	weight: number;
};

export type PortfolioDiversificationBreakdown = {
	liquidInvested: number;
	regions: GeographicSlice[];
	countries: GeographicSlice[];
	crypto: CryptoExposureSlice | null;
	unmapped: UnmappedExposureSlice | null;
};

function reweightSlicesToLiquid(
	slices: GeographicSlice[],
	liquidInvested: number,
): GeographicSlice[] {
	if (liquidInvested <= 0) return [];
	return slices.map((slice) => ({
		...slice,
		weight: slice.marketValue / liquidInvested,
	}));
}

export function aggregatePortfolioDiversificationBreakdown(
	positions: Array<{ assetId: string; marketValue: number }>,
	allocations: GeographicAllocation[],
	assets: Asset[],
): PortfolioDiversificationBreakdown | null {
	const liquidPositions = positions.filter((position) => position.marketValue > 0);
	const liquidInvested = liquidPositions.reduce(
		(total, position) => total + position.marketValue,
		0,
	);
	if (liquidInvested <= 0) return null;

	const exposure = aggregateGeographicExposure(positions, allocations);
	const crypto = aggregateCryptoExposure(positions, assets);
	const geoMapped = exposure.regions.reduce(
		(total, slice) => total + slice.marketValue,
		0,
	);
	const cryptoMarketValue = crypto?.marketValue ?? 0;
	const unmappedMarketValue = Math.max(
		0,
		liquidInvested - geoMapped - cryptoMarketValue,
	);
	const unmapped =
		unmappedMarketValue > 1e-6
			? {
					marketValue: unmappedMarketValue,
					weight: unmappedMarketValue / liquidInvested,
				}
			: null;

	return {
		liquidInvested,
		regions: reweightSlicesToLiquid(exposure.regions, liquidInvested),
		countries: reweightSlicesToLiquid(exposure.countries, liquidInvested),
		crypto,
		unmapped,
	};
}

export function aggregateCryptoExposure(
	positions: Array<{ assetId: string; marketValue: number }>,
	assets: Asset[],
): CryptoExposureSlice | null {
	const liquid = positions.filter((position) => position.marketValue > 0);
	const liquidInvested = liquid.reduce(
		(total, position) => total + position.marketValue,
		0,
	);
	if (liquidInvested <= 0) return null;

	const types = assetTypeById(assets);
	const cryptoMarketValue = liquid
		.filter((position) => types.get(position.assetId) === "CRYPTO")
		.reduce((total, position) => total + position.marketValue, 0);

	return {
		marketValue: cryptoMarketValue,
		weight: cryptoMarketValue / liquidInvested,
		liquidInvested,
	};
}

export function assessDiversificationCoherence(params: {
	targets: DiversificationTarget[];
	positions: AssetPosition[];
	dca: DcaConfig[];
	geographicAllocations: GeographicAllocation[];
	assets: Asset[];
}): DiversificationCoherenceResult | null {
	const { targets, positions, dca, geographicAllocations, assets } = params;
	if (targets.length === 0) return null;

	const liquidPositions = positions.filter((p) => p.marketValue > 0);
	const liquidInvested = liquidPositions.reduce((s, p) => s + p.marketValue, 0);
	if (liquidInvested <= 0) return null;

	const flowByAsset = computeFlowMixByAsset(dca);
	const annualDcaTotal = Array.from(flowByAsset.values()).reduce(
		(s, v) => s + v,
		0,
	);

	const byAsset = allocationsByAsset(geographicAllocations);
	const types = assetTypeById(assets);
	const findings: DiversificationFinding[] = [];
	const bands: DiversificationBandResult[] = [];

	for (const target of targets) {
		if (!isValidDiversificationKey(target.key)) continue;
		const key = normalizeDiversificationKey(target.key);

		const stockNumerator = liquidPositions.reduce(
			(total, pos) =>
				total +
				contributionToKey(
					pos.marketValue,
					key,
					pos.assetId,
					types.get(pos.assetId),
					byAsset.get(pos.assetId),
				),
			0,
		);
		const stockPct = stockNumerator / liquidInvested;

		let flowPct: number | null = null;
		if (annualDcaTotal > 0) {
			const flowNumerator = Array.from(flowByAsset.entries()).reduce(
				(total, [assetId, amount]) =>
					total +
					contributionToKey(
						amount,
						key,
						assetId,
						types.get(assetId),
						byAsset.get(assetId),
					),
				0,
			);
			flowPct = flowNumerator / annualDcaTotal;
		}

		bands.push({
			key,
			minPct: target.minPct,
			maxPct: target.maxPct,
			stockPct,
			flowPct,
		});

		if (!isValueInDiversificationBand(stockPct, target.minPct, target.maxPct)) {
			findings.push({ kind: "band_drift", key });
		}
		if (
			flowPct !== null &&
			!isValueInDiversificationBand(flowPct, target.minPct, target.maxPct)
		) {
			findings.push({ kind: "flow_misalign", key });
		}
	}

	return {
		bands,
		findings,
		status: findings.length > 0 ? "misaligned" : "aligned",
		liquidInvested,
		annualDcaTotal,
	};
}
