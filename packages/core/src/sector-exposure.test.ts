import { describe, expect, it } from "vitest";
import {
	aggregatePortfolioSectorBreakdown,
	aggregateSectorExposure,
	aggregateSectorExposureForAccount,
} from "./sector-exposure";
import type { SectorAllocation } from "./schema";

function sector(
	assetId: string,
	sectorKey: string,
	weight: number,
): SectorAllocation {
	return { assetId, sector: sectorKey, weight, source: "manual" };
}

describe("sector exposure", () => {
	it("aggregates portfolio sector weights on market value", () => {
		const exposure = aggregateSectorExposure(
			[
				{ assetId: "a", marketValue: 1000 },
				{ assetId: "b", marketValue: 500 },
			],
			[
				sector("a", "INFORMATION_TECHNOLOGY", 0.6),
				sector("a", "FINANCIALS", 0.2),
				sector("b", "FINANCIALS", 1),
			],
		);

		expect(exposure.coveredMarketValue).toBe(1300);
		expect(exposure.sectors).toEqual([
			{
				key: "FINANCIALS",
				marketValue: 700,
				weight: 700 / 1300,
			},
			{
				key: "INFORMATION_TECHNOLOGY",
				marketValue: 600,
				weight: 600 / 1300,
			},
		]);
	});

	it("drops OTHER without redistribution", () => {
		const exposure = aggregateSectorExposure(
			[{ assetId: "a", marketValue: 1000 }],
			[
				sector("a", "INFORMATION_TECHNOLOGY", 0.5),
				sector("a", "OTHER", 0.5),
			],
		);

		expect(exposure.coveredMarketValue).toBe(500);
		expect(exposure.sectors).toEqual([
			{
				key: "INFORMATION_TECHNOLOGY",
				marketValue: 500,
				weight: 1,
			},
		]);
	});

	it("filters by account", () => {
		const exposure = aggregateSectorExposureForAccount(
			[
				{ assetId: "a", accountId: "pea", marketValue: 1000 },
				{ assetId: "b", accountId: "cto", marketValue: 500 },
			],
			[
				sector("a", "FINANCIALS", 1),
				sector("b", "INFORMATION_TECHNOLOGY", 1),
			],
			"pea",
		);

		expect(exposure.sectors).toEqual([
			{ key: "FINANCIALS", marketValue: 1000, weight: 1 },
		]);
	});

	it("reports unmapped liquid market value on portfolio breakdown", () => {
		const breakdown = aggregatePortfolioSectorBreakdown(
			[
				{ assetId: "a", marketValue: 800 },
				{ assetId: "b", marketValue: 200 },
			],
			[sector("a", "FINANCIALS", 0.5)],
		);

		expect(breakdown?.liquidInvested).toBe(1000);
		expect(breakdown?.sectors[0]?.key).toBe("FINANCIALS");
		expect(breakdown?.unmapped?.marketValue).toBe(600);
	});
});
