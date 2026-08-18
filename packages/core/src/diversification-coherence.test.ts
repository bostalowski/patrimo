import { describe, expect, it } from "vitest";
import {
	annualizeDcaAmount,
	assessDiversificationCoherence,
	computeFlowMixByAsset,
} from "./diversification-coherence";
import type { AssetPosition } from "./portfolio";
import type {
	Asset,
	DcaConfig,
	DiversificationTarget,
	GeographicAllocation,
} from "./schema";

function asset(id: string, type: Asset["type"] = "ETF"): Asset {
	return { id, label: id, type, source: "yahoo", currency: "EUR" };
}

const assets: Asset[] = [
	asset("WPEA"),
	asset("NA-FUND"),
	asset("EU-FUND"),
	asset("BTC", "CRYPTO"),
	asset("CASH", "CASH"),
];

function position(assetId: string, marketValue: number): AssetPosition {
	return {
		assetId,
		quantity: 1,
		costBasis: marketValue,
		pru: marketValue,
		realizedIncome: 0,
		realizedPnL: 0,
		fees: 0,
		currentPrice: marketValue,
		marketValue,
		unrealizedPnL: 0,
		totalReturn: 0,
		totalReturnPct: 0,
	};
}

function geo(
	assetId: string,
	country: string,
	weight: number,
): GeographicAllocation {
	return { assetId, country, weight, source: "manual" };
}

function band(
	key: string,
	minPct: number,
	maxPct: number,
): DiversificationTarget {
	return { key, minPct, maxPct };
}

function monthly(assetId: string, amount: number): DcaConfig {
	return {
		id: assetId,
		label: assetId,
		envelope: "PEA",
		amount,
		frequency: "MENSUEL",
		lines: [{ assetIds: [assetId], targetPct: 1 }],
	};
}

describe("annualizeDcaAmount", () => {
	it("multiplies monthly by 12", () => {
		expect(annualizeDcaAmount(100, "MENSUEL")).toBe(1200);
	});
	it("multiplies quarterly by 4", () => {
		expect(annualizeDcaAmount(300, "TRIMESTRIEL")).toBe(1200);
	});
	it("keeps annual as-is", () => {
		expect(annualizeDcaAmount(1800, "ANNUEL")).toBe(1800);
	});
});

describe("computeFlowMixByAsset", () => {
	it("returns empty map for no DCA", () => {
		expect(computeFlowMixByAsset([])).toEqual(new Map());
	});

	it("computes annual EUR per asset from a monthly plan", () => {
		expect(computeFlowMixByAsset([monthly("WPEA", 400)]).get("WPEA")).toBe(4800);
	});

	it("splits basket contributions evenly across assetIds in a line", () => {
		const result = computeFlowMixByAsset([
			{
				id: "pea",
				label: "PEA",
				envelope: "PEA",
				amount: 400,
				frequency: "MENSUEL",
				lines: [
					{ assetIds: ["WPEA", "DCAM"], targetPct: 0.75 },
					{ assetIds: ["PLEM"], targetPct: 0.25 },
				],
			},
		]);
		expect(result.get("WPEA")).toBeCloseTo((4800 * 0.75) / 2, 5);
		expect(result.get("DCAM")).toBeCloseTo((4800 * 0.75) / 2, 5);
		expect(result.get("PLEM")).toBeCloseTo(4800 * 0.25, 5);
	});
});

