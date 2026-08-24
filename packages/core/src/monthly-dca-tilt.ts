import { computeDcaPlan } from "./dca";
import {
	annualizeDcaAmount,
	assessDiversificationCoherence,
	contributionToKey,
	type DiversificationCoherenceResult,
} from "./diversification-coherence";
import {
	assessDiversificationBandTone,
	diversificationBandSignedDelta,
	isValueInDiversificationBand,
	normalizeDiversificationKey,
	type DiversificationBandTone,
} from "./diversification-targets";
import type { AssetPosition } from "./portfolio";
import type {
	Asset,
	DcaConfig,
	DiversificationTarget,
	GeographicAllocation,
	SectorAllocation,
} from "./schema";

/** Spread stock gap catch-up over this many months (ADR 0021). */
export const TILT_GAP_MONTHS = 3;

/** Max share of monthly pool allocatable to one band catch-up (ADR 0021). */
export const TILT_MAX_POOL_FRACTION = 0.5;

export type MonthlyDcaTiltVerdict = "aligned" | "tilt" | "adjust_plan";

export type MonthlyDcaTiltBand = {
	key: string;
	stockPct: number;
	minPct: number;
	maxPct: number;
	gapEuros: number;
	thisMonthEuros: number;
	mappable: boolean;
};

export type MonthlyDcaTiltBandAsset = {
	bandKey: string;
	assetId: string;
	euros: number;
};

export type MonthlyDcaTilt = {
	verdict: MonthlyDcaTiltVerdict;
	monthlyPool: number;
	contributions: Record<string, number>;
	catchupContributions: Record<string, number>;
	bandAssetCatchup: MonthlyDcaTiltBandAsset[];
	baselineContributions: Record<string, number>;
	pausedAssetIds: string[];
	bands: MonthlyDcaTiltBand[];
	coherence: DiversificationCoherenceResult | null;
};

export type MonthlyDcaTiltInput = {
	targets: DiversificationTarget[];
	positions: AssetPosition[];
	dca: DcaConfig[];
	geographicAllocations: GeographicAllocation[];
	sectorAllocations?: SectorAllocation[];
	assets: Asset[];
	portfolioByEnvelope?: Record<string, Record<string, number>>;
};

function roundCents(value: number): number {
	return Math.round(value * 100) / 100;
}

function monthlyizeDcaAmount(
	amount: number,
	frequency: DcaConfig["frequency"],
): number {
	return annualizeDcaAmount(amount, frequency) / 12;
}

export function investmentDcaConfigs(dca: DcaConfig[]): DcaConfig[] {
	return dca.filter((config) => config.envelope !== "LIVRET");
}

