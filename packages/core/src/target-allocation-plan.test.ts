import { describe, expect, it } from "vitest";
import { suggestTargetPlanFromDca } from "./allocation-coherence";
import type { Asset, DcaConfig } from "./schema";
import { validateTargetAllocations } from "./target-allocation";

const assets: Asset[] = [
	{ id: "WPEA", label: "WPEA", type: "ETF", source: "yahoo", currency: "EUR" },
	{ id: "DCAM", label: "DCAM", type: "ETF", source: "yahoo", currency: "EUR" },
	{ id: "PLEM", label: "PLEM", type: "ETF", source: "yahoo", currency: "EUR" },
	{ id: "BTC", label: "BTC", type: "CRYPTO", source: "yahoo", currency: "EUR" },
];

function monthly(
	id: string,
	label: string,
	amount: number,
	lines: DcaConfig["lines"],
): DcaConfig {
	return { id, label, envelope: "PEA", amount, frequency: "MENSUEL", lines };
}

describe("suggestTargetPlanFromDca", () => {
	it("returns [] when there is no DCA or annual total is 0", () => {
		expect(suggestTargetPlanFromDca([])).toEqual([]);
		expect(
			suggestTargetPlanFromDca([
				monthly("empty", "Empty", 0, [{ assetIds: ["WPEA"], targetPct: 1 }]),
			]),
		).toEqual([]);
	});

	it("builds one category per DCA line with targetPct = line annual / total annual", () => {
		const plan = suggestTargetPlanFromDca([
			monthly("pea", "PEA", 400, [
				{ label: "Mondes", assetIds: ["WPEA", "DCAM"], targetPct: 0.75 },
				{ label: "Émergents", assetIds: ["PLEM"], targetPct: 0.25 },
			]),
		]);

		expect(plan).toHaveLength(2);
		const mondes = plan.find((c) => c.category === "Mondes");
		const emergents = plan.find((c) => c.category === "Émergents");
		expect(mondes?.assetIds).toEqual(["WPEA", "DCAM"]);
		expect(mondes?.targetPct).toBeCloseTo(0.75, 5);
		expect(emergents?.targetPct).toBeCloseTo(0.25, 5);
	});

	it("merges lines that share the same assetIds set", () => {
		const plan = suggestTargetPlanFromDca([
			monthly("a", "A", 100, [
				{ label: "World", assetIds: ["WPEA", "DCAM"], targetPct: 1 },
			]),
			monthly("b", "B", 100, [
				{ label: "World-dup", assetIds: ["DCAM", "WPEA"], targetPct: 1 },
			]),
		]);

		expect(plan).toHaveLength(1);
		expect(plan[0].assetIds.sort()).toEqual(["DCAM", "WPEA"]);
		expect(plan[0].targetPct).toBeCloseTo(1, 5);
	});

	it("assigns a shared asset to only the highest-annualEUR candidate", () => {
		const plan = suggestTargetPlanFromDca([
			monthly("big", "Big", 300, [
				{ label: "Primary", assetIds: ["WPEA", "PLEM"], targetPct: 1 },
			]),
			monthly("small", "Small", 100, [
				{ label: "Secondary", assetIds: ["WPEA"], targetPct: 1 },
			]),
		]);

		const primary = plan.find((c) => c.category === "Primary");
		const secondary = plan.find((c) => c.category === "Secondary");
		expect(primary?.assetIds).toContain("WPEA");
		expect(secondary).toBeUndefined();
	});
});

describe("validateTargetAllocations", () => {
	it("accepts a valid plan summing to ≈ 1", () => {
		const result = validateTargetAllocations(
			[
				{ category: "Monde", targetPct: 0.7, assetIds: ["WPEA", "DCAM"] },
				{ category: "Crypto", targetPct: 0.3, assetIds: ["BTC"] },
			],
			assets,
		);
		expect(result.ok).toBe(true);
	});

	it("rejects when Σ targetPct is not ≈ 1", () => {
		const result = validateTargetAllocations(
			[{ category: "Monde", targetPct: 0.5, assetIds: ["WPEA"] }],
			assets,
		);
		expect(result.ok).toBe(false);
	});

	it("rejects when an assetId appears in two categories", () => {
		const result = validateTargetAllocations(
			[
				{ category: "A", targetPct: 0.5, assetIds: ["WPEA"] },
				{ category: "B", targetPct: 0.5, assetIds: ["WPEA"] },
			],
			assets,
		);
		expect(result.ok).toBe(false);
	});

	it("rejects unknown assetIds", () => {
		const result = validateTargetAllocations(
			[{ category: "Monde", targetPct: 1, assetIds: ["UNKNOWN"] }],
			assets,
		);
		expect(result.ok).toBe(false);
	});
});
