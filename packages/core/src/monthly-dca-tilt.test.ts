import { describe, expect, it } from "vitest";
import {
	buildMonthlyDcaTilt,
	capBandCatchup,
	TILT_GAP_MONTHS,
	TILT_MAX_POOL_FRACTION,
} from "./monthly-dca-tilt";
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

function monthly(
	assetId: string,
	amount: number,
	envelope: DcaConfig["envelope"] = "PEA",
): DcaConfig {
	return {
		id: `dca-${assetId}`,
		label: assetId,
		envelope,
		amount,
		frequency: "MENSUEL",
		lines: [{ assetIds: [assetId], targetPct: 1 }],
	};
}

const assets: Asset[] = [asset("WPEA"), asset("EU"), asset("CN_ETF")];

describe("capBandCatchup", () => {
	it("spreads gap over TILT_GAP_MONTHS and caps at pool fraction", () => {
		expect(capBandCatchup(900, 500)).toBe(
			Math.min(900 / TILT_GAP_MONTHS, 900, 500 * TILT_MAX_POOL_FRACTION),
		);
	});
});

describe("buildMonthlyDcaTilt", () => {
	it("returns null when no investment DCA pool", () => {
		expect(
			buildMonthlyDcaTilt({
				targets: [],
				positions: [],
				dca: [],
				geographicAllocations: [],
				assets,
			}),
		).toBeNull();
	});

	it("returns aligned when bands are in range", () => {
		const tilt = buildMonthlyDcaTilt({
			targets: [band("US", 0.9, 1)],
			positions: [position("WPEA", 10_000)],
			dca: [monthly("WPEA", 400)],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		expect(tilt?.verdict).toBe("aligned");
		expect(tilt?.monthlyPool).toBe(400);
	});

	it("routes catch-up to DCA-mapped asset with capped euros", () => {
		const tilt = buildMonthlyDcaTilt({
			targets: [band("US", 0.5, 0.7), band("EUROPE", 0.2, 0.3)],
			positions: [position("WPEA", 10_000), position("EU", 0)],
			dca: [
				monthly("WPEA", 100),
				{
					id: "eu-dca",
					label: "EU",
					envelope: "PEA",
					amount: 400,
					frequency: "MENSUEL",
					lines: [{ assetIds: ["EU"], targetPct: 1 }],
				},
			],
			geographicAllocations: [geo("WPEA", "US", 1), geo("EU", "FR", 1)],
			assets,
		});
		expect(tilt?.verdict).toBe("tilt");
		expect(tilt?.contributions.EU).toBeGreaterThan(0);
		const total = Object.values(tilt!.contributions).reduce((s, v) => s + v, 0);
		expect(total).toBeLessThanOrEqual(tilt!.monthlyPool + 0.01);
	});

	it("returns adjust_plan when band has no DCA-mapped asset", () => {
		const tilt = buildMonthlyDcaTilt({
			targets: [band("CN", 0.05, 0.1)],
			positions: [position("WPEA", 10_000)],
			dca: [monthly("WPEA", 500)],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		expect(tilt?.verdict).toBe("adjust_plan");
		expect(tilt?.bands.some((b) => !b.mappable)).toBe(true);
	});

	it("excludes LIVRET from investment pool", () => {
		const tilt = buildMonthlyDcaTilt({
			targets: [band("US", 0.5, 0.7)],
			positions: [position("WPEA", 10_000)],
			dca: [
				monthly("WPEA", 400),
				{
					id: "livret",
					label: "Livret",
					envelope: "LIVRET",
					amount: 200,
					frequency: "MENSUEL",
					lines: [],
				},
			],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
		});
		expect(tilt?.monthlyPool).toBe(400);
	});
});
