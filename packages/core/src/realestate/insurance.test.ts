import { describe, expect, it } from "vitest";
import type { LoanInsurancePalier } from "../schema";
import {
	creditYearFromMonthsElapsed,
	filterPaliersForProperty,
	monthlyInsuranceForLoan,
	normalizeLoanInsurancePaliers,
} from "./insurance";

describe("creditYearFromMonthsElapsed (D5 canonical formula)", () => {
	it("resolves monthsElapsed = 0 (first month, before first payment) to year 1", () => {
		expect(creditYearFromMonthsElapsed(0)).toBe(1);
	});

	it("matches the pre-existing 1-based ceil(month/12) loop at the 12-month boundary", () => {
		// month=12 (1-based) -> monthsElapsed=11 -> year 1; month=13 -> monthsElapsed=12 -> year 2
		expect(creditYearFromMonthsElapsed(11)).toBe(1);
		expect(creditYearFromMonthsElapsed(12)).toBe(2);
	});

	it("floors within a year and increments on year boundaries", () => {
		expect(creditYearFromMonthsElapsed(23)).toBe(2);
		expect(creditYearFromMonthsElapsed(24)).toBe(3);
	});
});

describe("normalizeLoanInsurancePaliers", () => {
	const propertyId = "p1";

	it("rejects anneeDebut < 1", () => {
		const rows: LoanInsurancePalier[] = [
			{ propertyId, anneeDebut: 0, assuranceMensuelle: 40 },
		];
		expect(normalizeLoanInsurancePaliers(rows)).toEqual([]);
	});

	it("rejects assuranceMensuelle <= 0", () => {
		const rows: LoanInsurancePalier[] = [
			{ propertyId, anneeDebut: 1, assuranceMensuelle: 0 },
			{ propertyId, anneeDebut: 2, assuranceMensuelle: -5 },
		];
		expect(normalizeLoanInsurancePaliers(rows)).toEqual([]);
	});

	it("last row in sheet order wins on duplicate propertyId+anneeDebut", () => {
		const rows: LoanInsurancePalier[] = [
			{ propertyId, anneeDebut: 1, assuranceMensuelle: 40 },
			{ propertyId, anneeDebut: 1, assuranceMensuelle: 45 },
		];
		const result = normalizeLoanInsurancePaliers(rows);
		expect(result).toHaveLength(1);
		expect(result[0].assuranceMensuelle).toBe(45);
	});

	it("is idempotent on re-normalization (no duplicate accumulation)", () => {
		const rows: LoanInsurancePalier[] = [
			{ propertyId, anneeDebut: 1, assuranceMensuelle: 40 },
			{ propertyId, anneeDebut: 8, assuranceMensuelle: 55 },
		];
		const once = normalizeLoanInsurancePaliers(rows);
		const twice = normalizeLoanInsurancePaliers(once);
		expect(twice).toHaveLength(2);
	});

	it("keeps valid rows for distinct properties independently", () => {
		const rows: LoanInsurancePalier[] = [
			{ propertyId: "p1", anneeDebut: 1, assuranceMensuelle: 40 },
			{ propertyId: "p2", anneeDebut: 1, assuranceMensuelle: 60 },
		];
		expect(normalizeLoanInsurancePaliers(rows)).toHaveLength(2);
	});
});

describe("filterPaliersForProperty", () => {
	it("filters and strips propertyId", () => {
		const rows: LoanInsurancePalier[] = [
			{ propertyId: "p1", anneeDebut: 1, assuranceMensuelle: 40 },
			{ propertyId: "p2", anneeDebut: 1, assuranceMensuelle: 60 },
		];
		expect(filterPaliersForProperty(rows, "p1")).toEqual([
			{ anneeDebut: 1, assuranceMensuelle: 40 },
		]);
	});
});

