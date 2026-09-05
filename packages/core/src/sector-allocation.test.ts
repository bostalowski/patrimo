import { describe, expect, it } from "vitest";
import type { Asset, SectorAllocation, Workbook } from "./schema";
import {
	applyFetchedSectorAllocation,
	replaceSectorAllocation,
	removeSectorAllocationsForAssets,
	sectorAllocationSourceForAsset,
} from "./sector-allocation";

function asset(id: string): Asset {
	return {
		id,
		label: id,
		type: "ETF",
		source: "yahoo",
		currency: "EUR",
		isin: "FR001400U5Q4",
	};
}

function workbook(overrides: Partial<Workbook> = {}): Workbook {
	return {
		accounts: [],
		assets: [asset("dcam")],
		transactions: [],
		budget: [],
		properties: [],
		dca: [],
		manualPrices: [],
		geographicAllocations: [],
		sectorAllocations: [],
		diversificationTargets: [],
		financialGoals: [],
		propertyTaxes: [],
		...overrides,
	};
}

describe("sector allocation", () => {
	it("accepts partial weights summing to less than 1", () => {
		const result = replaceSectorAllocation(
			workbook(),
			"dcam",
			[
				{ sector: "INFORMATION_TECHNOLOGY", weight: 0.3585 },
				{ sector: "FINANCIALS", weight: 0.1729 },
			],
			"manual",
		);

		expect(result.sectorAllocations).toEqual([
			{
				assetId: "dcam",
				sector: "INFORMATION_TECHNOLOGY",
				weight: 0.3585,
				source: "manual",
			},
			{
				assetId: "dcam",
				sector: "FINANCIALS",
				weight: 0.1729,
				source: "manual",
			},
		]);
	});

	it("rejects weights exceeding 1", () => {
		expect(() =>
			replaceSectorAllocation(
				workbook(),
				"dcam",
				[
					{ sector: "INFORMATION_TECHNOLOGY", weight: 0.8 },
					{ sector: "FINANCIALS", weight: 0.3 },
				],
				"manual",
			),
		).toThrow(/must not exceed 1/);
	});

	it("skips justetf apply when source is manual", () => {
		const base = replaceSectorAllocation(
			workbook(),
			"dcam",
			[{ sector: "FINANCIALS", weight: 1 }],
			"manual",
		);
		const next = applyFetchedSectorAllocation(base, "dcam", [
			{ sector: "INFORMATION_TECHNOLOGY", weight: 1 },
		]);
		expect(next).toBe(base);
		expect(sectorAllocationSourceForAsset(next.sectorAllocations, "dcam")).toBe(
			"manual",
		);
	});

	it("restore overwrites manual rows", () => {
		const base = replaceSectorAllocation(
			workbook(),
			"dcam",
			[{ sector: "FINANCIALS", weight: 1 }],
			"manual",
		);
		const next = applyFetchedSectorAllocation(
			base,
			"dcam",
			[{ sector: "INFORMATION_TECHNOLOGY", weight: 1 }],
			{ restore: true },
		);
		expect(next.sectorAllocations).toEqual([
			{
				assetId: "dcam",
				sector: "INFORMATION_TECHNOLOGY",
				weight: 1,
				source: "justetf",
			},
		]);
	});

	it("removes sector rows when asset is deleted", () => {
		const rows: SectorAllocation[] = [
			{
				assetId: "dcam",
				sector: "FINANCIALS",
				weight: 1,
				source: "justetf",
			},
		];
		const next = removeSectorAllocationsForAssets(
			workbook({ sectorAllocations: rows }),
			new Set(["dcam"]),
		);
		expect(next.sectorAllocations).toEqual([]);
	});
});
