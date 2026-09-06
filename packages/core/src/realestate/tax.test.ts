import { describe, expect, it } from "vitest";
import type { Property } from "../schema";
import { FLAT_TAX_RATE, PS_RATE } from "../tax-rules";
import {
	annualTax,
	corporateTax,
	DEFICIT_FONCIER_GLOBAL_CEILING,
	detectDeficitImputationWarning,
	detectMicroCeilingWarning,
	IS_RATE_NORMAL,
	IS_RATE_REDUCED,
	IS_THRESHOLD,
	MICRO_BIC_ABATTEMENT,
	MICRO_BIC_CEILING,
	MICRO_FONCIER_ABATTEMENT,
	MICRO_FONCIER_CEILING,
	PV_IMMO_IR_RATE,
	resaleTax,
} from "./tax";

function baseProperty(overrides: Partial<Property> = {}): Property {
	return {
		id: "p1",
		label: "Test",
		detention: "DIRECT",
		regime: "IR_REEL",
		partDetenue: 1,
		prixAchat: 200_000,
		fraisNotaire: 14_000,
		travaux: 0,
		valeurActuelle: 220_000,
		revaloAnnuelle: 0.02,
		montantEmprunte: 160_000,
		tauxCredit: 0.035,
		dureeMois: 240,
		tauxAssurance: 0.003,
		modeAssurance: "CRD",
		assuranceMensuelle: 0,
		assurancePaliers: [],
		loyerMensuelHC: 1_000,
		chargesNonRecupAnnuelles: 1_200,
		taxeFonciere: 1_500,
		vacancePct: 0,
		fraisGestionPct: 0.08,
		tmiAssocie: 0.3,
		partAmortissable: 0.85,
		dureeAmortissement: 30,
		...overrides,
	};
}

const taxBase = {
	grossRent: 12_000,
	deductibleCharges: 2_000,
	loanInterest: 3_000,
	loanInsurance: 500,
	amortization: 1_000,
	priorDeficit: 0,
	priorAmortization: 0,
};

describe("indicative fiscal ceilings", () => {
	it("exports the CONTRACT indicative constants", () => {
		expect(MICRO_FONCIER_CEILING).toBe(15_000);
		expect(MICRO_BIC_CEILING).toBe(77_700);
		expect(DEFICIT_FONCIER_GLOBAL_CEILING).toBe(10_700);
		expect(MICRO_FONCIER_ABATTEMENT).toBe(0.3);
		expect(MICRO_BIC_ABATTEMENT).toBe(0.5);
		expect(IS_THRESHOLD).toBe(42_500);
		expect(IS_RATE_REDUCED).toBe(0.15);
		expect(IS_RATE_NORMAL).toBe(0.25);
		expect(PV_IMMO_IR_RATE).toBe(0.19);
	});
});

describe("detectMicroCeilingWarning", () => {
	it("warns when IR_MICRO rent exceeds 15_000", () => {
		const property = baseProperty({
			regime: "IR_MICRO",
			loyerMensuelHC: 1_400,
		});
		expect(detectMicroCeilingWarning(property)).toMatch(/15[\s]?000/);
	});

	it("warns when LMNP_MICRO rent exceeds 77_700", () => {
		const property = baseProperty({
			regime: "LMNP_MICRO",
			loyerMensuelHC: 7_000,
		});
		expect(detectMicroCeilingWarning(property)).toMatch(/77[\s]?700/);
	});

	it("returns null under ceiling and for non-micro regimes", () => {
		expect(
			detectMicroCeilingWarning(
				baseProperty({ regime: "IR_MICRO", loyerMensuelHC: 1_000 }),
			),
		).toBeNull();
		expect(
			detectMicroCeilingWarning(baseProperty({ regime: "IR_REEL" })),
		).toBeNull();
	});
});

describe("detectDeficitImputationWarning", () => {
	it("warns when simulated annual imputation exceeds 10_700", () => {
		expect(detectDeficitImputationWarning(12_000, 20_000)).toMatch(
			/10[\s]?700/,
		);
	});

	it("returns null when imputation stays within ceiling or net ≤ 0", () => {
		expect(detectDeficitImputationWarning(5_000, 8_000)).toBeNull();
		expect(detectDeficitImputationWarning(12_000, 0)).toBeNull();
		expect(detectDeficitImputationWarning(12_000, -100)).toBeNull();
	});
});

describe("corporateTax", () => {
	it("is 0 on non-positive profit", () => {
		expect(corporateTax(0)).toBe(0);
		expect(corporateTax(-10)).toBe(0);
	});

	it("applies 15% below the threshold and 25% above", () => {
		expect(corporateTax(10_000)).toBeCloseTo(10_000 * 0.15, 6);
		expect(corporateTax(IS_THRESHOLD)).toBeCloseTo(IS_THRESHOLD * 0.15, 6);
		expect(corporateTax(IS_THRESHOLD + 10_000)).toBeCloseTo(
			IS_THRESHOLD * 0.15 + 10_000 * 0.25,
			6,
		);
	});
});

