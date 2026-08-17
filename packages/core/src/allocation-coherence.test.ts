import { describe, expect, it } from "vitest";
import {
	annualizeDcaAmount,
	assessAllocationCoherence,
	computeFlowMixByAsset,
} from "./allocation-coherence";
import type { AssetPosition } from "./portfolio";
import type {
	DcaConfig,
	GeographicAllocation,
	TargetAllocationCategory,
} from "./schema";

function makeTarget(
	category: string,
	targetPct: number,
	assetIds: string[],
): TargetAllocationCategory {
	return { category, targetPct, assetIds };
}

function makePosition(assetId: string, marketValue: number): AssetPosition {
	return {
		assetId,
		marketValue,
		costBasis: marketValue,
		netInvested: marketValue,
		unrealizedPnL: 0,
		realizedPnL: 0,
		totalReturn: 0,
		totalReturnPct: 0,
		quantity: 1,
		asset: null,
		fees: 0,
		pru: marketValue,
	};
}

function makeMonthlyDca(
	id: string,
	amount: number,
	assetId: string,
	targetPct = 1,
): DcaConfig {
	return {
		id,
		label: id,
		envelope: "PEA",
		amount,
		frequency: "MENSUEL",
		lines: [{ assetIds: [assetId], targetPct }],
	};
}

function makeGeo(assetId: string, weight: number): GeographicAllocation {
	return { assetId, country: "US", weight, source: "justetf" };
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
		const dca: DcaConfig[] = [makeMonthlyDca("pea", 400, "WPEA")];
		const result = computeFlowMixByAsset(dca);
		expect(result.get("WPEA")).toBe(4800);
	});

	it("splits basket contributions evenly across assetIds in a line", () => {
		const dca: DcaConfig[] = [
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
		];
		const result = computeFlowMixByAsset(dca);
		expect(result.get("WPEA")).toBeCloseTo((4800 * 0.75) / 2, 5);
		expect(result.get("DCAM")).toBeCloseTo((4800 * 0.75) / 2, 5);
		expect(result.get("PLEM")).toBeCloseTo(4800 * 0.25, 5);
	});
});

