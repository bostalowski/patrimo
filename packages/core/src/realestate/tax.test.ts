import { describe, expect, it } from "vitest";
import type { Property } from "../schema";
import {
	annualTax,
	DEFICIT_FONCIER_GLOBAL_CEILING,
	detectDeficitImputationWarning,
	detectMicroCeilingWarning,
	MICRO_BIC_CEILING,
	MICRO_FONCIER_CEILING,
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

describe("indicative fiscal ceilings", () => {
	it("exports the CONTRACT indicative constants", () => {
		expect(MICRO_FONCIER_CEILING).toBe(15_000);
		expect(MICRO_BIC_CEILING).toBe(77_700);
		expect(DEFICIT_FONCIER_GLOBAL_CEILING).toBe(10_700);
	});
});

describe("detectMicroCeilingWarning", () => {
	it("warns when IR_MICRO rent exceeds 15_000", () => {
		const property = baseProperty({
			regime: "IR_MICRO",
			loyerMensuelHC: 1_400, // 16_800 / year
		});
		expect(detectMicroCeilingWarning(property)).toMatch(/15[\s]?000/);
	});

	it("warns when LMNP_MICRO rent exceeds 77_700", () => {
		const property = baseProperty({
			regime: "LMNP_MICRO",
			loyerMensuelHC: 7_000, // 84_000 / year
		});
		expect(detectMicroCeilingWarning(property)).toMatch(/77[\s]?700/);
	});

	it("returns null under ceiling", () => {
		expect(
			detectMicroCeilingWarning(
				baseProperty({ regime: "IR_MICRO", loyerMensuelHC: 1_000 }),
			),
		).toBeNull();
	});
});

describe("detectDeficitImputationWarning", () => {
	it("warns when simulated annual imputation exceeds 10_700", () => {
		expect(detectDeficitImputationWarning(12_000, 20_000)).toMatch(
			/10[\s]?700/,
		);
	});

	it("returns null when imputation stays within ceiling", () => {
		expect(detectDeficitImputationWarning(5_000, 8_000)).toBeNull();
	});
});

describe("annualTax regimes (smoke)", () => {
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
		expect(result.total).toBeCloseTo(12_000 * 0.7 * (0.3 + 0.172), 4);
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
		// net = 5000 - 2000 - 8000 - 500 = -5500 → carried as positive deficit stock
		expect(result.total).toBe(0);
		expect(result.deficitCarried).toBeCloseTo(5_500, 4);
	});
});