describe("annualTax regimes", () => {
	it("RESIDENCE_PRINCIPALE is always 0", () => {
		const result = annualTax({
			...taxBase,
			property: baseProperty({ regime: "RESIDENCE_PRINCIPALE" }),
		});
		expect(result.total).toBe(0);
		expect(result.taxableBase).toBe(0);
		expect(result.deficitCarried).toBe(0);
	});

	it("IR_MICRO applies 30% abatement then TMI + PS", () => {
		const result = annualTax({
			property: baseProperty({ regime: "IR_MICRO", tmiAssocie: 0.3 }),
			grossRent: 12_000,
			deductibleCharges: 9_999,
			loanInterest: 9_999,
			loanInsurance: 9_999,
			amortization: 0,
			priorDeficit: 0,
			priorAmortization: 0,
		});
		expect(result.taxableBase).toBeCloseTo(12_000 * 0.7, 6);
		expect(result.total).toBeCloseTo(12_000 * 0.7 * (0.3 + PS_RATE), 4);
		expect(result.is).toBe(0);
	});

	it("LMNP_MICRO applies 50% abatement then TMI + PS", () => {
		const result = annualTax({
			...taxBase,
			property: baseProperty({ regime: "LMNP_MICRO", tmiAssocie: 0.3 }),
			grossRent: 20_000,
		});
		expect(result.taxableBase).toBeCloseTo(20_000 * 0.5, 6);
		expect(result.total).toBeCloseTo(20_000 * 0.5 * (0.3 + PS_RATE), 4);
	});

	it("IR_REEL carries deficit without capping tax engine amounts", () => {
		const result = annualTax({
			property: baseProperty({ regime: "IR_REEL" }),
			grossRent: 5_000,
			deductibleCharges: 2_000,
			loanInterest: 8_000,
			loanInsurance: 500,
			amortization: 0,
			priorDeficit: 0,
			priorAmortization: 0,
		});
		expect(result.total).toBe(0);
		expect(result.deficitCarried).toBeCloseTo(5_500, 4);
	});

	it("IR_REEL with prior deficit reduces the taxable base", () => {
		const result = annualTax({
			...taxBase,
			property: baseProperty({ regime: "IR_REEL", tmiAssocie: 0.3 }),
			priorDeficit: 4_000,
		});
		expect(result.taxableBase).toBeCloseTo(2_500, 4);
		expect(result.deficitCarried).toBe(0);
		expect(result.total).toBeCloseTo(2_500 * (0.3 + PS_RATE), 4);
	});

	it("LMNP_REEL defers amortization when operating result is negative", () => {
		const result = annualTax({
			property: baseProperty({ regime: "LMNP_REEL" }),
			grossRent: 5_000,
			deductibleCharges: 2_000,
			loanInterest: 4_000,
			loanInsurance: 500,
			amortization: 3_000,
			priorDeficit: 1_000,
			priorAmortization: 500,
		});
		expect(result.total).toBe(0);
		expect(result.deficitCarried).toBeCloseTo(2_500, 4);
		expect(result.amortizationDeferred).toBeCloseTo(3_500, 4);
		expect(result.amortizationUsed).toBe(0);
	});

	it("LMNP_REEL uses amortization after absorbing prior deficit", () => {
		const result = annualTax({
			property: baseProperty({ regime: "LMNP_REEL", tmiAssocie: 0.3 }),
			grossRent: 20_000,
			deductibleCharges: 2_000,
			loanInterest: 3_000,
			loanInsurance: 500,
			amortization: 4_000,
			priorDeficit: 1_000,
			priorAmortization: 500,
		});
		expect(result.amortizationUsed).toBeCloseTo(4_500, 4);
		expect(result.amortizationDeferred).toBe(0);
		expect(result.taxableBase).toBeCloseTo(9_000, 4);
		expect(result.total).toBeCloseTo(9_000 * (0.3 + PS_RATE), 4);
		expect(result.deficitCarried).toBe(0);
	});

	it("IS applies corporate tax on positive result and carries deficit otherwise", () => {
		const loss = annualTax({
			...taxBase,
			property: baseProperty({ regime: "IS" }),
			grossRent: 1_000,
			amortization: 10_000,
		});
		expect(loss.total).toBe(0);
		expect(loss.deficitCarried).toBeGreaterThan(0);

		const profit = annualTax({
			...taxBase,
			property: baseProperty({ regime: "IS" }),
			grossRent: 30_000,
			amortization: 1_000,
			priorDeficit: 2_000,
		});
		expect(profit.taxableBase).toBeCloseTo(21_500, 4);
		expect(profit.is).toBeCloseTo(corporateTax(21_500), 4);
		expect(profit.total).toBe(profit.is);
		expect(profit.ir).toBe(0);
		expect(profit.ps).toBe(0);
	});
});

