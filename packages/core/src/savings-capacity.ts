import { computeMonthlyDcaPool } from "./next-euro-plan";
import type { DcaConfig } from "./schema";

/** Lower bound of ADR 0005 `acceptable` / start of `healthy`. */
export const SAVINGS_CAPACITY_EF_TARGET_MONTHS = 6;

/** Months over which to spread the emergency-fund catch-up reserve. */
export const SAVINGS_CAPACITY_CATCH_UP_HORIZON_MONTHS = 12;

/** Planned DCA is comfortable when ≤ this fraction of investable surplus. */
export const SAVINGS_CAPACITY_COMFORTABLE_RATIO = 0.8;

export type SavingsCapacityStatus =
	| "comfortable"
	| "tight"
	| "over_committed";

export type SavingsCapacity = {
	/** `revenusMensuels − depensesMensuelles` (budget ÉPARGNE ignored). */
	rawSavings: number;
	/** Monthly catch-up toward 6 months of expenses over 12 months; 0 when coverage ≥ 6 or no expenses. */
	monthlyEmergencyReserve: number;
	/** `rawSavings − monthlyEmergencyReserve` (may be negative). */
	investableSurplus: number;
	/** Monthlyized DCA pool from workbook configs. */
	plannedDcaMonthly: number;
	/** `plannedDcaMonthly − investableSurplus`. */
	gap: number;
	status: SavingsCapacityStatus;
};

export type SavingsCapacityInput = {
	revenusMensuels: number;
	depensesMensuelles: number;
	livretBalance: number;
	dca: DcaConfig[];
};

function roundCents(value: number): number {
	return Math.round(value * 100) / 100;
}

export function computeSavingsCapacity(
	input: SavingsCapacityInput,
): SavingsCapacity | null {
	const { revenusMensuels, depensesMensuelles, livretBalance, dca } = input;

	if (revenusMensuels <= 0) return null;

	const rawSavings = roundCents(revenusMensuels - depensesMensuelles);
	const monthlyEmergencyReserve = roundCents(
		monthlyEmergencyCatchUpReserve(livretBalance, depensesMensuelles),
	);
	const investableSurplus = roundCents(rawSavings - monthlyEmergencyReserve);
	const plannedDcaMonthly = computeMonthlyDcaPool(dca);
	const gap = roundCents(plannedDcaMonthly - investableSurplus);

	return {
		rawSavings,
		monthlyEmergencyReserve,
		investableSurplus,
		plannedDcaMonthly,
		gap,
		status: statusFor(plannedDcaMonthly, investableSurplus),
	};
}

function monthlyEmergencyCatchUpReserve(
	livretBalance: number,
	depensesMensuelles: number,
): number {
	if (depensesMensuelles <= 0) return 0;

	const coverageMonths = livretBalance / depensesMensuelles;
	if (coverageMonths >= SAVINGS_CAPACITY_EF_TARGET_MONTHS) return 0;

	return Math.max(
		0,
		((SAVINGS_CAPACITY_EF_TARGET_MONTHS - coverageMonths) *
			depensesMensuelles) /
			SAVINGS_CAPACITY_CATCH_UP_HORIZON_MONTHS,
	);
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
