import { describe, expect, it } from "vitest";
import {
	currentLivretRate,
	effectiveLivretRateSeries,
	LIVRET_RATE_SEED,
	mergeLivretRateSeries,
	resolveLivretRateAt,
	type LivretRateStep,
} from "./livret-rates";

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("livret rate series helpers", () => {
	const series: LivretRateStep[] = [
		{ effectiveFrom: "2024-01-01", annualRate: 0.03 },
		{ effectiveFrom: "2025-02-01", annualRate: 0.024 },
	];

	it("resolves the rate in force at a date (last step with effectiveFrom ≤ date)", () => {
		expect(resolveLivretRateAt(series, utc("2024-06-15"))).toBe(0.03);
		expect(resolveLivretRateAt(series, utc("2025-02-01"))).toBe(0.024);
		expect(resolveLivretRateAt(series, utc("2025-08-01"))).toBe(0.024);
	});

	it("uses the first step when the date is before the first palier (D5)", () => {
		expect(resolveLivretRateAt(series, utc("2020-01-01"))).toBe(0.03);
	});

	it("currentLivretRate returns the last palier (A ≡ LDDS)", () => {
		expect(currentLivretRate(series, utc("2025-08-30"))).toBe(0.024);
		expect(currentLivretRate(series)).toBe(0.024);
	});

	it("mergeLivretRateSeries unions by effectiveFrom; incoming wins on conflict", () => {
		const base: LivretRateStep[] = [
			{ effectiveFrom: "2024-01-01", annualRate: 0.03 },
			{ effectiveFrom: "2025-02-01", annualRate: 0.03 },
		];
		const incoming: LivretRateStep[] = [
			{ effectiveFrom: "2025-02-01", annualRate: 0.024 },
			{ effectiveFrom: "2025-08-01", annualRate: 0.02 },
		];
		expect(mergeLivretRateSeries(base, incoming)).toEqual([
			{ effectiveFrom: "2024-01-01", annualRate: 0.03 },
			{ effectiveFrom: "2025-02-01", annualRate: 0.024 },
			{ effectiveFrom: "2025-08-01", annualRate: 0.02 },
		]);
	});

	it("effectiveLivretRateSeries merges cache over the embedded seed", () => {
		const cache: LivretRateStep[] = [
			{
				effectiveFrom: LIVRET_RATE_SEED[LIVRET_RATE_SEED.length - 1].effectiveFrom,
				annualRate: 0.011,
			},
			{ effectiveFrom: "2099-01-01", annualRate: 0.05 },
		];
		const effective = effectiveLivretRateSeries(cache);
		expect(effective.length).toBeGreaterThanOrEqual(LIVRET_RATE_SEED.length);
		expect(resolveLivretRateAt(effective, utc("2099-06-01"))).toBe(0.05);
		expect(
			resolveLivretRateAt(
				effective,
				utc(LIVRET_RATE_SEED[LIVRET_RATE_SEED.length - 1].effectiveFrom),
			),
		).toBe(0.011);
	});

	it("effectiveLivretRateSeries without cache returns the seed", () => {
		expect(effectiveLivretRateSeries()).toEqual(LIVRET_RATE_SEED);
		expect(effectiveLivretRateSeries([])).toEqual(LIVRET_RATE_SEED);
	});

	it("seed covers a multi-year history with known official paliers", () => {
		expect(LIVRET_RATE_SEED.length).toBeGreaterThanOrEqual(5);
		expect(LIVRET_RATE_SEED[0].effectiveFrom < LIVRET_RATE_SEED.at(-1)!.effectiveFrom).toBe(
			true,
		);
		expect(currentLivretRate(LIVRET_RATE_SEED, utc("2025-03-01"))).toBe(0.024);
		expect(currentLivretRate(LIVRET_RATE_SEED, utc("2025-08-30"))).toBe(0.017);
		expect(currentLivretRate(LIVRET_RATE_SEED, utc("2026-08-30"))).toBe(0.017);
	});
});
