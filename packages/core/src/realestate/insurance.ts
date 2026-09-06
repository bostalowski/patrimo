import type { LoanInsurancePalier, ModeAssurance } from "../schema";

/**
 * Canonical credit-year index (D5, ADR 0029). `monthsElapsed` is the 0-based
 * count of full months elapsed since `dateDebutCredit` (same convention as
 * `monthsSince` in `property.ts`). Applied identically here, in
 * `buildLoanSchedule`'s year loop, and in any point-in-time snapshot so the
 * palier lookup and the CRD-year boundary never disagree.
 *
 * `monthsElapsed = 0` (the loan's first month, before its first payment)
 * resolves to year 1, not year 0.
 */
export function creditYearFromMonthsElapsed(monthsElapsed: number): number {
	return Math.floor(monthsElapsed / 12) + 1;
}

export type InsurancePalier = {
	anneeDebut: number;
	assuranceMensuelle: number;
};

/**
 * Reject invalid rows (`anneeDebut < 1` or `assuranceMensuelle <= 0`) and
 * dedupe on `propertyId`+`anneeDebut`, last row in sheet order wins. Mirrors
 * the `Map`-keyed-by-composite-key idiom in `manual-prices.ts`. Idempotent —
 * re-normalizing an already-normalized list is a no-op.
 */
export function normalizeLoanInsurancePaliers(
	paliers: LoanInsurancePalier[],
): LoanInsurancePalier[] {
	const byKey = new Map<string, LoanInsurancePalier>();
	for (const entry of paliers) {
		if (!Number.isFinite(entry.anneeDebut) || entry.anneeDebut < 1) continue;
		if (
			!Number.isFinite(entry.assuranceMensuelle) ||
			entry.assuranceMensuelle <= 0
		)
			continue;
		const key = `${entry.propertyId}|${Math.round(entry.anneeDebut)}`;
		byKey.set(key, entry);
	}
	return [...byKey.values()];
}

/** Extract one property's paliers (already normalized), stripped of propertyId. */
export function filterPaliersForProperty(
	paliers: LoanInsurancePalier[],
	propertyId: string,
): InsurancePalier[] {
	return paliers
		.filter((p) => p.propertyId === propertyId)
		.map(({ anneeDebut, assuranceMensuelle }) => ({
			anneeDebut,
			assuranceMensuelle,
		}));
}

function palierAmountForYear(
	paliers: InsurancePalier[],
	year: number,
): number | null {
	let best: InsurancePalier | null = null;
	for (const p of paliers) {
		if (p.anneeDebut <= year && (!best || p.anneeDebut > best.anneeDebut)) {
			best = p;
		}
	}
	return best ? best.assuranceMensuelle : null;
}

export type MonthlyInsuranceInput = {
	/** Remaining loan balance at the start of this month. */
	remainingBalance: number;
	/** 0-based months elapsed since credit start, before this payment. */
	monthsElapsed: number;
	principal: number;
	annualInsuranceRate: number;
	modeAssurance: ModeAssurance;
	assuranceMensuelle: number;
	/** This property's paliers only (already filtered), if any. */
	paliers?: InsurancePalier[];
};

/**
 * Single core formula shared by `buildLoanSchedule` and `projectProperty`
 * (D6, ADR 0029). Paliers, when present for the property, override the
 * formula mode entirely (D4) via a step lookup on the canonical credit-year.
 */
export function monthlyInsuranceForLoan(input: MonthlyInsuranceInput): number {
	if (input.remainingBalance <= 0) return 0;

	const paliers = input.paliers ?? [];
	if (paliers.length > 0) {
		const year = creditYearFromMonthsElapsed(input.monthsElapsed);
		const amount = palierAmountForYear(paliers, year);
		return amount ?? 0;
	}

	switch (input.modeAssurance) {
		case "MONTANT_FIXE":
			return input.assuranceMensuelle > 0 ? input.assuranceMensuelle : 0;
		case "CAPITAL_INITIAL":
			return input.annualInsuranceRate > 0
				? (input.principal * input.annualInsuranceRate) / 12
				: 0;
		case "CRD":
		default:
			return input.annualInsuranceRate > 0
				? (input.remainingBalance * input.annualInsuranceRate) / 12
				: 0;
	}
}
