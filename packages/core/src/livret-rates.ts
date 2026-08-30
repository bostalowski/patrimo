/** Official Livret A / LDDS regulated annual rate steps (fraction, e.g. 0.03 = 3 %). */

export type LivretRateStep = {
	effectiveFrom: string;
	annualRate: number;
};

/**
 * Minimal embedded seed for cold start / offline (A ≡ LDDS).
 * Platforms merge a synced cache on top; OpenFisca YAML is the network source.
 */
export const LIVRET_RATE_SEED: LivretRateStep[] = [
	{ effectiveFrom: "2015-08-01", annualRate: 0.0075 },
	{ effectiveFrom: "2020-02-01", annualRate: 0.005 },
	{ effectiveFrom: "2022-02-01", annualRate: 0.01 },
	{ effectiveFrom: "2022-08-01", annualRate: 0.02 },
	{ effectiveFrom: "2023-02-01", annualRate: 0.03 },
	{ effectiveFrom: "2023-08-01", annualRate: 0.03 },
	{ effectiveFrom: "2025-02-01", annualRate: 0.024 },
	{ effectiveFrom: "2025-08-01", annualRate: 0.017 },
	{ effectiveFrom: "2026-02-01", annualRate: 0.015 },
	{ effectiveFrom: "2026-08-01", annualRate: 0.017 },
];

function toTime(isoDate: string): number {
	return new Date(`${isoDate}T00:00:00Z`).getTime();
}

function sortedUnique(series: LivretRateStep[]): LivretRateStep[] {
	const byDate = new Map<string, LivretRateStep>();
	for (const step of series) {
		if (!step.effectiveFrom || !Number.isFinite(step.annualRate)) continue;
		byDate.set(step.effectiveFrom, {
			effectiveFrom: step.effectiveFrom,
			annualRate: step.annualRate,
		});
	}
	return [...byDate.values()].sort((a, b) =>
		a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0,
	);
}

/** Rate in force at `date`: last step with effectiveFrom ≤ date; else first step (D5). */
export function resolveLivretRateAt(series: LivretRateStep[], date: Date): number {
	const sorted = sortedUnique(series);
	if (sorted.length === 0) return 0;
	const time = date.getTime();
	let rate = sorted[0].annualRate;
	for (const step of sorted) {
		if (toTime(step.effectiveFrom) <= time) rate = step.annualRate;
		else break;
	}
	return rate;
}

/** Last palier on or before `asOf` (defaults to now). A ≡ LDDS. */
export function currentLivretRate(
	series: LivretRateStep[],
	asOf: Date = new Date(),
): number {
	return resolveLivretRateAt(series, asOf);
}

/** Union by effectiveFrom; incoming wins on conflict. */
export function mergeLivretRateSeries(
	base: LivretRateStep[],
	incoming: LivretRateStep[],
): LivretRateStep[] {
	return sortedUnique([...base, ...incoming]);
}

/** Effective series for math: seed ∪ cache (cache wins on same effectiveFrom). */
export function effectiveLivretRateSeries(
	cache?: LivretRateStep[],
): LivretRateStep[] {
	if (!cache || cache.length === 0) return LIVRET_RATE_SEED;
	return mergeLivretRateSeries(LIVRET_RATE_SEED, cache);
}
