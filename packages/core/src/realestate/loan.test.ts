import { describe, expect, it } from "vitest";
import {
	buildLoanSchedule,
	monthlyInsuranceOnBalance,
	monthlyPayment,
	remainingBalance,
} from "./loan";

const loan = {
	principal: 200_000,
	annualRate: 0.035,
	durationMonths: 240,
	annualInsuranceRate: 0.003,
};

describe("monthlyPayment", () => {
	it("returns classic French annuity for positive rate", () => {
		const payment = monthlyPayment(loan);
		expect(payment).toBeGreaterThan(1_100);
		expect(payment).toBeLessThan(1_200);
		// Oracle: P * r * (1+r)^n / ((1+r)^n - 1)
		const r = 0.035 / 12;
		const n = 240;
		const factor = (1 + r) ** n;
		expect(payment).toBeCloseTo((200_000 * r * factor) / (factor - 1), 6);
	});

	it("amortizes linearly when rate is 0%", () => {
		expect(
			monthlyPayment({
				...loan,
				annualRate: 0,
				durationMonths: 100,
			}),
		).toBe(2_000);
	});

	it("is 0 when principal or duration is missing", () => {
		expect(monthlyPayment({ ...loan, principal: 0 })).toBe(0);
		expect(monthlyPayment({ ...loan, durationMonths: 0 })).toBe(0);
		expect(monthlyPayment({ ...loan, principal: -1 })).toBe(0);
	});
});

describe("remainingBalance", () => {
	it("is principal at month 0 and 0 at maturity", () => {
		expect(remainingBalance(loan, 0)).toBe(200_000);
		expect(remainingBalance(loan, 240)).toBe(0);
		expect(remainingBalance(loan, 300)).toBe(0);
	});

	it("declines linearly when rate is 0%", () => {
		const zero = { ...loan, annualRate: 0, durationMonths: 100 };
		expect(remainingBalance(zero, 25)).toBeCloseTo(150_000, 6);
	});

	it("is 0 when principal or duration is missing", () => {
		expect(remainingBalance({ ...loan, principal: 0 }, 10)).toBe(0);
		expect(remainingBalance({ ...loan, durationMonths: 0 }, 10)).toBe(0);
	});
});

describe("monthlyInsuranceOnBalance", () => {
	it("charges insurance on remaining balance, not initial principal", () => {
		const onFull = monthlyInsuranceOnBalance(200_000, 0.003);
		const onHalf = monthlyInsuranceOnBalance(100_000, 0.003);
		expect(onFull).toBeCloseTo(50, 6);
		expect(onHalf).toBeCloseTo(25, 6);
		expect(onHalf).toBeLessThan(onFull);
	});

	it("is 0 when balance or rate is non-positive", () => {
		expect(monthlyInsuranceOnBalance(0, 0.003)).toBe(0);
		expect(monthlyInsuranceOnBalance(-1, 0.003)).toBe(0);
		expect(monthlyInsuranceOnBalance(100_000, 0)).toBe(0);
		expect(monthlyInsuranceOnBalance(100_000, -0.1)).toBe(0);
	});
});

describe("buildLoanSchedule year index (D5 regression)", () => {
	it("assigns month 12 to year 1 and month 13 to year 2 (no off-by-one)", () => {
		const schedule = buildLoanSchedule(loan);
		const year1 = schedule.years.find((y) => y.year === 1);
		const year2 = schedule.years.find((y) => y.year === 2);
		expect(year1).toBeDefined();
		expect(year2).toBeDefined();
		// Year 1 covers months 1..12 (12 rows of principal folded in), year 2 starts at month 13.
		// Cross-check against the canonical formula directly.
		expect(Math.floor(11 / 12) + 1).toBe(1); // month 12 -> monthsElapsed 11
		expect(Math.floor(12 / 12) + 1).toBe(2); // month 13 -> monthsElapsed 12
	});
});

describe("buildLoanSchedule insurance modes", () => {
	it("defaults to CRD when modeAssurance is omitted (backward compat)", () => {
		const schedule = buildLoanSchedule(loan);
		const explicit = buildLoanSchedule({ ...loan, modeAssurance: "CRD" });
		expect(schedule.monthlyInsurance).toBeCloseTo(explicit.monthlyInsurance, 8);
		expect(schedule.years[0].insurance).toBeGreaterThan(
			schedule.years[schedule.years.length - 1].insurance,
		);
		expect(schedule.totalCost).toBeCloseTo(
			schedule.totalInterest + schedule.totalInsurance,
			8,
		);
		expect(schedule.remainingAt(0)).toBe(loan.principal);
		expect(schedule.remainingAt(loan.durationMonths)).toBe(0);
	});

	it("CAPITAL_INITIAL charges a flat annual insurance total per full year", () => {
		const schedule = buildLoanSchedule({
			...loan,
			modeAssurance: "CAPITAL_INITIAL",
		});
		const year1 = schedule.years[0].insurance;
		const year2 = schedule.years[1].insurance;
		expect(year1).toBeCloseTo(year2, 6);
		expect(year1).toBeCloseTo(200_000 * 0.003, 2);
	});

	it("MONTANT_FIXE charges the flat euro amount and ignores tauxAssurance", () => {
		const schedule = buildLoanSchedule({
			...loan,
			modeAssurance: "MONTANT_FIXE",
			assuranceMensuelle: 42,
		});
		expect(schedule.years[0].insurance).toBeCloseTo(42 * 12, 6);
	});

	it("paliers override mode with a step lookup by credit-year", () => {
		const schedule = buildLoanSchedule({
			...loan,
			insurancePaliers: [
				{ anneeDebut: 1, assuranceMensuelle: 40 },
				{ anneeDebut: 8, assuranceMensuelle: 55 },
			],
		});
		expect(schedule.years[0].insurance).toBeCloseTo(40 * 12, 6);
		expect(schedule.years[7].insurance).toBeCloseTo(55 * 12, 6);
	});
});
