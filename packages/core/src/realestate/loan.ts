import type { ModeAssurance } from "../schema";
import {
	creditYearFromMonthsElapsed,
	type InsurancePalier,
	monthlyInsuranceForLoan,
} from "./insurance";

export type LoanInput = {
	principal: number;
	annualRate: number;
	durationMonths: number;
	annualInsuranceRate: number;
	/** Borrower-insurance mode; defaults to `CRD` (ADR 0028/0028) when omitted. */
	modeAssurance?: ModeAssurance;
	/** Flat €/month, used only when `modeAssurance` is `MONTANT_FIXE`. */
	assuranceMensuelle?: number;
	/** This property's paliers only (already filtered/normalized), if any (D4). */
	insurancePaliers?: InsurancePalier[];
};

export type LoanYear = {
	year: number;
	interest: number;
	principalPaid: number;
	insurance: number;
	payment: number;
	remaining: number;
};

export type LoanSchedule = {
	monthlyPayment: number;
	monthlyInsurance: number;
	totalInterest: number;
	totalInsurance: number;
	totalCost: number;
	years: LoanYear[];
	remainingAt: (monthsElapsed: number) => number;
};

export function monthlyPayment(input: LoanInput): number {
	const { principal, annualRate, durationMonths } = input;
	if (principal <= 0 || durationMonths <= 0) return 0;
	const monthlyRate = annualRate / 12;
	if (monthlyRate === 0) return principal / durationMonths;
	const factor = (1 + monthlyRate) ** durationMonths;
	return (principal * monthlyRate * factor) / (factor - 1);
}

/** Assurance emprunteur mensuelle sur capital restant dû (pas sur capital initial). */
export function monthlyInsuranceOnBalance(
	remainingBalanceAmount: number,
	annualInsuranceRate: number,
): number {
	if (remainingBalanceAmount <= 0 || annualInsuranceRate <= 0) return 0;
	return (remainingBalanceAmount * annualInsuranceRate) / 12;
}

export function remainingBalance(
	input: LoanInput,
	monthsElapsed: number,
): number {
	const { principal, annualRate, durationMonths } = input;
	if (principal <= 0 || durationMonths <= 0) return 0;
	if (monthsElapsed >= durationMonths) return 0;
	if (monthsElapsed <= 0) return principal;
	const monthlyRate = annualRate / 12;
	if (monthlyRate === 0) {
		return principal * (1 - monthsElapsed / durationMonths);
	}
	const payment = monthlyPayment(input);
	const growth = (1 + monthlyRate) ** monthsElapsed;
	return principal * growth - payment * ((growth - 1) / monthlyRate);
}

export function buildLoanSchedule(input: LoanInput): LoanSchedule {
	const { principal, annualRate, durationMonths, annualInsuranceRate } = input;
	const modeAssurance = input.modeAssurance ?? "CRD";
	const assuranceMensuelle = input.assuranceMensuelle ?? 0;
	const insurancePaliers = input.insurancePaliers ?? [];
	const payment = monthlyPayment(input);
	const monthlyRate = annualRate / 12;

	const years: LoanYear[] = [];
	let balance = principal;
	let totalInterest = 0;
	let totalInsurance = 0;
	let firstMonthInsurance = 0;

	let current: LoanYear | null = null;
	for (let month = 1; month <= durationMonths && balance > 0.005; month += 1) {
		const interest = balance * monthlyRate;
		const monthsElapsed = month - 1;
		const insurance = monthlyInsuranceForLoan({
			remainingBalance: balance,
			monthsElapsed,
			principal,
			annualInsuranceRate,
			modeAssurance,
			assuranceMensuelle,
			paliers: insurancePaliers,
		});
		if (month === 1) firstMonthInsurance = insurance;
		const principalPaid = Math.min(payment - interest, balance);
		balance -= principalPaid;
		totalInterest += interest;
		totalInsurance += insurance;

		const yearIndex = creditYearFromMonthsElapsed(monthsElapsed);
		if (!current || current.year !== yearIndex) {
			current = {
				year: yearIndex,
				interest: 0,
				principalPaid: 0,
				insurance: 0,
				payment: 0,
				remaining: balance,
			};
			years.push(current);
		}
		current.interest += interest;
		current.principalPaid += principalPaid;
		current.insurance += insurance;
		current.payment += payment + insurance;
		current.remaining = balance;
	}

	return {
		monthlyPayment: payment,
		monthlyInsurance: firstMonthInsurance,
		totalInterest,
		totalInsurance,
		totalCost: totalInterest + totalInsurance,
		years,
		remainingAt: (monthsElapsed: number) =>
			remainingBalance(input, monthsElapsed),
	};
}
