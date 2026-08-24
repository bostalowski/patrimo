import type { MonthlyDcaTilt, MonthlyDcaTiltVerdict } from "./monthly-dca-tilt";
import type { NextEuroPlan } from "./next-euro-plan";
import type { EuroFormatter } from "./savings-capacity-copy";
import { diversificationKeyLabel } from "./diversification-labels";

/** Dashboard / Diversification card title (FR). */
export const NEXT_EURO_TITLE = "Ajustement DCA du mois";

/** Short question the card answers. */
export const NEXT_EURO_QUESTION =
	"Faut-il dévier de ton plan DCA investi ce mois-ci ?";

/** Reminder that the plan is advisory only. */
export const NEXT_EURO_READONLY_NOTE =
	"Lecture seule — rien n'est modifié dans le classeur.";

export const NEXT_EURO_EXECUTION_LINK = "/investissements?tab=execution";

const VERDICT_LABEL: Record<MonthlyDcaTiltVerdict, string> = {
	aligned: "Aligné",
	tilt: "Ajustement ce mois-ci",
	adjust_plan: "Revoir le plan DCA",
};

export function monthlyDcaTiltVerdictLabel(
	verdict: MonthlyDcaTiltVerdict,
): string {
	return VERDICT_LABEL[verdict];
}

/**
 * Lead sentence for the monthly DCA adjustment card.
 */
export function nextEuroLeadFromTilt(
	tilt: MonthlyDcaTilt,
	formatEuro: EuroFormatter,
): string {
	if (tilt.verdict === "aligned") {
		return `Aucun ajustement — suis ton plan DCA (${formatEuro(tilt.monthlyPool)}/mois). Passe tes ordres dans Exécution.`;
	}
	if (tilt.verdict === "adjust_plan") {
		const unmapped = tilt.bands.filter((b) => !b.mappable && b.gapEuros > 0);
		if (unmapped.length > 0) {
			const labels = unmapped
				.map((b) => diversificationKeyLabel(b.key))
				.join(", ");
			return `Bande(s) ${labels} hors cible sans actif dans ton plan DCA — ajoute une ligne au plan ou revois la cible.`;
		}
		return "Le plan DCA ne rattrape pas la cible — revois les % des paniers ou les cibles de diversification.";
	}
	const primary = tilt.bands.find((b) => b.thisMonthEuros > 0 && b.mappable);
	if (primary) {
		return `Ce mois-ci : oriente jusqu'à ${formatEuro(primary.thisMonthEuros)} vers ${diversificationKeyLabel(primary.key)} (écart restant ${formatEuro(primary.gapEuros)}, enveloppe ${formatEuro(tilt.monthlyPool)}).`;
	}
	if (tilt.pausedAssetIds.length > 0) {
		return `Ce mois-ci : mets en pause ${tilt.pausedAssetIds.length} actif(s) surpondéré(s).`;
	}
	return `Ajustement sur l'enveloppe ${formatEuro(tilt.monthlyPool)} — voir Exécution pour les ordres.`;
}

export function nextEuroPoolCaption(
	monthlyPool: number,
	formatEuro: EuroFormatter,
): string {
	return `Enveloppe DCA investi ${formatEuro(monthlyPool)}/mois · ${NEXT_EURO_READONLY_NOTE}`;
}

/** @deprecated Use nextEuroLeadFromTilt — kept for tests migrating off step-based lead. */
export function nextEuroPrimaryStep(plan: NextEuroPlan) {
	const buy = plan.steps.find(
		(step) => step.action === "buy" && step.euros > 0,
	);
	return buy ?? plan.steps[0] ?? null;
}
