import { describe, expect, it } from "vitest";
import {
	buildNextEuroPlan,
	computeMonthlyDcaPool,
} from "./next-euro-plan";
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

const assets: Asset[] = [
	asset("WPEA"),
	asset("EU"),
	asset("BTC", "CRYPTO"),
	asset("CASH", "CASH"),
];

describe("computeMonthlyDcaPool", () => {
	it("sums monthly equivalents across frequencies", () => {
		expect(
			computeMonthlyDcaPool([
				monthly("WPEA", 200),
				{
					id: "q",
					label: "q",
					envelope: "PEA",
					amount: 300,
					frequency: "TRIMESTRIEL",
					lines: [{ assetIds: ["EU"], targetPct: 1 }],
				},
			]),
		).toBe(300);
	});
});

describe("buildNextEuroPlan", () => {
	it("returns null when no pool and emergency fund is ok", () => {
		const plan = buildNextEuroPlan({
			targets: [band("US", 0.5, 0.7)],
			positions: [position("WPEA", 10_000)],
			dca: [],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 20_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).toBeNull();
	});

	it("EF takes the full monthly pool when gap is larger", () => {
		const plan = buildNextEuroPlan({
			targets: [],
			positions: [position("WPEA", 10_000)],
			dca: [monthly("WPEA", 400)],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 1_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).not.toBeNull();
		expect(plan!.monthlyPool).toBe(400);
		expect(plan!.steps[0]).toMatchObject({
			kind: "emergency_fund",
			action: "buy",
			envelope: "LIVRET",
			euros: 400,
		});
		const buyEuros = plan!.steps
			.filter((s) => s.action === "buy")
			.reduce((s, step) => s + step.euros, 0);
		expect(buyEuros).toBe(400);
	});

	it("routes underweight band catch-up to the mapped DCA asset", () => {
		// Portfolio 100% US; target EUROPE 20–30% → underweight Europe
		const plan = buildNextEuroPlan({
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
			geographicAllocations: [
				geo("WPEA", "US", 1),
				geo("EU", "FR", 1),
			],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 30_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).not.toBeNull();
		const catchup = plan!.steps.filter((s) => s.kind === "band_catchup");
		expect(catchup.length).toBeGreaterThan(0);
		expect(catchup.every((s) => s.assetId === "EU" || !s.assetId)).toBe(true);
		expect(catchup.some((s) => s.assetId === "EU" && s.euros > 0)).toBe(true);
	});

	it("emits unmapped band_catchup without assetId when no contributor", () => {
		const plan = buildNextEuroPlan({
			targets: [band("ASIA_PACIFIC", 0.2, 0.3)],
			positions: [position("WPEA", 10_000)],
			dca: [monthly("WPEA", 500)],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 30_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).not.toBeNull();
		const unmapped = plan!.steps.find(
			(s) => s.kind === "band_catchup" && !s.assetId,
		);
		expect(unmapped).toBeDefined();
		expect(unmapped!.reason).toMatch(/Aucun actif DCA mappé/i);
		expect(unmapped!.euros).toBeGreaterThan(0);
	});

	it("overweight pause zeroes P3 funding for that asset", () => {
		// 100% US with tight US max → overweight US; DCA only on WPEA
		const plan = buildNextEuroPlan({
			targets: [band("US", 0.1, 0.2)],
			positions: [position("WPEA", 10_000)],
			dca: [monthly("WPEA", 300)],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 30_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).not.toBeNull();
		expect(
			plan!.steps.some(
				(s) => s.kind === "band_pause" && s.assetId === "WPEA",
			),
		).toBe(true);
		expect(
			plan!.steps.some(
				(s) =>
					s.kind === "dca_continue" &&
					s.assetId === "WPEA" &&
					s.euros > 0,
			),
		).toBe(false);
	});

	it("does not double-spend monthly euros across overlapping CRYPTO and geo", () => {
		const plan = buildNextEuroPlan({
			targets: [
				band("US", 0.6, 0.8),
				band("CRYPTO", 0.1, 0.2),
			],
			// All US equity, no crypto → both underweight
			positions: [position("WPEA", 10_000), position("BTC", 0)],
			dca: [
				monthly("WPEA", 200),
				{
					id: "btc",
					label: "btc",
					envelope: "CTO",
					amount: 200,
					frequency: "MENSUEL",
					lines: [{ assetIds: ["BTC"], targetPct: 1 }],
				},
			],
			geographicAllocations: [
				geo("WPEA", "US", 1),
				geo("BTC", "US", 1),
			],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 30_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).not.toBeNull();
		const buyEuros = plan!.steps
			.filter((s) => s.action === "buy")
			.reduce((s, step) => s + step.euros, 0);
		expect(buyEuros).toBeLessThanOrEqual(plan!.monthlyPool + 0.01);
		expect(plan!.monthlyPool).toBe(400);
	});

	it("still returns a plan when pool is 0 but EF is insufficient", () => {
		const plan = buildNextEuroPlan({
			targets: [],
			positions: [],
			dca: [],
			geographicAllocations: [],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 1_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).not.toBeNull();
		expect(plan!.monthlyPool).toBe(0);
		expect(plan!.steps[0]).toMatchObject({
			kind: "emergency_fund",
			euros: 5_000,
			envelope: "LIVRET",
		});
	});
});
