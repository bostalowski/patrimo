import type { DiversificationCoherenceResult } from "./diversification-coherence";
import { diversificationKeyLabel } from "./diversification-labels";
import { diversificationBandSignedDelta } from "./diversification-targets";

export const THIS_MONTH_DIVERSIFICATION_LINK = "/diversification";

/**
 * Stock `band_drift` findings with tone `breach`, sorted by descending
 * |signedΔ| (ADR 0012), capped at `limit` (D8 default 3).
 */
export function stockBandDriftBreachKeys(
	coherence: DiversificationCoherenceResult | null,
	limit = 3,
): string[] {
	if (!coherence || limit <= 0) return [];

	const bandByKey = new Map(
		coherence.bands.map((band) => [band.key, band] as const),
	);

	const scored = coherence.findings
		.map((finding, index) => {
			if (finding.kind !== "band_drift" || finding.tone !== "breach") {
				return null;
			}
			const band = bandByKey.get(finding.key);
			const absDelta = band
				? Math.abs(
						diversificationBandSignedDelta(
							band.stockPct,
							band.minPct,
							band.maxPct,
						),
					)
				: 0;
			return { key: finding.key, absDelta, index };
		})
		.filter((row): row is NonNullable<typeof row> => row !== null);

	scored.sort((a, b) => b.absDelta - a.absDelta || a.index - b.index);

	return scored.slice(0, limit).map((row) => row.key);
}

/**
 * Short Dashboard exposure alert body, or null when no keys.
 */
export function thisMonthExposureAlertBody(keys: string[]): string | null {
	if (keys.length === 0) return null;
	const labels = keys.map((key) => diversificationKeyLabel(key)).join(", ");
	return `Exposition hors bande : ${labels}.`;
}
