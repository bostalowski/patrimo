import { describe, expect, it } from "vitest";
import {
	annualizeDcaAmount,
	aggregateCryptoExposure,
	aggregatePortfolioDiversificationBreakdown,
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

describe("aggregateCryptoExposure", () => {
	it("returns null when liquid invested is zero", () => {
		expect(aggregateCryptoExposure([], assets)).toBeNull();
	});

	it("computes crypto share against full liquid portfolio", () => {
		const result = aggregateCryptoExposure(
			[position("WPEA", 7000), position("BTC", 3000)],
			assets,
		);
		expect(result).toEqual({
			marketValue: 3000,
			weight: 0.3,
			liquidInvested: 10_000,
		});
	});

	it("returns zero crypto weight when no crypto assets are held", () => {
		const result = aggregateCryptoExposure([position("WPEA", 5000)], assets);
		expect(result).toEqual({
			marketValue: 0,
			weight: 0,
			liquidInvested: 5000,
		});
	});
});

describe("aggregatePortfolioDiversificationBreakdown", () => {
	it("returns null when liquid invested is 0", () => {
		expect(
			aggregatePortfolioDiversificationBreakdown(
				[position("WPEA", 0)],
				[geo("WPEA", "US", 1)],
				assets,
			),
		).toBeNull();
	});

	it("expresses region weights against full liquid portfolio", () => {
		const result = aggregatePortfolioDiversificationBreakdown(
			[position("WPEA", 700), position("CASH", 300)],
			[geo("WPEA", "US", 1)],
			assets,
		);
		const northAmerica = result?.regions.find((slice) => slice.key === "NORTH_AMERICA");
		expect(northAmerica?.weight).toBeCloseTo(0.7, 5);
		expect(result?.unmapped?.weight).toBeCloseTo(0.3, 5);
	});

	it("matches coherence stockPct for the same region band", () => {
		const positions = [position("WPEA", 700), position("CASH", 300)];
		const allocations = [geo("WPEA", "US", 1)];
		const breakdown = aggregatePortfolioDiversificationBreakdown(
			positions,
			allocations,
			assets,
		);
		const coherence = assessDiversificationCoherence({
			targets: [band("NORTH_AMERICA", 0.6, 0.8)],
			positions,
			dca: [],
			geographicAllocations: allocations,
			assets,
		});
		const northAmerica = breakdown?.regions.find(
			(slice) => slice.key === "NORTH_AMERICA",
		);
		const bandResult = coherence?.bands.find((b) => b.key === "NORTH_AMERICA");
		expect(northAmerica?.weight).toBeCloseTo(bandResult?.stockPct ?? 0, 5);
	});

	it("geo slices plus unmapped geo sum to 100% with crypto shown separately", () => {
		const result = aggregatePortfolioDiversificationBreakdown(
			[
				position("WPEA", 500),
				position("BTC", 200),
				position("CASH", 300),
			],
			[geo("WPEA", "US", 0.5), geo("WPEA", "FR", 0.3)],
			assets,
		);
		const geoWeight =
			(result?.regions.reduce((sum, slice) => sum + slice.weight, 0) ?? 0) +
			(result?.unmapped?.weight ?? 0);
		expect(geoWeight).toBeCloseTo(1, 5);
		expect(result?.crypto?.weight).toBeCloseTo(0.2, 5);
		expect(result?.unmapped?.weight).toBeCloseTo(0.6, 5);
	});

	it("crypto weight is independent and not subtracted from unmapped geo", () => {
		const result = aggregatePortfolioDiversificationBreakdown(
			[
				position("WPEA", 500),
				position("BTC", 500),
			],
			[
				geo("WPEA", "US", 1),
				geo("BTC", "US", 0.6),
				geo("BTC", "FR", 0.4),
			],
			assets,
		);
		const northAmerica = result?.regions.find(
			(slice) => slice.key === "NORTH_AMERICA",
		);
		const europe = result?.regions.find((slice) => slice.key === "EUROPE");
		expect(northAmerica?.weight).toBeCloseTo(0.8, 5);
		expect(europe?.weight).toBeCloseTo(0.2, 5);
		expect(result?.unmapped?.weight ?? 0).toBeCloseTo(0, 5);
		expect(result?.crypto?.weight).toBeCloseTo(0.5, 5);
	});

	it("CRYPTO without geo sits in unmapped geo while filling the crypto slice", () => {
		const result = aggregatePortfolioDiversificationBreakdown(
			[position("BTC", 400), position("CASH", 600)],
			[],
			assets,
		);
		expect(result?.crypto?.weight).toBeCloseTo(0.4, 5);
		expect(result?.unmapped?.weight).toBeCloseTo(1, 5);
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

	it("CRYPTO asset with US geo rows contributes to US band via look-through", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.9, 1)],
			positions: [position("BTC", 1000)],
			dca: [],
			geographicAllocations: [geo("BTC", "US", 1)],
			assets,
		});
		expect(result?.bands[0]?.stockPct).toBeCloseTo(1, 5);
	});

	it("US and CRYPTO bands are evaluated independently on overlapping portfolio", () => {
		const result = assessDiversificationCoherence({
			targets: [band("US", 0.75, 0.85), band("EUROPE", 0.15, 0.25), band("CRYPTO", 0.45, 0.55)],
			positions: [position("WPEA", 500), position("BTC", 500)],
			dca: [],
			geographicAllocations: [
				geo("WPEA", "US", 1),
				geo("BTC", "US", 0.6),
				geo("BTC", "FR", 0.4),
			],
			assets,
		});
		const us = result?.bands.find((b) => b.key === "US");
		const europe = result?.bands.find((b) => b.key === "EUROPE");
		const crypto = result?.bands.find((b) => b.key === "CRYPTO");
		expect(us?.stockPct).toBeCloseTo(0.8, 5);
		expect(europe?.stockPct).toBeCloseTo(0.2, 5);
		expect(crypto?.stockPct).toBeCloseTo(0.5, 5);
		expect(result?.status).toBe("aligned");
		expect(result?.findings).toEqual([]);
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
