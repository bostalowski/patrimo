import { computeMonthlyDcaPool } from "./next-euro-plan";
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
	/** Monthly catch-up toward configured emergency-fund target over catch-up horizon; 0 when gap is zero or target not computable. */
	monthlyEmergencyReserve: number;
	/** `rawSavings − monthlyEmergencyReserve` (may be negative). */
	investableSurplus: number;
	/** Monthlyized DCA pool from workbook configs. */
	plannedDcaMonthly: number;
	/** `plannedDcaMonthly − investableSurplus`. */
	gap: number;
	/** Effective emergency-fund target used for catch-up (if computable). */
	emergencyTargetEuro?: number;
	/** Target months used when target euro is derived from expenses. */
	emergencyTargetMonths: number;
	/** Catch-up spread horizon in months. */
	emergencyCatchUpHorizonMonths: number;
	status: SavingsCapacityStatus;
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
	const investableSurplus = roundCents(rawSavings - monthlyEmergencyReserve);
	const plannedDcaMonthly = computeMonthlyDcaPool(dca);
	const gap = roundCents(plannedDcaMonthly - investableSurplus);
	const emergencyTargetEuro = effectiveEmergencyFundTargetEuro({
		monthlyExpenses: depensesMensuelles,
		config: normalizedConfig,
	});

	return {
		rawSavings,
		monthlyEmergencyReserve,
		investableSurplus,
		plannedDcaMonthly,
		gap,
		emergencyTargetEuro,
		emergencyTargetMonths: normalizedConfig.targetMonths,
		emergencyCatchUpHorizonMonths: normalizedConfig.catchUpHorizonMonths,
		status: statusFor(plannedDcaMonthly, investableSurplus),
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
