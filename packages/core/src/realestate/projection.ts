import { deflate } from "../inflation";
import type { Property } from "../schema";
import {
	monthlyInsuranceOnBalance,
	monthlyPayment,
	remainingBalance,
} from "./loan";
import {
	acquisitionCost,
	apport as computeApport,
	grossAnnualRent,
	monthsSince,
	operatingForYear,
} from "./property";
import {
	annualTax,
	detectDeficitImputationWarning,
	detectMicroCeilingWarning,
	type ResaleResult,
	resaleTax,
} from "./tax";

export type RealEstateYear = {
	year: number;
	propertyValue: number;
	remainingLoan: number;
	equity: number;
	grossRent: number;
	operatingCharges: number;
	loanInterest: number;
	loanPrincipal: number;
	loanInsurance: number;
	loanPayment: number;
	amortization: number;
	tax: number;
	cashFlowBeforeTax: number;
	cashFlowAfterTax: number;
	cumulativeCashFlow: number;
	realPropertyValue: number;
	realEquity: number;
};

export type RealEstateProjection = {
	share: number;
	apport: number;
	monthlyPayment: number;
	years: RealEstateYear[];
	finalEquity: number;
	finalRealEquity: number;
	cumulativeNetCashFlow: number;
	resale: ResaleResult & { salePrice: number; remainingLoan: number };
	netIfSold: number;
	realNetIfSold: number;
	totalReturn: number;
	/** CAGR of apport → netIfSold over horizon; null when apport is 0 or horizon is 0. */
	cagr: number | null;
	/** Annual IRR of (−apport, CF…, CF+resale); null when apport is 0 or horizon is 0. */
	irr: number | null;
	/** @deprecated Use `cagr`. Kept as alias for callers not yet migrated. */
	annualizedReturn: number;
	warnings: string[];
};

export type ProjectionOptions = {
	horizonYears: number;
	revaloAnnuelle?: number;
	/** Rent/charge index rate. Default = revalo used for property value. Pass 0 to freeze. */
	rentIndexRate?: number;
	now?: Date;
	inflationRate?: number;
};

/** Solve IRR for annual cash flows (year 0..n equally spaced). */
export function annualIrr(cashFlows: number[]): number | null {
	if (cashFlows.length < 2) return null;
	const hasPos = cashFlows.some((c) => c > 0);
	const hasNeg = cashFlows.some((c) => c < 0);
	if (!hasPos || !hasNeg) return null;

	const npv = (rate: number) =>
		cashFlows.reduce((sum, cf, t) => sum + cf / (1 + rate) ** t, 0);

	let rate = 0.1;
	for (let i = 0; i < 100; i += 1) {
		let value = 0;
		let derivative = 0;
		for (let t = 0; t < cashFlows.length; t += 1) {
			const denom = (1 + rate) ** t;
			value += cashFlows[t] / denom;
			if (t > 0) {
				derivative += (-t * cashFlows[t]) / (denom * (1 + rate));
			}
		}
		if (Math.abs(value) < 1e-7) return rate;
		if (derivative === 0) break;
		const next = rate - value / derivative;
		if (!Number.isFinite(next) || next <= -0.9999) break;
		if (Math.abs(next - rate) < 1e-9) return next;
		rate = next;
	}

	let low = -0.9999;
	let high = 10;
	let valueLow = npv(low);
	const valueHigh = npv(high);
	if (valueLow * valueHigh > 0) return null;
	for (let i = 0; i < 200; i += 1) {
		const mid = (low + high) / 2;
		const valueMid = npv(mid);
		if (Math.abs(valueMid) < 1e-7) return mid;
		if (valueLow * valueMid < 0) {
			high = mid;
		} else {
			low = mid;
			valueLow = valueMid;
		}
	}
	return (low + high) / 2;
}

