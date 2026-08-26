import { describe, expect, it } from "vitest";
import {
	computeDcaPlan,
	getEmptyBasketLabels,
	type DcaPlan,
} from "./dca";
import type { DcaConfig } from "./schema";

const worldEmConfig: DcaConfig = {
	id: "pea-world-em",
	label: "PEA World + EM",
	envelope: "PEA",
	amount: 500,
	frequency: "MENSUEL",
	lines: [
		{
			label: "World",
			assetIds: ["W1", "W2"],
			targetPct: 0.75,
		},
		{
			label: "Emerging",
			assetIds: ["EM1"],
			targetPct: 0.25,
		},
	],
};

const currentValues = {
	W1: 7_500,
	W2: 7_500,
	EM1: 5_000,
};

function contributionFor(plan: DcaPlan, assetId: string): number {
	for (const basket of plan.allocations) {
		for (const sub of basket.sub) {
			if (sub.assetId === assetId) return sub.contribution;
		}
	}
	return 0;
}

describe("computeDcaPlan enabledAssetIds", () => {
	it("reconcentrates basket budget on checked siblings; other baskets unchanged", () => {
		const enabled = new Set(["W1", "EM1"]);
		const plan = computeDcaPlan(worldEmConfig, currentValues, { enabledAssetIds: enabled });

		expect(contributionFor(plan, "W2")).toBe(0);
		expect(contributionFor(plan, "W1")).toBe(375);
		expect(contributionFor(plan, "EM1")).toBe(125);
	});

	it("splits equally among enabled assets when basket holdings are zero", () => {
		const zeroHoldings = { W1: 0, W2: 0, EM1: 0 };
		const enabled = new Set(["W1", "EM1"]);
		const plan = computeDcaPlan(worldEmConfig, zeroHoldings, { enabledAssetIds: enabled });

		expect(contributionFor(plan, "W2")).toBe(0);
		expect(contributionFor(plan, "W1")).toBe(375);
		expect(contributionFor(plan, "EM1")).toBe(125);
	});

	it("splits proportionally among enabled assets with non-zero holdings", () => {
		const skewed = { W1: 4_500, W2: 1_500, EM1: 2_000 };
		const enabled = new Set(["W1", "W2", "EM1"]);
		const full = computeDcaPlan(worldEmConfig, skewed, { enabledAssetIds: enabled });
		const w1Share = contributionFor(full, "W1");
		const w2Share = contributionFor(full, "W2");
		expect(w1Share + w2Share).toBeCloseTo(375, 2);
		expect(w1Share / w2Share).toBeCloseTo(3, 1);

		const enabledW1Only = new Set(["W1", "EM1"]);
		const partial = computeDcaPlan(worldEmConfig, skewed, {
			enabledAssetIds: enabledW1Only,
		});
		expect(contributionFor(partial, "W1")).toBe(375);
		expect(contributionFor(partial, "W2")).toBe(0);
		expect(contributionFor(partial, "EM1")).toBe(125);
	});

	it("assigns zero to all assets when entire basket is unchecked", () => {
		const enabled = new Set(["EM1"]);
		const plan = computeDcaPlan(worldEmConfig, currentValues, { enabledAssetIds: enabled });

		expect(contributionFor(plan, "W1")).toBe(0);
		expect(contributionFor(plan, "W2")).toBe(0);
		expect(contributionFor(plan, "EM1")).toBe(125);
	});

	it("behaves like no filter when enabledAssetIds is omitted", () => {
		const withFilter = computeDcaPlan(worldEmConfig, currentValues, {
			enabledAssetIds: new Set(["W1", "W2", "EM1"]),
		});
		const withoutFilter = computeDcaPlan(worldEmConfig, currentValues);
		expect(contributionFor(withFilter, "W1")).toBe(contributionFor(withoutFilter, "W1"));
		expect(contributionFor(withFilter, "W2")).toBe(contributionFor(withoutFilter, "W2"));
		expect(contributionFor(withFilter, "EM1")).toBe(contributionFor(withoutFilter, "EM1"));
	});
});

describe("getEmptyBasketLabels", () => {
	it("returns labels for baskets with no enabled assets", () => {
		const labels = getEmptyBasketLabels(worldEmConfig, new Set(["EM1"]));
		expect(labels).toEqual(["World"]);
	});

	it("returns empty when all assets enabled", () => {
		expect(
			getEmptyBasketLabels(
				worldEmConfig,
				new Set(["W1", "W2", "EM1"]),
			),
		).toEqual([]);
	});
});