describe("resaleTax", () => {
	it("RESIDENCE_PRINCIPALE has no capital-gain tax", () => {
		const result = resaleTax({
			property: baseProperty({ regime: "RESIDENCE_PRINCIPALE" }),
			salePrice: 300_000,
			remainingLoan: 50_000,
			holdingYears: 10,
			cumulativeAmortization: 0,
			cumulativeAmortizationDeducted: 0,
		});
		expect(result.capitalGainTax).toBe(0);
		expect(result.totalTax).toBe(0);
		expect(result.netProceeds).toBe(250_000);
		expect(result.grossPlusValue).toBe(86_000);
	});

	it("IS taxes the VNC gain at corporate rates then distribution", () => {
		const property = baseProperty({
			regime: "IS",
			prixAchat: 200_000,
			fraisNotaire: 0,
			travaux: 0,
			montantEmprunte: 100_000,
		});
		const result = resaleTax({
			property,
			salePrice: 300_000,
			remainingLoan: 40_000,
			holdingYears: 5,
			cumulativeAmortization: 20_000,
			cumulativeAmortizationDeducted: 0,
		});
		expect(result.grossPlusValue).toBe(120_000);
		expect(result.capitalGainTax).toBeCloseTo(corporateTax(120_000), 4);
		const netSociete = 300_000 - 40_000 - result.capitalGainTax;
		const distributable = Math.max(0, netSociete - 100_000);
		expect(result.distributionTax).toBeCloseTo(
			distributable * FLAT_TAX_RATE,
			4,
		);
		expect(result.totalTax).toBeCloseTo(
			result.capitalGainTax + result.distributionTax,
			4,
		);
		expect(result.netProceeds).toBeCloseTo(
			netSociete - result.distributionTax,
			4,
		);
	});

	it("IR_REEL applies holding-year abattements on PV", () => {
		const property = baseProperty({
			regime: "IR_REEL",
			prixAchat: 200_000,
			fraisNotaire: 0,
			travaux: 0,
		});
		const short = resaleTax({
			property,
			salePrice: 300_000,
			remainingLoan: 0,
			holdingYears: 3,
			cumulativeAmortization: 0,
			cumulativeAmortizationDeducted: 0,
		});
		expect(short.grossPlusValue).toBe(100_000);
		expect(short.capitalGainTax).toBeCloseTo(
			100_000 * PV_IMMO_IR_RATE + 100_000 * PS_RATE,
			4,
		);

		const mid = resaleTax({
			property,
			salePrice: 300_000,
			remainingLoan: 0,
			holdingYears: 10,
			cumulativeAmortization: 0,
			cumulativeAmortizationDeducted: 0,
		});
		// IR abattement (10-5)*6% = 30%; PS (min(10,21)-5)*1.65% = 8.25%
		const irPV = 100_000 * (1 - 0.3) * PV_IMMO_IR_RATE;
		const psPV = 100_000 * (1 - 0.0825) * PS_RATE;
		expect(mid.capitalGainTax).toBeCloseTo(irPV + psPV, 4);

		const long = resaleTax({
			property,
			salePrice: 300_000,
			remainingLoan: 0,
			holdingYears: 22,
			cumulativeAmortization: 0,
			cumulativeAmortizationDeducted: 0,
		});
		expect(long.capitalGainTax).toBeLessThan(mid.capitalGainTax);
		expect(long.capitalGainTax).toBeGreaterThan(0);

		const late = resaleTax({
			property,
			salePrice: 300_000,
			remainingLoan: 0,
			holdingYears: 25,
			cumulativeAmortization: 0,
			cumulativeAmortizationDeducted: 0,
		});
		expect(late.capitalGainTax).toBeLessThan(long.capitalGainTax);
	});

	it("LMNP_REEL reduces acquisition by deducted amortization", () => {
		const property = baseProperty({
			regime: "LMNP_REEL",
			prixAchat: 200_000,
			fraisNotaire: 0,
			travaux: 0,
		});
		const result = resaleTax({
			property,
			salePrice: 300_000,
			remainingLoan: 0,
			holdingYears: 5,
			cumulativeAmortization: 50_000,
			cumulativeAmortizationDeducted: 40_000,
		});
		expect(result.grossPlusValue).toBe(140_000);
	});

	it("full PS abattement at 30 years zeroes PV tax", () => {
		const property = baseProperty({
			regime: "IR_REEL",
			prixAchat: 200_000,
			fraisNotaire: 0,
			travaux: 0,
		});
		const result = resaleTax({
			property,
			salePrice: 300_000,
			remainingLoan: 0,
			holdingYears: 30,
			cumulativeAmortization: 0,
			cumulativeAmortizationDeducted: 0,
		});
		expect(result.capitalGainTax).toBe(0);
		expect(result.totalTax).toBe(0);
	});
});