export function projectProperty(
	property: Property,
	options: ProjectionOptions,
): RealEstateProjection {
	const now = options.now ?? new Date();
	const horizon = Math.max(0, Math.round(options.horizonYears));
	const revalo = options.revaloAnnuelle ?? property.revaloAnnuelle;
	const rentIndexRate =
		options.rentIndexRate !== undefined ? options.rentIndexRate : revalo;
	const inflationRate = options.inflationRate ?? 0;
	const share = property.partDetenue;

	const loan = {
		principal: property.montantEmprunte,
		annualRate: property.tauxCredit,
		durationMonths: property.dureeMois,
		annualInsuranceRate: property.tauxAssurance,
	};
	const monthlyRate = loan.annualRate / 12;
	const payment = monthlyPayment(loan);
	const balanceNow = remainingBalance(
		loan,
		Math.min(monthsSince(property.dateDebutCredit, now), loan.durationMonths),
	);
	const currentMonthlyInsurance = monthlyInsuranceOnBalance(
		balanceNow,
		loan.annualInsuranceRate,
	);

	const monthsElapsedLoan = monthsSince(property.dateDebutCredit, now);
	const yearsHeld = Math.floor(monthsSince(property.dateAcquisition, now) / 12);

	const amortBase = property.prixAchat * property.partAmortissable;
	const amortPerYear =
		property.dureeAmortissement > 0
			? amortBase / property.dureeAmortissement
			: 0;
	let cumulativeAmort = Math.min(amortPerYear * yearsHeld, amortBase);
	let cumulativeAmortDeducted = cumulativeAmort;

	const years: RealEstateYear[] = [];
	let priorDeficit = 0;
	let priorAmortDeferred = 0;
	let cumulativeCashFlow = 0;
	const warnings: string[] = [];

	const microWarning = detectMicroCeilingWarning(property);
	if (microWarning) warnings.push(microWarning);

	for (let k = 1; k <= horizon; k += 1) {
		const propertyValue = property.valeurActuelle * (1 + revalo) ** k;
		const operating = operatingForYear(property, {
			yearIndex: k,
			rentIndexRate,
		});

		const monthsStart = monthsElapsedLoan + (k - 1) * 12;
		const monthsEnd = monthsElapsedLoan + k * 12;

		let loanInterest = 0;
		let loanInsurance = 0;
		for (let m = monthsStart + 1; m <= monthsEnd; m += 1) {
			if (m > loan.durationMonths) break;
			const balanceStart = remainingBalance(loan, m - 1);
			loanInterest += balanceStart * monthlyRate;
			loanInsurance += monthlyInsuranceOnBalance(
				balanceStart,
				loan.annualInsuranceRate,
			);
		}
		const remainingLoanStart = remainingBalance(
			loan,
			Math.min(monthsStart, loan.durationMonths),
		);
		const remainingLoan = remainingBalance(
			loan,
			Math.min(monthsEnd, loan.durationMonths),
		);
		const loanPrincipal = Math.max(0, remainingLoanStart - remainingLoan);
		const loanPayment = loanInterest + loanPrincipal + loanInsurance;

		let amortization = 0;
		if (cumulativeAmort < amortBase) {
			amortization = Math.min(amortPerYear, amortBase - cumulativeAmort);
			cumulativeAmort += amortization;
		}

		const netBeforeDeficitForWarn =
			operating.grossRent -
			operating.operatingCharges -
			loanInterest -
			loanInsurance;
		if (property.regime === "IR_REEL") {
			const deficitWarn = detectDeficitImputationWarning(
				priorDeficit,
				netBeforeDeficitForWarn,
			);
			if (deficitWarn && !warnings.includes(deficitWarn)) {
				warnings.push(deficitWarn);
			}
		}

		const tax = annualTax({
			property,
			grossRent: operating.grossRent,
			deductibleCharges: operating.operatingCharges,
			loanInterest,
			loanInsurance,
			amortization,
			priorDeficit,
			priorAmortization: priorAmortDeferred,
		});
		priorDeficit = tax.deficitCarried;
		priorAmortDeferred = tax.amortizationDeferred;
		cumulativeAmortDeducted += tax.amortizationUsed;

		const cashFlowBeforeTax =
			operating.grossRent - operating.operatingCharges - loanPayment;
		const cashFlowAfterTax = cashFlowBeforeTax - tax.total;
		cumulativeCashFlow += cashFlowAfterTax;

		const yearEquity = (propertyValue - remainingLoan) * share;
		years.push({
			year: k,
			propertyValue: propertyValue * share,
			remainingLoan: remainingLoan * share,
			equity: yearEquity,
			grossRent: operating.grossRent * share,
			operatingCharges: operating.operatingCharges * share,
			loanInterest: loanInterest * share,
			loanPrincipal: loanPrincipal * share,
			loanInsurance: loanInsurance * share,
			loanPayment: loanPayment * share,
			amortization: amortization * share,
			tax: tax.total * share,
			cashFlowBeforeTax: cashFlowBeforeTax * share,
			cashFlowAfterTax: cashFlowAfterTax * share,
			cumulativeCashFlow: cumulativeCashFlow * share,
			realPropertyValue: deflate(propertyValue * share, k, inflationRate),
			realEquity: deflate(yearEquity, k, inflationRate),
		});
	}

	const salePrice = property.valeurActuelle * (1 + revalo) ** horizon;
	const remainingLoanFinal = remainingBalance(
		loan,
		Math.min(monthsElapsedLoan + horizon * 12, loan.durationMonths),
	);
	const resaleRaw = resaleTax({
		property,
		salePrice,
		remainingLoan: remainingLoanFinal,
		holdingYears: yearsHeld + horizon,
		cumulativeAmortization: cumulativeAmort,
		cumulativeAmortizationDeducted: cumulativeAmortDeducted,
	});

	const apportValue = computeApport(property) * share;
	const cumulativeNetCashFlow = cumulativeCashFlow * share;
	const resaleNet = resaleRaw.netProceeds * share;
	const finalEquity = years[years.length - 1]?.equity ?? 0;
	const netIfSold = cumulativeNetCashFlow + resaleNet;
	const totalReturn = netIfSold - apportValue;

	let cagr: number | null = null;
	let irr: number | null = null;
	if (apportValue > 0 && horizon > 0) {
		cagr = (netIfSold / apportValue) ** (1 / horizon) - 1;
		const flows: number[] = [-apportValue];
		for (let i = 0; i < years.length; i += 1) {
			const cf = years[i].cashFlowAfterTax;
			if (i === years.length - 1) {
				flows.push(cf + resaleNet);
			} else {
				flows.push(cf);
			}
		}
		irr = annualIrr(flows);
	}

	return {
		share,
		apport: apportValue,
		monthlyPayment: (payment + currentMonthlyInsurance) * share,
		years,
		finalEquity,
		finalRealEquity: deflate(finalEquity, horizon, inflationRate),
		cumulativeNetCashFlow,
		resale: {
			...resaleRaw,
			capitalGainTax: resaleRaw.capitalGainTax * share,
			distributionTax: resaleRaw.distributionTax * share,
			totalTax: resaleRaw.totalTax * share,
			netProceeds: resaleNet,
			salePrice: salePrice * share,
			remainingLoan: remainingLoanFinal * share,
		},
		netIfSold,
		realNetIfSold: deflate(netIfSold, horizon, inflationRate),
		totalReturn,
		cagr,
		irr,
		annualizedReturn: cagr ?? 0,
		warnings,
	};
}

