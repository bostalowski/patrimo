import {
	buildMonthlyDcaTilt,
	envelopeForAsset,
	type MonthlyDcaTilt,
} from "./monthly-dca-tilt";
import { annualizeDcaAmount } from "./diversification-coherence";
import { normalizeDiversificationKey } from "./diversification-targets";
import type { DiversificationCoherenceResult } from "./diversification-coherence";
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

export type NextEuroStepKind = "band_catchup" | "dca_continue" | "band_pause";

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
	tilt: MonthlyDcaTilt;
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

function buildStepsFromTilt(tilt: MonthlyDcaTilt, dca: DcaConfig[]): NextEuroStep[] {
	const steps: NextEuroStep[] = [];
	let priority = 1;

	for (const band of tilt.bands) {
		if (!band.mappable && band.gapEuros > 0) {
			steps.push({
				priority: priority++,
				action: "buy",
				euros: 0,
				kind: "band_catchup",
				bandKey: band.key,
				reason: "Aucun actif DCA mappé pour cette bande",
			});
		}
	}

	for (const { bandKey, assetId, euros } of tilt.bandAssetCatchup) {
		if (euros <= 0) continue;
		steps.push({
			priority: priority++,
			action: "buy",
			euros,
			kind: "band_catchup",
			assetId,
			envelope: envelopeForAsset(assetId, dca),
			bandKey,
			reason: `Rattrapage bande ${normalizeDiversificationKey(bandKey)}`,
		});
	}

	for (const [assetId, euros] of Object.entries(tilt.contributions)) {
		const catchup = tilt.catchupContributions[assetId] ?? 0;
		const residual = roundCents(euros - catchup);
		if (residual <= 0) continue;
		if (tilt.pausedAssetIds.includes(assetId)) continue;
		steps.push({
			priority: priority++,
			action: "buy",
			euros: residual,
			kind: "dca_continue",
			assetId,
			envelope: envelopeForAsset(assetId, dca),
			reason: "Poursuite du plan DCA",
		});
	}

	for (const assetId of tilt.pausedAssetIds) {
		steps.push({
			priority: priority++,
			action: "pause",
			euros: 0,
			kind: "band_pause",
			assetId,
			envelope: envelopeForAsset(assetId, dca),
			reason: "Surpondération — pause ce mois-ci",
		});
	}

	return steps;
}

/**
 * Read-only next-euro plan (ADR 0015 / 0020 / 0021). Investment DCA tilt feeds
 * Exécution; LIVRET surplus advice is attached outside the envelope.
 * Returns null when there is no investment pool.
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
		portfolioByEnvelope,
	} = input;

	const tilt = buildMonthlyDcaTilt({
		targets,
		positions,
		dca,
		geographicAllocations,
		sectorAllocations,
		assets,
		portfolioByEnvelope,
	});

	if (!tilt) return null;

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

	const steps =
		tilt.verdict === "aligned" && tilt.pausedAssetIds.length === 0
			? Object.entries(tilt.contributions).map(([assetId, euros], index) => ({
					priority: index + 1,
					action: "buy" as const,
					euros,
					kind: "dca_continue" as const,
					assetId,
					envelope: envelopeForAsset(assetId, dca),
					reason: "Plan DCA — aucun tilt ce mois-ci",
				}))
			: buildStepsFromTilt(tilt, dca);

	return {
		monthlyPool: tilt.monthlyPool,
		steps,
		coherence: tilt.coherence,
		tilt,
		emergencyFundRecommendation,
	};
}
