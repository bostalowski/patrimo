import {
	effectiveEmergencyFundTargetEuro,
	normalizeEmergencyFundConfig,
} from "./emergency-fund-config";
import type { EmergencyFundConfig } from "./schema";

export type EmergencyFundSurplusMode = "oneshot" | "monthly" | "none";

type EuroFormatter = (value: number) => string;

/**
 * Advisory LIVRET recommendation that keeps investment DCA unchanged
 * (ADR 0020). Null when the configured target euro is not computable.
 */
export type EmergencyFundSurplusRecommendation = {
	mode: EmergencyFundSurplusMode;
	/** `max(0, targetEuro − livretBalance)`. */
	gapEuro: number;
	targetEuro: number;
	livretBalance: number;
	/** `max(0, rawSavings − plannedInvestmentDcaMonthly)`. */
	availableCashMonthly: number;
	rawSavings: number;
	plannedInvestmentDcaMonthly: number;
	plannedLivretDcaMonthly: number;
	catchUpHorizonMonths: number;
	/**
	 * Horizon catch-up need: `gapEuro / catchUpHorizonMonths`.
	 * 0 when gap is 0.
	 */
	monthlyNeed: number;
	/**
	 * Extra LIVRET to add: full gap (oneshot), capped monthly à ajouter, or 0.
	 */
	amountToAdd: number;
};

export type EmergencyFundSurplusRecommendationInput = {
	revenusMensuels: number;
	depensesMensuelles: number;
	livretBalance: number;
	plannedLivretDcaMonthly: number;
	plannedInvestmentDcaMonthly: number;
	emergencyFundConfig?: EmergencyFundConfig;
};

function roundCents(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * Surplus-based LIVRET advice toward the configured emergency-fund target.
 * Does not reallocate investment DCA.
 */
export function computeEmergencyFundSurplusRecommendation(
	input: EmergencyFundSurplusRecommendationInput,
): EmergencyFundSurplusRecommendation | null {
	const {
		revenusMensuels,
		depensesMensuelles,
		livretBalance,
		plannedLivretDcaMonthly,
		plannedInvestmentDcaMonthly,
		emergencyFundConfig,
	} = input;

	const config = normalizeEmergencyFundConfig(emergencyFundConfig);
	const targetEuro = effectiveEmergencyFundTargetEuro({
		monthlyExpenses: depensesMensuelles,
		config,
	});
	if (targetEuro === undefined) return null;

	const rawSavings = roundCents(revenusMensuels - depensesMensuelles);
	const availableCashMonthly = roundCents(
		Math.max(0, rawSavings - plannedInvestmentDcaMonthly),
	);
	const gapEuro = roundCents(Math.max(0, targetEuro - livretBalance));
	const catchUpHorizonMonths = config.catchUpHorizonMonths;
	const monthlyNeed =
		gapEuro > 0 ? roundCents(gapEuro / catchUpHorizonMonths) : 0;

	if (gapEuro <= 0) {
		return {
			mode: "none",
			gapEuro: 0,
			targetEuro,
			livretBalance,
			availableCashMonthly,
			rawSavings,
			plannedInvestmentDcaMonthly,
			plannedLivretDcaMonthly,
			catchUpHorizonMonths,
			monthlyNeed: 0,
			amountToAdd: 0,
		};
	}

	if (gapEuro <= availableCashMonthly) {
		return {
			mode: "oneshot",
			gapEuro,
			targetEuro,
			livretBalance,
			availableCashMonthly,
			rawSavings,
			plannedInvestmentDcaMonthly,
			plannedLivretDcaMonthly,
			catchUpHorizonMonths,
			monthlyNeed,
			amountToAdd: gapEuro,
		};
	}

	const uncappedAdd = roundCents(
		Math.max(0, monthlyNeed - plannedLivretDcaMonthly),
	);
	const amountToAdd = roundCents(
		Math.min(uncappedAdd, availableCashMonthly),
	);

	return {
		mode: amountToAdd > 0 ? "monthly" : "none",
		gapEuro,
		targetEuro,
		livretBalance,
		availableCashMonthly,
		rawSavings,
		plannedInvestmentDcaMonthly,
		plannedLivretDcaMonthly,
		catchUpHorizonMonths,
		monthlyNeed,
		amountToAdd,
	};
}

/** Banner / capacity label: advice is outside the DCA envelope. */
export const EMERGENCY_FUND_SURPLUS_OUTSIDE_DCA_NOTE =
	"Hors enveloppe DCA — le plan d'investissement n'est pas réalloué.";

/**
 * Explicit FR recommendation for oneshot / monthly LIVRET catch-up.
 * Returns null when there is nothing to add (`mode === "none"` or null input).
 */
export function emergencyFundSurplusRecommendationCopy(
	recommendation: EmergencyFundSurplusRecommendation | null | undefined,
	formatEuro: EuroFormatter,
): string | null {
	if (!recommendation || recommendation.mode === "none") return null;

	const {
		gapEuro,
		targetEuro,
		amountToAdd,
		plannedLivretDcaMonthly,
		monthlyNeed,
		catchUpHorizonMonths,
	} = recommendation;

	if (recommendation.mode === "oneshot") {
		return `À faire : dépose ${formatEuro(amountToAdd)} sur le LIVRET maintenant pour combler l'écart à la cible (${formatEuro(gapEuro)} manquants pour ${formatEuro(targetEuro)}). ${EMERGENCY_FUND_SURPLUS_OUTSIDE_DCA_NOTE}`;
	}

	const plannedPart =
		plannedLivretDcaMonthly > 0
			? `déjà prévu LIVRET ${formatEuro(plannedLivretDcaMonthly)} / mois`
			: "aucun LIVRET prévu";

	return `À faire : ajoute ${formatEuro(amountToAdd)} / mois sur le LIVRET (besoin ${formatEuro(monthlyNeed)} / mois sur ${catchUpHorizonMonths} mois, ${plannedPart}, écart ${formatEuro(gapEuro)} vers ${formatEuro(targetEuro)}). ${EMERGENCY_FUND_SURPLUS_OUTSIDE_DCA_NOTE}`;
}