describe("assessDiversificationCoherence", () => {
	it("returns null when targets is empty", () => {
		expect(
			assessDiversificationCoherence({
				targets: [],
				positions: [position("WPEA", 1000)],
				dca: [],
				geographicAllocations: [geo("WPEA", "US", 1)],
				assets,
			}),
		).toBeNull();
	});

	it("returns null when liquid invested is 0", () => {
		expect(
			assessDiversificationCoherence({
				targets: [band("US", 0.6, 0.7)],
				positions: [position("WPEA", 0)],
				dca: [],
				geographicAllocations: [geo("WPEA", "US", 1)],
				assets,
			}),
		).toBeNull();
	});

	it("country band stockPct is look-through US euros over full liquid MV", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.4, 0.6)],
			positions: [position("WPEA", 10_000), position("CASH", 3_000)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 0.7), geo("WPEA", "FR", 0.3)],
			assets,
		});
		expect(result?.bands[0]?.stockPct).toBeCloseTo(7000 / 13_000, 5);
	});

	it("region-only NORTH_AMERICA asset contributes 0 to a US country band", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.5, 0.7)],
			positions: [position("NA-FUND", 1000)],
			dca: [],
			geographicAllocations: [geo("NA-FUND", "NORTH_AMERICA", 1)],
			assets,
		});
		expect(result?.bands[0]?.stockPct).toBe(0);
	});

	it("country-level FR weight counts in an EUROPE region band", () => {
		const result = assessDiversificationCoherence({
			targets: [band("EUROPE", 0.9, 1)],
			positions: [position("EU-FUND", 1000)],
			dca: [],
			geographicAllocations: [geo("EU-FUND", "FR", 1)],
			assets,
		});
		expect(result?.bands[0]?.stockPct).toBeCloseTo(1, 5);
	});

	it("US and EUROPE bands are evaluated independently on the same portfolio", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.6, 0.8), band("EUROPE", 0.2, 0.4)],
			positions: [position("WPEA", 1000)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 0.7), geo("WPEA", "FR", 0.3)],
			assets,
		});
		const us = result?.bands.find((b) => b.key === "US");
		const europe = result?.bands.find((b) => b.key === "EUROPE");
		expect(us?.stockPct).toBeCloseTo(0.7, 5);
		expect(europe?.stockPct).toBeCloseTo(0.3, 5);
	});

	it("CRYPTO type fills the CRYPTO band at full market value", () => {
		const result = assessDiversificationCoherence({
			targets: [band("CRYPTO", 0.2, 0.3)],
			positions: [position("BTC", 500), position("WPEA", 1500)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		expect(result?.bands[0]?.stockPct).toBeCloseTo(0.25, 5);
	});

	it("CRYPTO type is excluded from geographic numerators even with geo rows", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0, 0.1)],
			positions: [position("BTC", 1000)],
			dca: [],
			geographicAllocations: [geo("BTC", "US", 1)],
			assets,
		});
		expect(result?.bands[0]?.stockPct).toBe(0);
	});

	it("asset without geo sits in the denominator and not in geo numerators", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.9, 1)],
			positions: [position("WPEA", 700), position("CASH", 300)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		expect(result?.bands[0]?.stockPct).toBeCloseTo(0.7, 5);
	});

	it("partial geo weights contribute only the entered fraction", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.3, 0.5)],
			positions: [position("WPEA", 1000)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 0.5), geo("WPEA", "FR", 0.3)],
			assets,
		});
		expect(result?.bands[0]?.stockPct).toBeCloseTo(0.5, 5);
	});

	it("status is aligned when every defined band is in range", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.85, 0.95), band("CRYPTO", 0, 0.15)],
			positions: [position("WPEA", 900), position("BTC", 100)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		expect(result?.status).toBe("aligned");
		expect(result?.findings).toEqual([]);
	});

	it("emits band_drift and misaligned when stock sits outside a band", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.6, 0.7)],
			positions: [position("WPEA", 1000)],
			dca: [],
			geographicAllocations: [geo("WPEA", "FR", 1)],
			assets,
		});
		expect(result?.findings).toEqual([{ kind: "band_drift", key: "US" }]);
		expect(result?.status).toBe("misaligned");
	});

	it("treats a value on the min/max edge as in-band within 1e-3", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.7, 0.7)],
			positions: [position("WPEA", 1000)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 0.7005)],
			assets,
		});
		expect(result?.status).toBe("aligned");
		expect(result?.findings).toEqual([]);
	});

	it("emits flow_misalign when annualized DCA look-through sits outside a band", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0, 0.2)],
			positions: [position("WPEA", 1000)],
			dca: [monthly("WPEA", 100)],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		expect(result?.findings.some((f) => f.kind === "flow_misalign")).toBe(true);
		expect(result?.status).toBe("misaligned");
	});

	it("does not emit flow findings when annual DCA total is 0", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.9, 1)],
			positions: [position("WPEA", 1000)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		expect(result?.findings.some((f) => f.kind === "flow_misalign")).toBe(false);
	});

	it("does not emit a missing-target finding for an uncovered remainder", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.55, 0.75), band("EUROPE", 0.1, 0.3)],
			positions: [position("WPEA", 850), position("CASH", 150)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 0.7), geo("WPEA", "FR", 0.3)],
			assets,
		});
		expect(result?.findings).toEqual([]);
		expect(result?.status).toBe("aligned");
	});

	it("does not emit geo_coverage_gap, unmapped_stock, or category_drift", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.5, 0.9)],
			positions: [position("WPEA", 700), position("CASH", 300)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		const kinds = result?.findings.map((f) => f.kind) ?? [];
		expect(kinds).not.toContain("geo_coverage_gap");
		expect(kinds).not.toContain("unmapped_stock");
		expect(kinds).not.toContain("category_drift");
	});
});
