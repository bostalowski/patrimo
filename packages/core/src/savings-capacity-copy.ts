import type {
	SavingsCapacity,
	SavingsCapacityStatus,
} from "./savings-capacity";

/** Dashboard / capacity card title (FR). */
export const SAVINGS_CAPACITY_TITLE = "Capacité d'épargne";

/** Short question the card answers. */
export const SAVINGS_CAPACITY_QUESTION =
	"Ton plan d'investissement tient-il avec ton budget ?";

/** Caption under the surplus figure. */
export const SAVINGS_CAPACITY_SURPLUS_CAPTION = "Surplus investissable / mois";

export const SAVINGS_CAPACITY_STATUS_LABEL: Record<
	SavingsCapacityStatus,
	string
> = {
	comfortable: "À l'aise",
	tight: "Serré",
	over_committed: "Surengagé",
};

export type EuroFormatter = (value: number) => string;

/**
 * Explicit recommendation for the investment-DCA vs surplus status.
 * Does not mention LIVRET over-contribution (use
 * {@link savingsCapacityLivretRecommendation}).
 */
export function savingsCapacityRecommendation(
	capacity: SavingsCapacity,
	formatEuro: EuroFormatter,
): string {
	switch (capacity.status) {
		case "comfortable":
			if (capacity.plannedInvestmentDcaMonthly <= 0) {
				return "Rien d'urgent : tu as de la marge pour un plan d'investissement si tu le souhaites.";
			}
			return "Rien à changer : ton DCA investi reste dans ta capacité.";
		case "tight":
			return "Ça passe, mais tu es près du plafond — évite d'augmenter le DCA investi.";
		case "over_committed":
			return `À faire : baisse le DCA investi (ou augmente ton surplus) — tu dépasses de ${formatEuro(capacity.gap)} / mois.`;
	}
}

/**
 * Recommendation when planned LIVRET DCA exceeds the implied catch-up need.
 * Returns null when not over-contributing.
 */
export function savingsCapacityLivretRecommendation(
	capacity: SavingsCapacity,
	formatEuro: EuroFormatter,
): string | null {
	if (!capacity.emergencyOverContributing) return null;
	return `À faire : baisse le dépôt LIVRET d'environ ${formatEuro(capacity.emergencyOverContribution)} / mois (au-dessus du besoin de rattrapage).`;
}

/** Soft-banner title when investment DCA is over-committed. */
export const SAVINGS_CAPACITY_OVERCOMMIT_BANNER_TITLE =
	"DCA investi au-dessus de ta capacité";

export function savingsCapacityOverCommitBannerBody(
	capacity: SavingsCapacity,
	formatEuro: EuroFormatter,
): string {
	return `À faire : baisse tes plans d'investissement (ou augmente ton surplus). Aujourd'hui ${formatEuro(capacity.plannedDcaMonthly)} / mois de DCA investi pour ${formatEuro(capacity.investableSurplus)} / mois de capacité (écart ${formatEuro(capacity.gap)}). Aucun plan n'est modifié automatiquement.`;
}

/** Soft-banner title when LIVRET DCA exceeds catch-up need. */
export const SAVINGS_CAPACITY_LIVRET_OVER_BANNER_TITLE =
	"Dépôt LIVRET au-dessus du besoin de rattrapage";

export function savingsCapacityLivretOverBannerBody(
	capacity: SavingsCapacity,
	formatEuro: EuroFormatter,
): string {
	return `À faire : baisse le plan LIVRET. Tu prévois ${formatEuro(capacity.plannedLivretDcaMonthly)} / mois pour un besoin de ${formatEuro(capacity.monthlyEmergencyReserve)} / mois (surplus ${formatEuro(capacity.emergencyOverContribution)}). Aucun plan n'est modifié automatiquement.`;
}
