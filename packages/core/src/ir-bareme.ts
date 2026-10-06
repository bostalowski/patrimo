/**
 * Official IR progressive barème series (seed ∪ cache).
 * Same family as Livret rates — platforms merge a synced cache; core stays pure.
 */

export type IrBracketBand = {
	/** Inclusive upper bound of the band (quotient €); null = open top band. */
	upperBound: number | null;
	/** Marginal rate for this band (0–1). */
	rate: number;
};

export type IrBaremeTable = {
	/** ISO date when this table starts applying (OpenFisca-style). */
	effectiveFrom: string;
	/** Income year label (e.g. 2025 for revenus 2025 / impôt 2026). */
	incomeYear: number;
	brackets: IrBracketBand[];
};

/** Embedded frais-pro clamp for seed income year 2025 (OpenFisca abatpro). */
export const FRAIS_PRO_ABATEMENT_RATE = 0.1;
export const FRAIS_PRO_MIN_EURO = 509;
export const FRAIS_PRO_MAX_EURO = 14_555;

/**
 * Minimal embedded seed for cold start / offline.
 * Revenus 2025 (impôt 2026) — art. 197 CGI / OpenFisca `2025-01-01`.
 * Upper bounds inclusive: TMI at exactly `upperBound` is that band's rate (E5).
 */
export const IR_BAREME_SEED: IrBaremeTable[] = [
	{
		effectiveFrom: "2025-01-01",
		incomeYear: 2025,
		brackets: [
			{ upperBound: 11_600, rate: 0 },
			{ upperBound: 29_579, rate: 0.11 },
			{ upperBound: 84_577, rate: 0.3 },
			{ upperBound: 181_917, rate: 0.41 },
			{ upperBound: null, rate: 0.45 },
		],
	},
];

function sortedUnique(series: IrBaremeTable[]): IrBaremeTable[] {
	const byDate = new Map<string, IrBaremeTable>();
	for (const table of series) {
		if (!table.effectiveFrom || !Array.isArray(table.brackets)) continue;
		if (table.brackets.length === 0) continue;
		byDate.set(table.effectiveFrom, {
			effectiveFrom: table.effectiveFrom,
			incomeYear: table.incomeYear,
			brackets: table.brackets.map((b) => ({
				upperBound: b.upperBound,
				rate: b.rate,
			})),
		});
	}
	return [...byDate.values()].sort((a, b) =>
		a.effectiveFrom < b.effectiveFrom
			? -1
			: a.effectiveFrom > b.effectiveFrom
				? 1
				: 0,
	);
}

/** Union by effectiveFrom; incoming wins on conflict. */
export function mergeIrBaremeSeries(
	base: IrBaremeTable[],
	incoming: IrBaremeTable[],
): IrBaremeTable[] {
	return sortedUnique([...base, ...incoming]);
}

/** Effective series for math: seed ∪ cache (cache wins on same effectiveFrom). */
export function effectiveIrBaremeSeries(
	cache?: IrBaremeTable[],
): IrBaremeTable[] {
	if (!cache || cache.length === 0) return IR_BAREME_SEED;
	return mergeIrBaremeSeries(IR_BAREME_SEED, cache);
}

/** Chronologically latest dated table in the series (D7). */
export function resolveLatestIrBareme(series: IrBaremeTable[]): IrBaremeTable {
	const sorted = sortedUnique(series);
	if (sorted.length === 0) {
		throw new Error("resolveLatestIrBareme: empty series");
	}
	return sorted[sorted.length - 1]!;
}
