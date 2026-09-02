import { describe, expect, it } from "vitest";
import {
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
});

describe("monthlyInsuranceOnBalance", () => {
	it("charges insurance on remaining balance, not initial principal", () => {
		const onFull = monthlyInsuranceOnBalance(200_000, 0.003);
		const onHalf = monthlyInsuranceOnBalance(100_000, 0.003);
		expect(onFull).toBeCloseTo(50, 6);
		expect(onHalf).toBeCloseTo(25, 6);
		expect(onHalf).toBeLessThan(onFull);
	});
});