export function dcaUniverseAssetIds(dca: DcaConfig[]): string[] {
	const ids = new Set<string>();
	for (const config of investmentDcaConfigs(dca)) {
		for (const line of config.lines) {
			for (const assetId of line.assetIds) {
				ids.add(assetId);
			}
		}
	}
	return Array.from(ids);
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

function sectorAllocationsByAsset(
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

function assetTypeById(assets: Asset[]): Map<string, Asset["type"]> {
	const types = new Map<string, Asset["type"]>();
	for (const asset of assets) {
		types.set(asset.id, asset.type);
	}
	return types;
}

function buildEnvelopeValuesFromPositions(
	dca: DcaConfig[],
	positions: AssetPosition[],
): Record<string, Record<string, number>> {
	const result: Record<string, Record<string, number>> = {};
	const mvByAsset = new Map(
		positions.map((p) => [p.assetId, p.marketValue] as const),
	);
	for (const config of dca) {
		const bucket = result[config.envelope] ?? {};
		for (const line of config.lines) {
			for (const assetId of line.assetIds) {
				bucket[assetId] = mvByAsset.get(assetId) ?? 0;
			}
		}
		result[config.envelope] = bucket;
	}
	return result;
}

function recordFromMap(map: Map<string, number>): Record<string, number> {
	const out: Record<string, number> = {};
	for (const [key, value] of map) {
		if (value > 0) out[key] = roundCents(value);
	}
	return out;
}

function mapsEqualWithinTolerance(
	a: Record<string, number>,
	b: Record<string, number>,
	tolerance = 0.01,
): boolean {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
	for (const key of keys) {
		if (Math.abs((a[key] ?? 0) - (b[key] ?? 0)) > tolerance) return false;
	}
	return true;
}

export function computeBaselineContributions(
	investmentDca: DcaConfig[],
	portfolioByEnvelope: Record<string, Record<string, number>>,
): Record<string, number> {
	const totals = new Map<string, number>();
	for (const config of investmentDca) {
		const monthly = monthlyizeDcaAmount(config.amount, config.frequency);
		if (monthly <= 0) continue;
		const plan = computeDcaPlan(
			{ ...config, amount: monthly, frequency: "MENSUEL" },
			portfolioByEnvelope[config.envelope] ?? {},
		);
		for (const allocation of plan.allocations) {
			for (const sub of allocation.sub) {
				if (sub.contribution <= 0) continue;
				totals.set(
					sub.assetId,
					roundCents((totals.get(sub.assetId) ?? 0) + sub.contribution),
				);
			}
		}
	}
	return recordFromMap(totals);
}

type UnderweightBand = {
	key: string;
	delta: number;
	tone: Exclude<DiversificationBandTone, "ok">;
	gapEuros: number;
	stockPct: number;
	minPct: number;
	maxPct: number;
};

function underweightBands(
	coherence: DiversificationCoherenceResult,
): UnderweightBand[] {
	const result: UnderweightBand[] = [];
	for (const band of coherence.bands) {
		const delta = diversificationBandSignedDelta(
			band.stockPct,
			band.minPct,
			band.maxPct,
		);
		if (!(delta < 0)) continue;
		const tone = assessDiversificationBandTone(
			band.stockPct,
			band.minPct,
			band.maxPct,
		);
		if (tone === "ok") continue;
		result.push({
			key: band.key,
			delta,
			tone,
			gapEuros: Math.abs(delta) * coherence.liquidInvested,
			stockPct: band.stockPct,
			minPct: band.minPct,
			maxPct: band.maxPct,
		});
	}
	result.sort((a, b) => {
		const toneRank = (t: UnderweightBand["tone"]) => (t === "breach" ? 0 : 1);
		const byTone = toneRank(a.tone) - toneRank(b.tone);
		if (byTone !== 0) return byTone;
		return Math.abs(b.delta) - Math.abs(a.delta);
	});
	return result;
}

function overweightBandKeys(
	coherence: DiversificationCoherenceResult,
): string[] {
	const keys: string[] = [];
	for (const band of coherence.bands) {
		const delta = diversificationBandSignedDelta(
			band.stockPct,
			band.minPct,
			band.maxPct,
		);
		if (delta > 0) keys.push(band.key);
	}
	return keys;
}

export function capBandCatchup(gapEuros: number, monthlyPool: number): number {
	if (gapEuros <= 0 || monthlyPool <= 0) return 0;
	return roundCents(
		Math.min(
			gapEuros / TILT_GAP_MONTHS,
			gapEuros,
			monthlyPool * TILT_MAX_POOL_FRACTION,
		),
	);
}

function allBandsAligned(coherence: DiversificationCoherenceResult): boolean {
	return coherence.bands.every((band) =>
		isValueInDiversificationBand(band.stockPct, band.minPct, band.maxPct),
	);
}

/**
 * Monthly DCA tilt: investment envelope only, capped band catch-up, DCA-universe
 * routing. Feeds Exécution (ADR 0021).
 */
export function buildMonthlyDcaTilt(
	input: MonthlyDcaTiltInput,
): MonthlyDcaTilt | null {
	const {
		targets,
		positions,
		dca,
		geographicAllocations,
		sectorAllocations = [],
		assets,
		portfolioByEnvelope: portfolioByEnvelopeInput,
	} = input;

	const investmentDca = investmentDcaConfigs(dca);
	const monthlyPool = roundCents(
		investmentDca.reduce(
			(sum, config) =>
				sum + monthlyizeDcaAmount(config.amount, config.frequency),
			0,
		),
	);
	if (monthlyPool <= 0) return null;

	const portfolioByEnvelope =
		portfolioByEnvelopeInput ??
		buildEnvelopeValuesFromPositions(dca, positions);

	const baselineContributions = computeBaselineContributions(
		investmentDca,
		portfolioByEnvelope,
	);

	const coherence =
		targets.length > 0
			? assessDiversificationCoherence({
					targets,
					positions,
					dca,
					geographicAllocations,
					sectorAllocations,
					assets,
				})
			: null;

	if (!coherence || allBandsAligned(coherence)) {
		return {
			verdict: "aligned",
			monthlyPool,
			contributions: { ...baselineContributions },
			catchupContributions: {},
			bandAssetCatchup: [],
			baselineContributions,
			pausedAssetIds: [],
			bands: [],
			coherence,
		};
	}

	const geoByAsset = allocationsByAsset(geographicAllocations);
	const sectorByAsset = sectorAllocationsByAsset(sectorAllocations);
	const types = assetTypeById(assets);
	const universe = dcaUniverseAssetIds(dca);
	const pausedAssets = new Set<string>();

	for (const key of overweightBandKeys(coherence)) {
		for (const assetId of universe) {
			const weight = contributionToKey(
				1,
				key,
				assetId,
				types.get(assetId),
				geoByAsset.get(assetId),
				sectorByAsset.get(assetId),
			);
			if (weight > 0) pausedAssets.add(assetId);
		}
	}

	const tiltContributions = new Map<string, number>();
	const catchupContributions = new Map<string, number>();
	const bandAssetCatchup: MonthlyDcaTiltBandAsset[] = [];
	let remaining = monthlyPool;
	const bandInfos: MonthlyDcaTiltBand[] = [];
	let needsPlanAdjust = false;

	for (const band of underweightBands(coherence)) {
		const capped = capBandCatchup(band.gapEuros, monthlyPool);
		const allocate = roundCents(Math.min(remaining, capped));
		if (allocate <= 0) {
			bandInfos.push({
				key: band.key,
				stockPct: band.stockPct,
				minPct: band.minPct,
				maxPct: band.maxPct,
				gapEuros: roundCents(band.gapEuros),
				thisMonthEuros: 0,
				mappable: true,
			});
			continue;
		}

		const weights = new Map<string, number>();
		let weightSum = 0;
		for (const assetId of universe) {
			if (pausedAssets.has(assetId)) continue;
			const w = contributionToKey(
				1,
				band.key,
				assetId,
				types.get(assetId),
				geoByAsset.get(assetId),
				sectorByAsset.get(assetId),
			);
			if (w > 0) {
				weights.set(assetId, w);
				weightSum += w;
			}
		}

		const mappable = weightSum > 0;
		if (!mappable) needsPlanAdjust = true;

		bandInfos.push({
			key: band.key,
			stockPct: band.stockPct,
			minPct: band.minPct,
			maxPct: band.maxPct,
			gapEuros: roundCents(band.gapEuros),
			thisMonthEuros: mappable ? allocate : 0,
			mappable,
		});

		if (!mappable) continue;

		const entries = Array.from(weights.entries());
		let assigned = 0;
		for (let i = 0; i < entries.length; i++) {
			const [assetId, w] = entries[i];
			const share =
				i === entries.length - 1
					? roundCents(allocate - assigned)
					: roundCents((allocate * w) / weightSum);
			if (share <= 0) continue;
			assigned = roundCents(assigned + share);
			tiltContributions.set(
				assetId,
				roundCents((tiltContributions.get(assetId) ?? 0) + share),
			);
			catchupContributions.set(
				assetId,
				roundCents((catchupContributions.get(assetId) ?? 0) + share),
			);
			bandAssetCatchup.push({ bandKey: band.key, assetId, euros: share });
		}
		remaining = roundCents(remaining - allocate);
	}

	if (remaining > 0 && investmentDca.length > 0) {
		const configMonthlies = investmentDca.map((config) => ({
			config,
			monthly: monthlyizeDcaAmount(config.amount, config.frequency),
		}));
		const totalMonthly = configMonthlies.reduce((s, c) => s + c.monthly, 0);
		const scale = totalMonthly > 0 ? remaining / totalMonthly : 0;

		for (const { config, monthly } of configMonthlies) {
			const amount = roundCents(monthly * scale);
			if (amount <= 0) continue;

			const filteredLines = config.lines
				.map((line) => ({
					...line,
					assetIds: line.assetIds.filter((id) => !pausedAssets.has(id)),
				}))
				.filter((line) => line.assetIds.length > 0);
			if (filteredLines.length === 0) continue;

			const targetSum = filteredLines.reduce((s, l) => s + l.targetPct, 0);
			const renormalized =
				targetSum > 0
					? filteredLines.map((line) => ({
							...line,
							targetPct: line.targetPct / targetSum,
						}))
					: filteredLines;

			const plan = computeDcaPlan(
				{ ...config, amount, frequency: "MENSUEL", lines: renormalized },
				portfolioByEnvelope[config.envelope] ?? {},
			);

			for (const allocation of plan.allocations) {
				for (const sub of allocation.sub) {
					if (sub.contribution <= 0) continue;
					if (pausedAssets.has(sub.assetId)) continue;
					const euros = roundCents(sub.contribution);
					if (euros <= 0) continue;
					tiltContributions.set(
						sub.assetId,
						roundCents((tiltContributions.get(sub.assetId) ?? 0) + euros),
					);
				}
			}
		}
	}

	const contributions = recordFromMap(tiltContributions);
	const pausedAssetIds = Array.from(pausedAssets);

	let verdict: MonthlyDcaTiltVerdict = "tilt";
	if (needsPlanAdjust) {
		verdict = "adjust_plan";
	} else if (
		pausedAssetIds.length === 0 &&
		mapsEqualWithinTolerance(contributions, baselineContributions)
	) {
		verdict = "aligned";
	}

	return {
		verdict,
		monthlyPool,
		contributions,
		catchupContributions: recordFromMap(catchupContributions),
		bandAssetCatchup,
		baselineContributions,
		pausedAssetIds,
		bands: bandInfos,
		coherence,
	};
}

export function envelopeForAsset(
	assetId: string,
	dca: DcaConfig[],
): string | undefined {
	for (const config of dca) {
		if (config.lines.some((line) => line.assetIds.includes(assetId))) {
			return config.envelope;
		}
	}
	return undefined;
}

export function contributionsForConfig(
	config: DcaConfig,
	contributions: Record<string, number>,
): Record<string, number> {
	const out: Record<string, number> = {};
	for (const line of config.lines) {
		for (const assetId of line.assetIds) {
			const euros = contributions[assetId];
			if (euros !== undefined && euros > 0) out[assetId] = euros;
		}
	}
	return out;
}

export function bandCatchupLabel(key: string): string {
	return normalizeDiversificationKey(key);
}