describe("assessAllocationCoherence", () => {
	it("returns null when targets is empty", () => {
		const result = assessAllocationCoherence({
			targets: [],
			positions: [makePosition("WPEA", 1000)],
			dca: [],
			geographicAllocations: [],
		});
		expect(result).toBeNull();
	});

	it("returns null when target sum is not ≈ 1", () => {
		const result = assessAllocationCoherence({
			targets: [makeTarget("Monde", 0.5, ["WPEA"])],
			positions: [makePosition("WPEA", 1000)],
			dca: [],
			geographicAllocations: [],
		});
		expect(result).toBeNull();
	});

	it("returns aligned when stock is within 5% of target and no DCA", () => {
		const result = assessAllocationCoherence({
			targets: [
				makeTarget("Monde", 0.7, ["WPEA"]),
				makeTarget("Crypto", 0.3, ["BTC"]),
			],
			positions: [makePosition("WPEA", 700), makePosition("BTC", 300)],
			dca: [],
			geographicAllocations: [makeGeo("WPEA", 1.0), makeGeo("BTC", 1.0)],
		});
		expect(result?.status).toBe("aligned");
		expect(result?.findings).toHaveLength(0);
	});

	it("emits category_drift when |stockPct - targetPct| >= 5%", () => {
		const result = assessAllocationCoherence({
			targets: [
				makeTarget("Monde", 0.7, ["WPEA"]),
				makeTarget("Crypto", 0.3, ["BTC"]),
			],
			positions: [makePosition("WPEA", 400), makePosition("BTC", 600)],
			dca: [],
			geographicAllocations: [],
		});
		const drift =
			result?.findings.filter((f) => f.kind === "category_drift") ?? [];
		expect(drift.length).toBeGreaterThan(0);
		expect(result?.status).toBe("misaligned");
	});

	it("emits flow_misalign when DCA flow diverges from target by >= 5%", () => {
		const result = assessAllocationCoherence({
			targets: [
				makeTarget("Monde", 0.7, ["WPEA"]),
				makeTarget("Crypto", 0.3, ["BTC"]),
			],
			positions: [makePosition("WPEA", 700), makePosition("BTC", 300)],
			dca: [
				makeMonthlyDca("pea", 400, "WPEA"),
				makeMonthlyDca("btc", 400, "BTC"),
			],
			geographicAllocations: [],
		});
		const flow =
			result?.findings.filter((f) => f.kind === "flow_misalign") ?? [];
		expect(flow.length).toBeGreaterThan(0);
		expect(result?.status).toBe("misaligned");
	});

	it("emits unmapped_stock when untracked assets exceed 5% of liquid", () => {
		const result = assessAllocationCoherence({
			targets: [makeTarget("Monde", 1.0, ["WPEA"])],
			positions: [makePosition("WPEA", 900), makePosition("UNKNOWN", 100)],
			dca: [],
			geographicAllocations: [],
		});
		const unmapped =
			result?.findings.filter((f) => f.kind === "unmapped_stock") ?? [];
		expect(unmapped).toHaveLength(1);
		expect(result?.status).toBe("misaligned");
	});

	it("does not emit unmapped_stock when unmapped MV < 5% of liquid", () => {
		const result = assessAllocationCoherence({
			targets: [makeTarget("Monde", 1.0, ["WPEA"])],
			positions: [makePosition("WPEA", 995), makePosition("UNKNOWN", 4)],
			dca: [],
			geographicAllocations: [],
		});
		const unmapped =
			result?.findings.filter((f) => f.kind === "unmapped_stock") ?? [];
		expect(unmapped).toHaveLength(0);
	});

	it("does not emit overlapping_sleeve when a category has >= 2 assets with MV > 0", () => {
		const result = assessAllocationCoherence({
			targets: [makeTarget("Monde", 1.0, ["WPEA", "DCAM"])],
			positions: [makePosition("WPEA", 600), makePosition("DCAM", 400)],
			dca: [],
			geographicAllocations: [makeGeo("WPEA", 1.0), makeGeo("DCAM", 1.0)],
		});
		const overlap =
			result?.findings.filter((f) => f.kind === "overlapping_sleeve") ?? [];
		expect(overlap).toHaveLength(0);
		expect(result?.status).toBe("aligned");
	});

	it("status is watch when only geo_coverage_gap", () => {
		const result = assessAllocationCoherence({
			targets: [makeTarget("Monde", 1.0, ["WPEA", "DCAM"])],
			positions: [makePosition("WPEA", 600), makePosition("DCAM", 400)],
			dca: [],
			geographicAllocations: [],
		});
		expect(result?.findings.every((f) => f.kind === "geo_coverage_gap")).toBe(
			true,
		);
		expect(result?.status).toBe("watch");
	});

	it("emits geo_coverage_gap when >= 25% of liquid has no valid geo", () => {
		const result = assessAllocationCoherence({
			targets: [
				makeTarget("Monde", 0.7, ["WPEA"]),
				makeTarget("Crypto", 0.3, ["BTC"]),
			],
			positions: [makePosition("WPEA", 700), makePosition("BTC", 300)],
			dca: [],
			geographicAllocations: [makeGeo("WPEA", 1.0)],
		});
		const gap =
			result?.findings.filter((f) => f.kind === "geo_coverage_gap") ?? [];
		expect(gap).toHaveLength(1);
	});

	it("does not emit geo_coverage_gap when all liquid assets have valid geo", () => {
		const result = assessAllocationCoherence({
			targets: [
				makeTarget("Monde", 0.7, ["WPEA"]),
				makeTarget("Crypto", 0.3, ["BTC"]),
			],
			positions: [makePosition("WPEA", 700), makePosition("BTC", 300)],
			dca: [],
			geographicAllocations: [makeGeo("WPEA", 1.0), makeGeo("BTC", 1.0)],
		});
		const gap =
			result?.findings.filter((f) => f.kind === "geo_coverage_gap") ?? [];
		expect(gap).toHaveLength(0);
	});

	it("status is aligned when no findings", () => {
		const result = assessAllocationCoherence({
			targets: [
				makeTarget("Monde", 0.7, ["WPEA"]),
				makeTarget("Crypto", 0.3, ["BTC"]),
			],
			positions: [makePosition("WPEA", 700), makePosition("BTC", 300)],
			dca: [],
			geographicAllocations: [makeGeo("WPEA", 1.0), makeGeo("BTC", 1.0)],
		});
		expect(result?.status).toBe("aligned");
		expect(result?.findings).toHaveLength(0);
	});

	it("exposes liquidInvested and annualDcaTotal", () => {
		const result = assessAllocationCoherence({
			targets: [makeTarget("Monde", 1.0, ["WPEA"])],
			positions: [makePosition("WPEA", 5000)],
			dca: [makeMonthlyDca("pea", 400, "WPEA")],
			geographicAllocations: [],
		});
		expect(result?.liquidInvested).toBe(5000);
		expect(result?.annualDcaTotal).toBe(4800);
	});
});
