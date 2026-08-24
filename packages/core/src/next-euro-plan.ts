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
	normalizeDiversificationKey,
	type DiversificationBandTone,
} from "./diversification-targets";
import {
	computeEmergencyFundSurplusRecommendation,
	type EmergencyFundSurplusRecommendation,
} from "./emergency-fund-recommendation";
import { sumLivretMarketValue } from "./emergency-fund";
import type { AssetPosition } from "./portfolio";
import type {
	Asset,
	DcaConfig,
	DiversificationTarget,
	EmergencyFundConfig,
	GeographicAllocation,
	SectorAllocation,
} from "./schema";

export type NextEuroAction = "buy" | "hold" | "pause";

export type NextEuroStepKind =
	| "band_catchup"
	| "dca_continue"
	| "band_pause";

export type NextEuroStep = {
	priority: number;
	action: NextEuroAction;
	euros: number;
	kind: NextEuroStepKind;
	assetId?: string;
	envelope?: string;
	bandKey?: string;
	reason: string;
};

export type NextEuroPlan = {
	monthlyPool: number;
	steps: NextEuroStep[];
	coherence: DiversificationCoherenceResult | null;
	/**
	 * Surplus-based LIVRET advice (outside the DCA envelope). Null when the
	 * configured EF target is not computable.
	 */
	emergencyFundRecommendation: EmergencyFundSurplusRecommendation | null;
};

export type NextEuroPlanInput = {
	targets: DiversificationTarget[];
	positions: AssetPosition[];
	dca: DcaConfig[];
	geographicAllocations: GeographicAllocation[];
	sectorAllocations?: SectorAllocation[];
	assets: Asset[];
	/** Accounts with envelope + marketValue (for livret / emergency fund). */
	accounts: Array<{ envelope: string; marketValue: number }>;
	monthlyExpenses: number;
	/** Budget revenus for EF surplus recommendation (optional). */
	revenusMensuels?: number;
	emergencyFundConfig?: EmergencyFundConfig;
	/**
	 * Current market values by envelope then assetId (same shape as
	 * `portfolioByEnvelope`). Used for residual DCA catch-up.
	 */
	portfolioByEnvelope?: Record<string, Record<string, number>>;
};

function roundCents(value: number): number {
	return Math.round(value * 100) / 100;
}

export function monthlyizeDcaAmount(
	amount: number,
	frequency: DcaConfig["frequency"],
): number {
	return annualizeDcaAmount(amount, frequency) / 12;
}

export function computeMonthlyDcaPool(dca: DcaConfig[]): number {
	return roundCents(
		dca.reduce(
			(sum, config) =>
				sum + monthlyizeDcaAmount(config.amount, config.frequency),
			0,
		),
	);
}

/** Monthlyized sum of LIVRET envelope DCA configs (cash emergency path). */
export function computeMonthlyLivretDcaPool(dca: DcaConfig[]): number {
	return computeMonthlyDcaPool(
		dca.filter((config) => config.envelope === "LIVRET"),
	);
}

