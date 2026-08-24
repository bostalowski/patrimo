import type { NextEuroPlan, NextEuroStep } from "./next-euro-plan";
import type { EmergencyFundSurplusRecommendation } from "./emergency-fund-recommendation";
import { emergencyFundSurplusRecommendationCopy } from "./emergency-fund-recommendation";
import {
	NEXT_EURO_EXECUTION_LINK,
	NEXT_EURO_QUESTION,
	NEXT_EURO_READONLY_NOTE,
	NEXT_EURO_TITLE,
	monthlyDcaTiltVerdictLabel,
	nextEuroLeadFromTilt,
} from "./monthly-dca-tilt-copy";
import type { EuroFormatter } from "./savings-capacity-copy";

export {
	NEXT_EURO_EXECUTION_LINK,
	NEXT_EURO_QUESTION,
	NEXT_EURO_READONLY_NOTE,
	NEXT_EURO_TITLE,
	monthlyDcaTiltVerdictLabel,
	nextEuroLeadFromTilt,
};

/** Banner title for EF surplus advice above the DCA step list. */
export const NEXT_EURO_EF_BANNER_TITLE = "Fonds d'urgence (hors enveloppe DCA)";

/** @deprecated Prefer nextEuroLeadFromTilt(plan.tilt, formatEuro). */
export function nextEuroLeadRecommendation(
	step: NextEuroStep,
	title: string,
	formatEuro: EuroFormatter,
): string {
	if (step.action === "buy" && step.euros > 0) {
		return `Ce mois-ci : priorise ${formatEuro(step.euros)} sur ${title}.`;
	}
	if (step.action === "pause") {
		return `Ce mois-ci : mets en pause ${title}.`;
	}
	if (step.action === "hold") {
		return `Ce mois-ci : conserve ${title}.`;
	}
	return `Ce mois-ci : ${title}.`;
}

/** @deprecated Prefer nextEuroLeadFromTilt. */
export function nextEuroPrimaryStep(
	plan: NextEuroPlan,
): NextEuroStep | null {
	const buy = plan.steps.find(
		(step) => step.action === "buy" && step.euros > 0,
	);
	return buy ?? plan.steps[0] ?? null;
}

export function nextEuroPoolCaption(
	monthlyPool: number,
	formatEuro: EuroFormatter,
): string {
	return `Enveloppe DCA investi ${formatEuro(monthlyPool)}/mois · ${NEXT_EURO_READONLY_NOTE}`;
}

/**
 * Body for the EF surplus banner above Next-euro DCA steps.
 * Null when there is no actionable LIVRET recommendation.
 */
export function nextEuroEmergencyFundBannerBody(
	recommendation: EmergencyFundSurplusRecommendation | null | undefined,
	formatEuro: EuroFormatter,
): string | null {
	return emergencyFundSurplusRecommendationCopy(recommendation, formatEuro);
}