export function currentEquity(
	property: Property,
	now: Date = new Date(),
): number {
	const loan = {
		principal: property.montantEmprunte,
		annualRate: property.tauxCredit,
		durationMonths: property.dureeMois,
		annualInsuranceRate: property.tauxAssurance,
	};
	const monthsElapsed = monthsSince(property.dateDebutCredit, now);
	const remaining = remainingBalance(
		loan,
		Math.min(monthsElapsed, loan.durationMonths),
	);
	return (property.valeurActuelle - remaining) * property.partDetenue;
}

export type PropertySnapshot = {
	property: Property;
	monthlyPayment: number;
	monthlyCashFlowAfterTax: number;
	equity: number;
	remainingLoan: number;
	grossYield: number;
	/** Cash-on-cash after tax (includes loan principal repayment in CF). */
	netYield: number;
	annualTaxFoncier: number;
	warnings: string[];
};

export type PropertyTotals = {
	value: number;
	equity: number;
	debt: number;
	cashFlow: number;
};

export function aggregatePropertySnapshots(
	snapshots: PropertySnapshot[],
): PropertyTotals {
	return snapshots.reduce(
		(acc, s) => {
			acc.value += s.property.valeurActuelle * s.property.partDetenue;
			acc.equity += s.equity;
			acc.debt += s.remainingLoan;
			acc.cashFlow += s.monthlyCashFlowAfterTax;
			return acc;
		},
		{ value: 0, equity: 0, debt: 0, cashFlow: 0 },
	);
}

export function propertySnapshot(
	property: Property,
	now: Date = new Date(),
): PropertySnapshot {
	const projection = projectProperty(property, { horizonYears: 1, now });
	const firstYear = projection.years[0];
	const share = property.partDetenue;
	const grossRent = grossAnnualRent(property) * share;
	const cost = acquisitionCost(property) * share;

	const loan = {
		principal: property.montantEmprunte,
		annualRate: property.tauxCredit,
		durationMonths: property.dureeMois,
		annualInsuranceRate: property.tauxAssurance,
	};
	const monthsElapsed = monthsSince(property.dateDebutCredit, now);
	const remainingLoan =
		remainingBalance(loan, Math.min(monthsElapsed, loan.durationMonths)) *
		share;

	return {
		property,
		monthlyPayment: projection.monthlyPayment,
		monthlyCashFlowAfterTax: (firstYear?.cashFlowAfterTax ?? 0) / 12,
		equity: currentEquity(property, now),
		remainingLoan,
		grossYield: cost > 0 ? grossRent / cost : 0,
		netYield: cost > 0 ? (firstYear?.cashFlowAfterTax ?? 0) / cost : 0,
		annualTaxFoncier: firstYear?.tax ?? 0,
		warnings: projection.warnings,
	};
}

/** Shared FR disclaimer for web + mobile (indicative model). */
export const REAL_ESTATE_ASSUMPTIONS_FR =
	"Hypothèses indicatives : fiscalité simplifiée (pas un moteur de déclaration) ; " +
	"loyers, taxe foncière et charges non récup. indexés au taux de revalorisation du bien " +
	"(pas l’IRL légal), sauf indexation à 0 % ; assurance emprunteur sur capital restant dû ; " +
	"revente simulée à l’horizon ; détention SCI/DIRECT sans effet sur le calcul fiscal " +
	"(seul le régime compte) ; pour une résidence principale, l’exonération de plus-value " +
	"est une hypothèse du modèle (résidence effective à la cession non vérifiée). " +
	"Ne constitue pas un conseil fiscal.";

/**
 * Plain-language definition of real-estate equity (UI label: patrimoine net).
 * Formula: (property value − remaining loan) × ownership share.
 */
export const REAL_ESTATE_EQUITY_DEFINITION_FR =
	"Patrimoine net (aussi appelé équité) : valeur du bien moins le capital restant dû, " +
	"multiplié par ta quote-part. Ce n’est pas le cash-flow mensuel ni le rendement — " +
	"c’est ce que tu « possèdes » réellement sur le bien après la dette.";
