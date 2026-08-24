import {
	computeEmergencyFundSurplusRecommendation,
	type EmergencyFundSurplusRecommendation,
} from "./emergency-fund-recommendation";
import {
	computeMonthlyInvestmentDcaPool,
	computeMonthlyLivretDcaPool,
} from "./next-euro-plan";
import {
	DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS,
	DEFAULT_EMERGENCY_FUND_TARGET_MONTHS,
	effectiveEmergencyFundTargetEuro,
	monthlyEmergencyCatchUpReserve,
	normalizeEmergencyFundConfig,
} from "./emergency-fund-config";
import type { DcaConfig, EmergencyFundConfig } from "./schema";

/** Lower bound of ADR 0005 `acceptable` / start of `healthy`. */
export const SAVINGS_CAPACITY_EF_TARGET_MONTHS =
	DEFAULT_EMERGENCY_FUND_TARGET_MONTHS;

/** Months over which to spread the emergency-fund catch-up reserve. */
export const SAVINGS_CAPACITY_CATCH_UP_HORIZON_MONTHS =
	DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS;

/** Planned DCA is comfortable when ≤ this fraction of investable surplus. */
export const SAVINGS_CAPACITY_COMFORTABLE_RATIO = 0.8;

export type SavingsCapacityStatus =
	| "comfortable"
	| "tight"
	| "over_committed";

export type SavingsCapacity = {
	/** `revenusMensuels − depensesMensuelles` (budget ÉPARGNE ignored). */
	rawSavings: number;
	/**
	 * Implied monthly catch-up need toward configured emergency-fund target
	 * over catch-up horizon; 0 when gap is zero or target not computable.
	 */
	monthlyEmergencyReserve: number;
	/** Monthlyized LIVRET DCA from workbook configs. */
	plannedLivretDcaMonthly: number;
	/** Monthlyized non-LIVRET (investment) DCA from workbook configs. */
	plannedInvestmentDcaMonthly: number;
	/**
	 * Effective EF monthly outflow subtracted from raw savings:
	 * `max(monthlyEmergencyReserve, plannedLivretDcaMonthly)`.
	 */
	emergencyMonthlyOutflow: number;
	/** `rawSavings − emergencyMonthlyOutflow` (may be negative). */
	investableSurplus: number;
	/**
	 * Monthlyized investment DCA pool (alias of `plannedInvestmentDcaMonthly`
	 * for status / gap / investment soft warnings).
	 */
	plannedDcaMonthly: number;
	/** `plannedDcaMonthly − investableSurplus`. */
	gap: number;
	/** True when planned LIVRET DCA exceeds implied catch-up need (incl. need = 0). */
	emergencyOverContributing: boolean;
	/** `max(0, plannedLivretDcaMonthly − monthlyEmergencyReserve)`. */
	emergencyOverContribution: number;
	/** Effective emergency-fund target used for catch-up (if computable). */
	emergencyTargetEuro?: number;
	/** Target months used when target euro is derived from expenses. */
	emergencyTargetMonths: number;
	/** Catch-up spread horizon in months. */
	emergencyCatchUpHorizonMonths: number;
	status: SavingsCapacityStatus;
	/**
	 * Surplus-based LIVRET recommendation (ADR 0020). Null when the configured
	 * target euro is not computable.
	 */
	emergencyFundRecommendation: EmergencyFundSurplusRecommendation | null;
};

export type SavingsCapacityInput = {
	revenusMensuels: number;
	depensesMensuelles: number;
	livretBalance: number;
	dca: DcaConfig[];
	emergencyFundConfig?: EmergencyFundConfig;
};

function roundCents(value: number): number {
	return Math.round(value * 100) / 100;
}

export function computeSavingsCapacity(
	input: SavingsCapacityInput,
): SavingsCapacity | null {
	const {
		revenusMensuels,
		depensesMensuelles,
		livretBalance,
		dca,
		emergencyFundConfig,
	} = input;

	if (revenusMensuels <= 0) return null;
	const normalizedConfig = normalizeEmergencyFundConfig(emergencyFundConfig);

	const rawSavings = roundCents(revenusMensuels - depensesMensuelles);
	const monthlyEmergencyReserve = roundCents(
		monthlyEmergencyCatchUpReserve({
			livretBalance,
			monthlyExpenses: depensesMensuelles,
			config: normalizedConfig,
		}),
	);
	const plannedLivretDcaMonthly = computeMonthlyLivretDcaPool(dca);
	const plannedInvestmentDcaMonthly = computeMonthlyInvestmentDcaPool(dca);
	const emergencyMonthlyOutflow = roundCents(
		Math.max(monthlyEmergencyReserve, plannedLivretDcaMonthly),
	);
	const investableSurplus = roundCents(rawSavings - emergencyMonthlyOutflow);
	const plannedDcaMonthly = plannedInvestmentDcaMonthly;
	const gap = roundCents(plannedDcaMonthly - investableSurplus);
	const emergencyOverContribution = roundCents(
		Math.max(0, plannedLivretDcaMonthly - monthlyEmergencyReserve),
	);
	const emergencyOverContributing = plannedLivretDcaMonthly > monthlyEmergencyReserve;
	const emergencyTargetEuro = effectiveEmergencyFundTargetEuro({
		monthlyExpenses: depensesMensuelles,
		config: normalizedConfig,
	});
	const emergencyFundRecommendation = computeEmergencyFundSurplusRecommendation({
		revenusMensuels,
		depensesMensuelles,
		livretBalance,
		plannedLivretDcaMonthly,
		plannedInvestmentDcaMonthly,
		emergencyFundConfig: normalizedConfig,
	});

	return {
		rawSavings,
		monthlyEmergencyReserve,
		plannedLivretDcaMonthly,
		plannedInvestmentDcaMonthly,
		emergencyMonthlyOutflow,
		investableSurplus,
		plannedDcaMonthly,
		gap,
		emergencyOverContributing,
		emergencyOverContribution,
		emergencyTargetEuro,
		emergencyTargetMonths: normalizedConfig.targetMonths,
		emergencyCatchUpHorizonMonths: normalizedConfig.catchUpHorizonMonths,
		status: statusFor(plannedDcaMonthly, investableSurplus),
		emergencyFundRecommendation,
	};
}

function statusFor(
	planned: number,
	surplus: number,
): SavingsCapacityStatus {
	if (planned === 0 && surplus >= 0) return "comfortable";
	if (planned > surplus) return "over_committed";
	if (
		surplus >= 0 &&
		planned <= SAVINGS_CAPACITY_COMFORTABLE_RATIO * surplus
	) {
		return "comfortable";
	}
	return "tight";
}
