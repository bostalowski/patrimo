import type { NextEuroPlan, NextEuroStep } from "./next-euro-plan";
import type { EmergencyFundSurplusRecommendation } from "./emergency-fund-recommendation";
import { emergencyFundSurplusRecommendationCopy } from "./emergency-fund-recommendation";
import type { EuroFormatter } from "./savings-capacity-copy";

/** Dashboard / Diversification card title (FR). */
export const NEXT_EURO_TITLE = "Prochain euro";

/** Short question the card answers. */
export const NEXT_EURO_QUESTION =
	"Où prioriser l'enveloppe DCA déjà prévue ?";

/** Reminder that the plan is advisory only. */
export const NEXT_EURO_READONLY_NOTE =
	"Lecture seule — rien n'est modifié dans le classeur.";

/** Banner title for EF surplus advice above the DCA step list. */
export const NEXT_EURO_EF_BANNER_TITLE = "Fonds d'urgence (hors enveloppe DCA)";

/**
 * Prefer the first buy step with euros, else the first step.
 */
export function nextEuroPrimaryStep(
	plan: NextEuroPlan,
): NextEuroStep | null {
	const buy = plan.steps.find(
		(step) => step.action === "buy" && step.euros > 0,
	);
	return buy ?? plan.steps[0] ?? null;
}

/**
 * Lead recommendation sentence for the primary step.
 * `title` is the already-resolved display label (asset / band / livret).
 */
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

export function nextEuroPoolCaption(
	monthlyPool: number,
	formatEuro: EuroFormatter,
): string {
	return `Enveloppe DCA mensuelle ${formatEuro(monthlyPool)} · ${NEXT_EURO_READONLY_NOTE}`;
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