/** Monthlyized sum of non-LIVRET DCA configs (investment path). */
export function computeMonthlyInvestmentDcaPool(dca: DcaConfig[]): number {
	return computeMonthlyDcaPool(
		dca.filter((config) => config.envelope !== "LIVRET"),
	);
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

function candidateAssetIds(
	dca: DcaConfig[],
	positions: AssetPosition[],
): string[] {
	const ids = new Set<string>();
	for (const config of dca) {
		for (const line of config.lines) {
			for (const assetId of line.assetIds) {
				ids.add(assetId);
			}
		}
	}
	for (const position of positions) {
		if (position.marketValue > 0) ids.add(position.assetId);
	}
	return Array.from(ids);
}

function envelopeForAsset(assetId: string, dca: DcaConfig[]): string | undefined {
	for (const config of dca) {
		if (config.lines.some((line) => line.assetIds.includes(assetId))) {
			return config.envelope;
		}
	}
	return undefined;
}

type UnderweightBand = {
	key: string;
	delta: number;
	tone: Exclude<DiversificationBandTone, "ok">;
	gapEuros: number;
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

/**
 * Read-only next-euro action plan (ADR 0015, P1 superseded by ADR 0020).
 * Returns null when there is no monthly DCA pool. LIVRET surplus advice is
 * attached as `emergencyFundRecommendation` (outside the DCA envelope).
 */
export function buildNextEuroPlan(
	input: NextEuroPlanInput,
): NextEuroPlan | null {
	const {
		targets,
		positions,
		dca,
		geographicAllocations,
		sectorAllocations = [],
		assets,
		accounts,
		monthlyExpenses,
		revenusMensuels,
		emergencyFundConfig,
		portfolioByEnvelope: portfolioByEnvelopeInput,
	} = input;

	const monthlyPool = computeMonthlyDcaPool(dca);
	if (monthlyPool <= 0) return null;

	const livretBalance = sumLivretMarketValue(accounts);
	const plannedLivretDcaMonthly = computeMonthlyLivretDcaPool(dca);
	const plannedInvestmentDcaMonthly = computeMonthlyInvestmentDcaPool(dca);
	const emergencyFundRecommendation =
		revenusMensuels === undefined
			? null
			: computeEmergencyFundSurplusRecommendation({
					revenusMensuels,
					depensesMensuelles: monthlyExpenses,
					livretBalance,
					plannedLivretDcaMonthly,
					plannedInvestmentDcaMonthly,
					emergencyFundConfig,
				});

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

	const steps: NextEuroStep[] = [];
	let remaining = monthlyPool;
	let priority = 1;

	const geoByAsset = allocationsByAsset(geographicAllocations);
	const sectorByAsset = sectorAllocationsByAsset(sectorAllocations);
	const types = assetTypeById(assets);
	const candidates = candidateAssetIds(dca, positions);
	const pausedAssets = new Set<string>();

	const pauseSteps: NextEuroStep[] = [];
	if (coherence) {
		for (const key of overweightBandKeys(coherence)) {
			for (const assetId of candidates) {
				const weight = contributionToKey(
					1,
					key,
					assetId,
					types.get(assetId),
					geoByAsset.get(assetId),
					sectorByAsset.get(assetId),
				);
				if (!(weight > 0)) continue;
				pausedAssets.add(assetId);
				pauseSteps.push({
					priority: 0,
					action: "pause",
					euros: 0,
					kind: "band_pause",
					assetId,
					envelope: envelopeForAsset(assetId, dca),
					bandKey: key,
					reason: `Surpondération ${normalizeDiversificationKey(key)}`,
				});
			}
		}
	}

	// P2 — underweight band catch-up
	if (coherence && remaining > 0) {
		for (const band of underweightBands(coherence)) {
			if (remaining <= 0) break;
			const allocate = roundCents(Math.min(remaining, band.gapEuros));
			if (allocate <= 0) continue;

			const weights = new Map<string, number>();
			let weightSum = 0;
			for (const assetId of candidates) {
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

			if (weightSum <= 0) {
				steps.push({
					priority: priority++,
					action: "buy",
					euros: allocate,
					kind: "band_catchup",
					bandKey: band.key,
					reason: "Aucun actif DCA mappé pour cette bande",
				});
				remaining = roundCents(remaining - allocate);
				continue;
			}

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
				steps.push({
					priority: priority++,
					action: "buy",
					euros: share,
					kind: "band_catchup",
					assetId,
					envelope: envelopeForAsset(assetId, dca),
					bandKey: band.key,
					reason: `Rattrapage bande ${normalizeDiversificationKey(band.key)}`,
				});
			}
			remaining = roundCents(remaining - allocate);
		}
	}

	// P3 — residual DCA
	if (remaining > 0 && dca.length > 0) {
		const configMonthlies = dca.map((config) => ({
			config,
			monthly: monthlyizeDcaAmount(config.amount, config.frequency),
		}));
		const totalMonthly = configMonthlies.reduce((s, c) => s + c.monthly, 0);
		const scale = totalMonthly > 0 ? remaining / totalMonthly : 0;
		const portfolioValues =
			portfolioByEnvelopeInput ??
			buildEnvelopeValuesFromPositions(dca, positions);

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
				portfolioValues[config.envelope] ?? {},
			);

			for (const allocation of plan.allocations) {
				for (const sub of allocation.sub) {
					if (sub.contribution <= 0) continue;
					if (pausedAssets.has(sub.assetId)) continue;
					const euros = roundCents(sub.contribution);
					if (euros <= 0) continue;
					steps.push({
						priority: priority++,
						action: "buy",
						euros,
						kind: "dca_continue",
						assetId: sub.assetId,
						envelope: config.envelope,
						reason: "Poursuite du plan DCA",
					});
				}
			}
		}
	}

	const uniquePause = new Map<string, NextEuroStep>();
	for (const step of pauseSteps) {
		const key = `${step.assetId}::${step.bandKey}`;
		if (!uniquePause.has(key)) uniquePause.set(key, step);
	}
	for (const step of uniquePause.values()) {
		steps.push({ ...step, priority: priority++ });
	}

	return {
		monthlyPool,
		steps,
		coherence,
		emergencyFundRecommendation,
	};
}
