import { describe, expect, it } from "vitest";
import { splitLumpSumAcrossDcaPlans } from "./dca";

describe("splitLumpSumAcrossDcaPlans", () => {
	const configs = [
		{ id: "pea", amount: 500 },
		{ id: "cto", amount: 300 },
		{ id: "livret", amount: 200 },
	];

	it("allocates 100% to a single selected plan", () => {
		const result = splitLumpSumAcrossDcaPlans({
			totalAmount: 800,
			configs,
			selectedIds: ["pea"],
		});
		expect(result.byConfigId).toEqual({ pea: 800 });
		expect(result.hasEligiblePlans).toBe(true);
	});

	it("splits pro-rata across multiple selected plans", () => {
		const result = splitLumpSumAcrossDcaPlans({
			totalAmount: 1600,
			configs,
			selectedIds: ["pea", "cto"],
		});
		expect(result.byConfigId.pea).toBe(1000);
		expect(result.byConfigId.cto).toBe(600);
		expect(result.hasEligiblePlans).toBe(true);
	});

	it("excludes zero monthly amount from pro-rata", () => {
		const withZero = [
			{ id: "pea", amount: 500 },
			{ id: "cto", amount: 0 },
		];
		const result = splitLumpSumAcrossDcaPlans({
			totalAmount: 1000,
			configs: withZero,
			selectedIds: ["pea", "cto"],
		});
		expect(result.byConfigId).toEqual({ pea: 1000 });
		expect(result.zeroAmountSelectedIds).toEqual(["cto"]);
	});

	it("returns no eligible plans when sole selected plan has zero monthly amount", () => {
		const result = splitLumpSumAcrossDcaPlans({
			totalAmount: 1000,
			configs: [{ id: "pea", amount: 0 }],
			selectedIds: ["pea"],
		});
		expect(result.byConfigId).toEqual({});
		expect(result.hasEligiblePlans).toBe(false);
		expect(result.zeroAmountSelectedIds).toEqual(["pea"]);
	});

	it("returns empty split for invalid or zero total", () => {
		expect(
			splitLumpSumAcrossDcaPlans({
				totalAmount: 0,
				configs,
				selectedIds: ["pea"],
			}).hasEligiblePlans,
		).toBe(false);
		expect(
			splitLumpSumAcrossDcaPlans({
				totalAmount: -100,
				configs,
				selectedIds: ["pea"],
			}).hasEligiblePlans,
		).toBe(false);
	});

	it("ignores unselected configs", () => {
		const result = splitLumpSumAcrossDcaPlans({
			totalAmount: 1600,
			configs,
			selectedIds: ["pea"],
		});
		expect(result.byConfigId).toEqual({ pea: 1600 });
		expect(result.byConfigId.cto).toBeUndefined();
	});
});
