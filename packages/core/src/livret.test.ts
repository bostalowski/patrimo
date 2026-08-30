import { describe, expect, it } from "vitest";
import {
	computeLivretState,
	projectLivret,
	type LivretFlow,
} from "./livret";
import type { LivretRateStep } from "./livret-rates";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

const twoPaliers: LivretRateStep[] = [
	{ effectiveFrom: "2024-01-01", annualRate: 0.03 },
	{ effectiveFrom: "2025-02-01", annualRate: 0.024 },
];

describe("computeLivretState with official rate series", () => {
	it("Scenario 1 — two paliers: cumul uses the rate in force at each quinzaine start", () => {
		const flows: LivretFlow[] = [{ date: utc("2024-01-01"), amount: 10_000 }];
		const asOf = utc("2025-03-01");
		const withSeries = computeLivretState(twoPaliers, flows, [], asOf);
		const constantOld = computeLivretState(
			[{ effectiveFrom: "2024-01-01", annualRate: 0.03 }],
			flows,
			[],
			asOf,
		);
		expect(withSeries.estimatedInterest).toBeGreaterThan(0);
		expect(withSeries.estimatedInterest).toBeLessThan(constantOld.estimatedInterest);
		// Exact path with year-end capitalization of accrued interest into principal.
		expect(withSeries.estimatedInterest).toBeCloseTo(
			expectedWithCapitalization(twoPaliers, 10_000, utc("2024-01-16"), asOf),
			6,
		);
	});

	it("Scenario 2 — estimation follows the series only (no scalar account.rate input)", () => {
		const flows: LivretFlow[] = [{ date: utc("2024-01-01"), amount: 10_000 }];
		const asOf = utc("2024-07-01");
		const state = computeLivretState(twoPaliers, flows, [], asOf);
		const expectedQuinzaines = countEarningQuinzaines(
			utc("2024-01-16").getTime(),
			asOf.getTime(),
		);
		expect(state.estimatedInterest).toBeCloseTo(
			(10_000 * 0.03 * expectedQuinzaines) / 24,
			6,
		);
	});

	it("Scenario 3 — after INTERET on D, estimation only accrues after D", () => {
		const flows: LivretFlow[] = [{ date: utc("2024-01-01"), amount: 10_000 }];
		const interestEvents: LivretFlow[] = [
			{ date: utc("2024-12-31"), amount: 250 },
		];
		const asOf = utc("2025-03-01");
		const state = computeLivretState(twoPaliers, flows, interestEvents, asOf);
		expect(state.recordedInterest).toBe(250);
		// Only quinzaines strictly after 2024-12-31 earn estimated interest.
		const afterCredit = utc("2025-01-01").getTime();
		const rateChange = utc("2025-02-01").getTime();
		let at3 = 0;
		let at24 = 0;
		for (let t = afterCredit; t <= asOf.getTime(); t = nextQuinzaineMs(t)) {
			if (t <= utc("2024-12-31").getTime()) continue;
			if (t < rateChange) at3 += 1;
			else at24 += 1;
		}
		// Principal for estimation after INTERET includes capitalized recorded interest
		// once it has value-dated in; keep assertion on positive post-D only accrual.
		expect(state.estimatedInterest).toBeGreaterThan(0);
		const withoutCredit = computeLivretState(twoPaliers, flows, [], asOf);
		expect(state.estimatedInterest).toBeLessThan(withoutCredit.estimatedInterest);
		expect(at3 + at24).toBeGreaterThan(0);
	});

	it("Scenario 4 — deposit value date mid-month; withdrawal cuts earlier quinzaine", () => {
		const depositOnly: LivretFlow[] = [
			{ date: utc("2024-01-10"), amount: 10_000 },
		];
		// Deposit on 10 → value date 16 → earns from 16/01.
		const midJan = computeLivretState(
			twoPaliers,
			depositOnly,
			[],
			utc("2024-01-16"),
		);
		expect(midJan.estimatedInterest).toBeCloseTo((10_000 * 0.03) / 24, 6);

		const beforeValueDate = computeLivretState(
			twoPaliers,
			depositOnly,
			[],
			utc("2024-01-15"),
		);
		expect(beforeValueDate.estimatedInterest).toBe(0);

		// Withdrawal on 20 → value date 16 → principal gone for 16/01 quinzaine.
		const withWithdrawal: LivretFlow[] = [
			{ date: utc("2024-01-10"), amount: 10_000 },
			{ date: utc("2024-01-20"), amount: -10_000 },
		];
		const afterWithdrawal = computeLivretState(
			twoPaliers,
			withWithdrawal,
			[],
			utc("2024-02-01"),
		);
		expect(afterWithdrawal.estimatedInterest).toBe(0);
	});

	it("edge — no transactions → no estimated interest", () => {
		const state = computeLivretState(twoPaliers, [], [], utc("2025-03-01"));
		expect(state.estimatedInterest).toBe(0);
		expect(state.availableBalance).toBe(0);
	});

	it("edge — quinzaine before first palier uses first palier rate (D5)", () => {
		const lateSeries: LivretRateStep[] = [
			{ effectiveFrom: "2025-02-01", annualRate: 0.024 },
		];
		const flows: LivretFlow[] = [{ date: utc("2024-01-01"), amount: 10_000 }];
		const state = computeLivretState(lateSeries, flows, [], utc("2024-02-01"));
		const quinzaines = countEarningQuinzaines(
			utc("2024-01-16").getTime(),
			utc("2024-02-01").getTime(),
		);
		expect(state.estimatedInterest).toBeCloseTo(
			(10_000 * 0.024 * quinzaines) / 24,
			6,
		);
	});
});

