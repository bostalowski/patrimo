import type { Property } from "../schema";

export type PropertyOperating = {
	grossRent: number;
	gestion: number;
	taxeFonciere: number;
	chargesNonRecup: number;
	operatingCharges: number;
	netOperatingIncome: number;
};

export function grossAnnualRent(property: Property): number {
	if (property.regime === "RESIDENCE_PRINCIPALE") return 0;
	return property.loyerMensuelHC * 12 * (1 - property.vacancePct);
}

export type OperatingYearOptions = {
	/** Projection year index k (1..horizon). Rent scales by (1+rate)^k. */
	yearIndex?: number;
	/** Annual rent/charge index rate. Defaults to 0 (no index) when omitted here — callers pass property revalo. */
	rentIndexRate?: number;
};

export function operatingForYear(
	property: Property,
	options: OperatingYearOptions = {},
): PropertyOperating {
	const yearIndex = options.yearIndex ?? 0;
	const rentIndexRate = options.rentIndexRate ?? 0;
	const factor = yearIndex > 0 ? (1 + rentIndexRate) ** yearIndex : 1;
	const grossRent = grossAnnualRent(property) * factor;
	const gestion = grossRent * property.fraisGestionPct;
	const taxeFonciere = property.taxeFonciere * factor;
	const chargesNonRecup = property.chargesNonRecupAnnuelles * factor;
	const operatingCharges = gestion + taxeFonciere + chargesNonRecup;
	return {
		grossRent,
		gestion,
		taxeFonciere,
		chargesNonRecup,
		operatingCharges,
		netOperatingIncome: grossRent - operatingCharges,
	};
}

export function acquisitionCost(property: Property): number {
	return property.prixAchat + property.fraisNotaire + property.travaux;
}

export function apport(property: Property): number {
	return Math.max(0, acquisitionCost(property) - property.montantEmprunte);
}

export function monthsSince(date: Date | undefined, reference: Date): number {
	if (!date) return 0;
	const months =
		(reference.getUTCFullYear() - date.getUTCFullYear()) * 12 +
		(reference.getUTCMonth() - date.getUTCMonth());
	return Math.max(0, months);
}

export function loanEndDate(property: Property): Date | null {
	if (!property.dateDebutCredit || property.dureeMois <= 0) return null;
	const d = new Date(property.dateDebutCredit);
	d.setUTCMonth(d.getUTCMonth() + Math.round(property.dureeMois));
	return d;
}