describe("monthlyInsuranceForLoan — modes (no paliers)", () => {
	it("CRD: charges on remaining balance", () => {
		const value = monthlyInsuranceForLoan({
			remainingBalance: 100_000,
			monthsElapsed: 12,
			principal: 200_000,
			annualInsuranceRate: 0.003,
			modeAssurance: "CRD",
			assuranceMensuelle: 0,
		});
		expect(value).toBeCloseTo(25, 6);
	});

	it("CAPITAL_INITIAL: flat on initial principal regardless of remaining balance", () => {
		const value = monthlyInsuranceForLoan({
			remainingBalance: 100_000,
			monthsElapsed: 12,
			principal: 200_000,
			annualInsuranceRate: 0.003,
			modeAssurance: "CAPITAL_INITIAL",
			assuranceMensuelle: 0,
		});
		expect(value).toBeCloseTo(50, 6);
	});

	it("MONTANT_FIXE: flat euro amount", () => {
		const value = monthlyInsuranceForLoan({
			remainingBalance: 100_000,
			monthsElapsed: 12,
			principal: 200_000,
			annualInsuranceRate: 0.003,
			modeAssurance: "MONTANT_FIXE",
			assuranceMensuelle: 42,
		});
		expect(value).toBe(42);
	});

	it("MONTANT_FIXE with assuranceMensuelle = 0 stays 0 (no fallback to tauxAssurance)", () => {
		const value = monthlyInsuranceForLoan({
			remainingBalance: 100_000,
			monthsElapsed: 12,
			principal: 200_000,
			annualInsuranceRate: 0.003,
			modeAssurance: "MONTANT_FIXE",
			assuranceMensuelle: 0,
		});
		expect(value).toBe(0);
	});

	it("CRD/CAPITAL_INITIAL with tauxAssurance = 0 stays 0 (ignores assuranceMensuelle)", () => {
		expect(
			monthlyInsuranceForLoan({
				remainingBalance: 100_000,
				monthsElapsed: 12,
				principal: 200_000,
				annualInsuranceRate: 0,
				modeAssurance: "CRD",
				assuranceMensuelle: 42,
			}),
		).toBe(0);
		expect(
			monthlyInsuranceForLoan({
				remainingBalance: 100_000,
				monthsElapsed: 12,
				principal: 200_000,
				annualInsuranceRate: 0,
				modeAssurance: "CAPITAL_INITIAL",
				assuranceMensuelle: 42,
			}),
		).toBe(0);
	});

	it("remaining balance 0 -> insurance 0 regardless of mode", () => {
		expect(
			monthlyInsuranceForLoan({
				remainingBalance: 0,
				monthsElapsed: 12,
				principal: 200_000,
				annualInsuranceRate: 0.003,
				modeAssurance: "CAPITAL_INITIAL",
				assuranceMensuelle: 42,
			}),
		).toBe(0);
	});
});

describe("monthlyInsuranceForLoan — paliers override mode", () => {
	it("paliers override the property's formula mode entirely", () => {
		const paliers = [{ anneeDebut: 1, assuranceMensuelle: 40 }];
		const value = monthlyInsuranceForLoan({
			remainingBalance: 100_000,
			monthsElapsed: 0,
			principal: 200_000,
			annualInsuranceRate: 0.003,
			modeAssurance: "CRD",
			assuranceMensuelle: 0,
			paliers,
		});
		expect(value).toBe(40);
	});

	it("no paliers -> formula mode applies (no error)", () => {
		const value = monthlyInsuranceForLoan({
			remainingBalance: 100_000,
			monthsElapsed: 0,
			principal: 200_000,
			annualInsuranceRate: 0.003,
			modeAssurance: "CRD",
			assuranceMensuelle: 0,
			paliers: [],
		});
		expect(value).toBeCloseTo(25, 6);
	});

	it("gaps: years 2-7 use year-1 amount; years >= 8 use year-8 amount", () => {
		const paliers = [
			{ anneeDebut: 1, assuranceMensuelle: 40 },
			{ anneeDebut: 8, assuranceMensuelle: 55 },
		];
		const forYear = (y: number) =>
			monthlyInsuranceForLoan({
				remainingBalance: 100_000,
				monthsElapsed: (y - 1) * 12,
				principal: 200_000,
				annualInsuranceRate: 0.003,
				modeAssurance: "CRD",
				assuranceMensuelle: 0,
				paliers,
			});
		expect(forYear(1)).toBe(40);
		expect(forYear(5)).toBe(40);
		expect(forYear(7)).toBe(40);
		expect(forYear(8)).toBe(55);
		expect(forYear(20)).toBe(55);
	});

	it("loan remaining 0 -> 0 even with paliers", () => {
		const value = monthlyInsuranceForLoan({
			remainingBalance: 0,
			monthsElapsed: 0,
			principal: 200_000,
			annualInsuranceRate: 0.003,
			modeAssurance: "CRD",
			assuranceMensuelle: 0,
			paliers: [{ anneeDebut: 1, assuranceMensuelle: 40 }],
		});
		expect(value).toBe(0);
	});
});
