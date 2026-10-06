/**
 * Indicative household IR-barème observation (tranche / TMI / progressive IR / PAS).
 * Not a filing engine — CONSTRAINTS §3 / ADR 0031.
 */

import { monthlyAmount } from "./budget";
import {
	effectiveIrBaremeSeries,
	FRAIS_PRO_ABATEMENT_RATE,
	FRAIS_PRO_MAX_EURO,
	FRAIS_PRO_MIN_EURO,
	resolveLatestIrBareme,
	type IrBaremeTable,
	type IrBracketBand,
} from "./ir-bareme";
import type { BudgetLine, FoyerFiscalConfig } from "./schema";

export type { FoyerFiscalConfig };

export type TaxBracketObservationOk = {
	status: "ok";
	rniAnnuel: number;
	quotient: number;
	parts: number;
	tmi: number;
	trancheLower: number;
	trancheUpper: number | null;
	roomToNextBracket: number | null;
	irAnnuelIndicatif: number;
	irMensuelIndicatif: number;
	/** Ratio 0–1; null when assiettePas is 0 while IR > 0 (E8). */
	tauxPrelevementConseille: number | null;
	assiettePas: number;
	incomeYear: number;
	baremeEffectiveFrom: string;
	/** Stronger disclaimer for NET / FROM_BUDGET RNI proxies. */
	strongerDisclaimer: boolean;
};

export type TaxBracketObservationIncomplete = {
	status: "incomplete";
	reason: "no_revenu" | "not_configured";
};

export type TaxBracketObservation =
	| TaxBracketObservationOk
	| TaxBracketObservationIncomplete;

/** Indicative employee social-charge haircut for BRUT → PAS assiette (D13). */
const BRUT_PAS_HAIRCUT = 0.22;

/** PAS tip helper (E8): IR/assiette; 0 when IR=0; null when assiette=0 and IR>0. */
export function computeTauxPrelevementConseille(
	irAnnuel: number,
	assiettePas: number,
): number | null {
	if (irAnnuel === 0) return 0;
	if (!(assiettePas > 0)) return null;
	return irAnnuel / assiettePas;
}

function fraisProAbatement(annualBrut: number): number {
	const raw = annualBrut * FRAIS_PRO_ABATEMENT_RATE;
	return Math.min(FRAIS_PRO_MAX_EURO, Math.max(FRAIS_PRO_MIN_EURO, raw));
}

function progressiveTaxOnQuotient(
	quotient: number,
	brackets: IrBracketBand[],
): number {
	let tax = 0;
	let lower = 0;
	for (const band of brackets) {
		const upper = band.upperBound ?? Number.POSITIVE_INFINITY;
		const slice = Math.min(quotient, upper) - lower;
		if (slice > 0) tax += slice * band.rate;
		if (quotient <= upper) break;
		lower = upper;
	}
	return tax;
}

/**
 * Find the band the quotient sits in.
 * Upper bounds are inclusive (E5): at exactly `upperBound`, that band's rate applies.
 */
function bandForQuotient(
	quotient: number,
	brackets: IrBracketBand[],
): { band: IrBracketBand; lower: number } {
	let lower = 0;
	for (const band of brackets) {
		const upper = band.upperBound ?? Number.POSITIVE_INFINITY;
		if (quotient <= upper) {
			return { band, lower };
		}
		lower = upper;
	}
	const last = brackets[brackets.length - 1]!;
	return {
		band: last,
		lower: last.upperBound ?? lower,
	};
}

function annualBudgetRevenu(budget: BudgetLine[] | undefined): number {
	if (!budget || budget.length === 0) return 0;
	let monthly = 0;
	for (const line of budget) {
		if (line.kind === "REVENU") monthly += monthlyAmount(line);
	}
	return monthly * 12;
}

export function observeTaxBracket(args: {
	config: FoyerFiscalConfig;
	budget?: BudgetLine[];
	baremeSeries?: IrBaremeTable[];
}): TaxBracketObservation {
	const series = args.baremeSeries ?? effectiveIrBaremeSeries();
	const bareme = resolveLatestIrBareme(series);
	const parts = args.config.parts;

	let rniAnnuel: number;
	let assiettePas: number;
	let strongerDisclaimer: boolean;

	if (args.config.incomeSource === "FROM_BUDGET") {
		const annualCash = annualBudgetRevenu(args.budget);
		if (!(annualCash > 0)) {
			return { status: "incomplete", reason: "no_revenu" };
		}
		rniAnnuel = annualCash;
		assiettePas = annualCash;
		strongerDisclaimer = true;
	} else {
		const monthly = args.config.manualAmount ?? 0;
		const annual = monthly * 12;
		const basis = args.config.manualBasis ?? "NET_IMPOSABLE";
		if (basis === "BRUT") {
			rniAnnuel = annual - fraisProAbatement(annual);
			assiettePas = annual * (1 - BRUT_PAS_HAIRCUT);
			strongerDisclaimer = false;
		} else if (basis === "NET") {
			rniAnnuel = annual;
			assiettePas = annual;
			strongerDisclaimer = true;
		} else {
			rniAnnuel = annual;
			assiettePas = annual;
			strongerDisclaimer = false;
		}
	}

	const quotient = rniAnnuel / parts;
	const { band, lower } = bandForQuotient(quotient, bareme.brackets);
	const taxPerPart = progressiveTaxOnQuotient(quotient, bareme.brackets);
	const irAnnuelIndicatif = taxPerPart * parts;
	const trancheUpper = band.upperBound;
	const roomToNextBracket =
		trancheUpper === null ? null : trancheUpper - quotient;

	return {
		status: "ok",
		rniAnnuel,
		quotient,
		parts,
		tmi: band.rate,
		trancheLower: lower,
		trancheUpper,
		roomToNextBracket,
		irAnnuelIndicatif,
		irMensuelIndicatif: irAnnuelIndicatif / 12,
		tauxPrelevementConseille: computeTauxPrelevementConseille(
			irAnnuelIndicatif,
			assiettePas,
		),
		assiettePas,
		incomeYear: bareme.incomeYear,
		baremeEffectiveFrom: bareme.effectiveFrom,
		strongerDisclaimer,
	};
}