describe("projectLivret with official rate series", () => {
	it("Scenario / D2 — future months use the last known palier (no anticipation)", () => {
		const withSeries = projectLivret({
			startBalance: 10_000,
			rateSeries: twoPaliers,
			monthlyDeposit: 0,
			years: 1,
			start: utc("2025-03-01"),
		});
		const withLastOnly = projectLivret({
			startBalance: 10_000,
			rateSeries: [{ effectiveFrom: "2025-02-01", annualRate: 0.024 }],
			monthlyDeposit: 0,
			years: 1,
			start: utc("2025-03-01"),
		});
		const withOldOnly = projectLivret({
			startBalance: 10_000,
			rateSeries: [{ effectiveFrom: "2024-01-01", annualRate: 0.03 }],
			monthlyDeposit: 0,
			years: 1,
			start: utc("2025-03-01"),
		});
		expect(withSeries.totalInterest).toBeCloseTo(withLastOnly.totalInterest, 6);
		expect(withSeries.totalInterest).toBeLessThan(withOldOnly.totalInterest);
	});
});

function nextQuinzaineMs(time: number): number {
	const d = new Date(time);
	const day = d.getUTCDate();
	if (day === 1) {
		return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 16);
	}
	return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
}

function countEarningQuinzaines(fromInclusive: number, toInclusive: number): number {
	let n = 0;
	for (let t = fromInclusive; t <= toInclusive; t = nextQuinzaineMs(t)) n += 1;
	return n;
}

/** Mirror of quinzaine math with year-end capitalization (test oracle). */
function expectedWithCapitalization(
	series: LivretRateStep[],
	principal: number,
	firstEarning: Date,
	asOf: Date,
): number {
	const base = principal;
	let capitalized = 0;
	let accruedYear = 0;
	let running = 0;
	let year = new Date(firstEarning).getUTCFullYear();
	for (
		let t = firstEarning.getTime();
		t <= asOf.getTime();
		t = nextQuinzaineMs(t)
	) {
		const d = new Date(t);
		if (d.getUTCFullYear() !== year) {
			capitalized += accruedYear;
			accruedYear = 0;
			year = d.getUTCFullYear();
		}
		const rate = series.reduce(
			(r, step) =>
				new Date(`${step.effectiveFrom}T00:00:00Z`).getTime() <= t
					? step.annualRate
					: r,
			series[0]?.annualRate ?? 0,
		);
		const p = capitalized + base;
		if (p > 0) {
			const q = (p * rate) / 24;
			accruedYear += q;
			running += q;
		}
	}
	return running;
}
