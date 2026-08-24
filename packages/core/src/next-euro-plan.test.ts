import { describe, expect, it } from "vitest";
import {
	buildNextEuroPlan,
	computeMonthlyDcaPool,
	computeMonthlyInvestmentDcaPool,
	computeMonthlyLivretDcaPool,
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

describe("LIVRET vs investment DCA pool helpers", () => {
	it("splits LIVRET cash configs from investment envelopes", () => {
		const configs: DcaConfig[] = [
			monthly("WPEA", 400),
			{
				id: "livret",
				label: "Sécurité",
				envelope: "LIVRET",
				amount: 200,
				frequency: "MENSUEL",
				lines: [],
			},
			{
				id: "livret-q",
				label: "Sécurité T",
				envelope: "LIVRET",
				amount: 300,
				frequency: "TRIMESTRIEL",
				lines: [],
			},
		];
		expect(computeMonthlyLivretDcaPool(configs)).toBe(300);
		expect(computeMonthlyInvestmentDcaPool(configs)).toBe(400);
		expect(computeMonthlyDcaPool(configs)).toBe(700);
	});
});

describe("buildNextEuroPlan", () => {
	it("returns null when no investment pool", () => {
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

	it("uses investment pool only (excludes LIVRET) and attaches EF surplus", () => {
		const plan = buildNextEuroPlan({
			targets: [band("US", 0.9, 1)],
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
			accounts: [{ envelope: "LIVRET", marketValue: 1_000 }],
			monthlyExpenses: 2_000,
			revenusMensuels: 5_000,
		});
		expect(plan).not.toBeNull();
		expect(plan!.monthlyPool).toBe(400);
		expect(plan!.tilt.verdict).toBe("aligned");
		expect(plan!.emergencyFundRecommendation).not.toBeNull();
		expect(
			plan!.steps.some((s) => (s as { kind: string }).kind === "emergency_fund"),
		).toBe(false);
	});

	it("routes underweight band catch-up to the mapped DCA asset", () => {
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
			geographicAllocations: [geo("WPEA", "US", 1), geo("EU", "FR", 1)],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 30_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).not.toBeNull();
		expect(plan!.tilt.verdict).toBe("tilt");
		const catchup = plan!.steps.filter((s) => s.kind === "band_catchup");
		expect(catchup.some((s) => s.assetId === "EU" && s.euros > 0)).toBe(true);
	});

	it("returns adjust_plan when band has no DCA asset", () => {
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
		expect(plan!.tilt.verdict).toBe("adjust_plan");
	});

	it("overweight pause zeroes residual funding for that asset", () => {
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
		expect(plan!.tilt.pausedAssetIds).toContain("WPEA");
		expect(plan!.tilt.contributions.WPEA ?? 0).toBe(0);
	});

	it("does not double-spend monthly euros across overlapping CRYPTO and geo", () => {
		const plan = buildNextEuroPlan({
			targets: [band("US", 0.6, 0.8), band("CRYPTO", 0.1, 0.2)],
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
			geographicAllocations: [geo("WPEA", "US", 1), geo("BTC", "US", 1)],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 30_000 }],
			monthlyExpenses: 2_000,
		});
		expect(plan).not.toBeNull();
		const buyEuros = Object.values(plan!.tilt.contributions).reduce(
			(s, v) => s + v,
			0,
		);
		expect(buyEuros).toBeLessThanOrEqual(plan!.monthlyPool + 0.01);
		expect(plan!.monthlyPool).toBe(400);
	});

	it("does not steal investment DCA into LIVRET steps", () => {
		const plan = buildNextEuroPlan({
			targets: [],
			positions: [position("WPEA", 10_000)],
			dca: [monthly("WPEA", 400)],
			geographicAllocations: [geo("WPEA", "US", 1)],
			assets,
			accounts: [{ envelope: "LIVRET", marketValue: 1_000 }],
			monthlyExpenses: 2_000,
			revenusMensuels: 5_000,
		});
		expect(plan).not.toBeNull();
		expect(plan!.tilt.contributions.WPEA).toBe(400);
		expect(plan!.emergencyFundRecommendation?.mode).not.toBe("none");
	});
});
