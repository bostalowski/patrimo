import { describe, expect, it } from "vitest";
import type { DiversificationCoherenceResult } from "./diversification-coherence";
import {
	stockBandDriftBreachKeys,
	thisMonthExposureAlertBody,
} from "./this-month-copy";

function coherence(
	overrides: Partial<DiversificationCoherenceResult> = {},
): DiversificationCoherenceResult {
	return {
		bands: [],
		findings: [],
		status: "aligned",
		liquidInvested: 10_000,
		annualDcaTotal: 6_000,
		...overrides,
	};
}

describe("this-month-copy", () => {
	it("returns no breach keys when coherence is null", () => {
		expect(stockBandDriftBreachKeys(null)).toEqual([]);
	});

	it("ignores watch band_drift and flow_misalign-only breaches", () => {
		const result = stockBandDriftBreachKeys(
			coherence({
				status: "misaligned",
				bands: [
					{ key: "US", minPct: 0.4, maxPct: 0.6, stockPct: 0.61, flowPct: 0.5 },
					{
						key: "EUROPE",
						minPct: 0.2,
						maxPct: 0.3,
						stockPct: 0.1,
						flowPct: 0.25,
					},
				],
				findings: [
					{ kind: "band_drift", key: "US", tone: "watch" },
					{ kind: "flow_misalign", key: "US", tone: "breach" },
					{ kind: "band_drift", key: "EUROPE", tone: "breach" },
				],
			}),
		);
		expect(result).toEqual(["EUROPE"]);
	});

	it("orders stock band_drift breaches by descending |signedΔ| and caps at 3", () => {
		const result = stockBandDriftBreachKeys(
			coherence({
				status: "misaligned",
				bands: [
					{ key: "US", minPct: 0.4, maxPct: 0.5, stockPct: 0.6, flowPct: null },
					{
						key: "EUROPE",
						minPct: 0.2,
						maxPct: 0.3,
						stockPct: 0.05,
						flowPct: null,
					},
					{
						key: "CRYPTO",
						minPct: 0,
						maxPct: 0.05,
						stockPct: 0.2,
						flowPct: null,
					},
					{
						key: "EMERGING",
						minPct: 0.05,
						maxPct: 0.1,
						stockPct: 0.12,
						flowPct: null,
					},
				],
				findings: [
					{ kind: "band_drift", key: "US", tone: "breach" },
					{ kind: "band_drift", key: "EUROPE", tone: "breach" },
					{ kind: "band_drift", key: "CRYPTO", tone: "breach" },
					{ kind: "band_drift", key: "EMERGING", tone: "breach" },
				],
			}),
		);
		// |Δ|: EUROPE 0.15, CRYPTO 0.15, US 0.10, EMERGING 0.02 — top 3
		expect(result).toHaveLength(3);
		expect(result[0]).toBe("EUROPE");
		expect(result).toContain("CRYPTO");
		expect(result).toContain("US");
		expect(result).not.toContain("EMERGING");
	});

	it("builds exposure alert body listing breach labels", () => {
		const body = thisMonthExposureAlertBody(["EUROPE", "US"]);
		expect(body).toMatch(/Europe/i);
		expect(body).toMatch(/États-Unis|US|Amérique/i);
		expect(body).toMatch(/Exposition hors bande/i);
	});

	it("returns null exposure alert body when no keys", () => {
		expect(thisMonthExposureAlertBody([])).toBeNull();
	});
});
