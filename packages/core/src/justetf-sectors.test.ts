import { describe, expect, it, vi } from "vitest";
import type { Asset, Workbook } from "./schema";
import {
	applyJustEtfSectorSync,
	parseJustEtfSectorWeights,
} from "./justetf-sectors";

const JUSTETF_SECTORS_FIXTURE = `
<section>
  <h3>Secteurs</h3>
  <table>
    <tr><td>Technologie</td><td>35,85%</td></tr>
    <tr><td>Finance</td><td>17,29%</td></tr>
    <tr><td>Industrie</td><td>12,10%</td></tr>
    <tr><td>Soins de santé</td><td>8,50%</td></tr>
    <tr><td>Autre</td><td>26,26%</td></tr>
  </table>
</section>
`;

const JUSTETF_LIVE_MARKUP_FIXTURE = `
<div data-testid="etf-holdings_sectors_container">
  <h3 data-testid="hl_etf-holdings_sectors_header"> Secteurs </h3>
  <table data-testid="etf-holdings_sectors_table">
    <tbody>
      <tr data-testid="etf-holdings_sectors_row">
        <td data-testid="tl_etf-holdings_sectors_value_name">Technologie</td>
        <td>
          <span data-testid="tl_etf-holdings_sectors_value_percentage">35,85%</span>
        </td>
      </tr>
      <tr data-testid="etf-holdings_sectors_row">
        <td data-testid="tl_etf-holdings_sectors_value_name">Finance</td>
        <td>
          <span data-testid="tl_etf-holdings_sectors_value_percentage">17,29%</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>
`;

function asset(overrides: Partial<Asset> = {}): Asset {
	return {
		id: "dcam",
		label: "DCAM",
		type: "ETF",
		source: "yahoo",
		currency: "EUR",
		isin: "FR001400U5Q4",
		...overrides,
	};
}

function workbook(overrides: Partial<Workbook> = {}): Workbook {
	return {
		transactions: [],
		assets: [asset()],
		accounts: [],
		budget: [],
		properties: [],
		dca: [],
		manualPrices: [],
		geographicAllocations: [],
		sectorAllocations: [],
		diversificationTargets: [],
		financialGoals: [],
		...overrides,
	};
}

describe("parseJustEtfSectorWeights", () => {
	it("parses live markup test ids", () => {
		expect(parseJustEtfSectorWeights(JUSTETF_LIVE_MARKUP_FIXTURE)).toEqual([
			{ sector: "INFORMATION_TECHNOLOGY", weight: 0.3585 },
			{ sector: "FINANCIALS", weight: 0.1729 },
		]);
	});

	it("falls back to secteurs table", () => {
		const weights = parseJustEtfSectorWeights(JUSTETF_SECTORS_FIXTURE);
		expect(weights).toContainEqual({
			sector: "INFORMATION_TECHNOLOGY",
			weight: 0.3585,
		});
		expect(weights).toContainEqual({ sector: "FINANCIALS", weight: 0.1729 });
	});
});

describe("applyJustEtfSectorSync", () => {
	it("writes justetf rows excluding OTHER", async () => {
		const fetchHtml = vi.fn(async () => JUSTETF_SECTORS_FIXTURE);
		const result = await applyJustEtfSectorSync(workbook(), "dcam", {
			fetchHtml,
		});

		expect(result.ok).toBe(true);
		expect(result.updated).toBe(true);
		expect(result.workbook.sectorAllocations).toEqual([
			{
				assetId: "dcam",
				sector: "INFORMATION_TECHNOLOGY",
				weight: 0.3585,
				source: "justetf",
			},
			{
				assetId: "dcam",
				sector: "FINANCIALS",
				weight: 0.1729,
				source: "justetf",
			},
			{
				assetId: "dcam",
				sector: "INDUSTRIALS",
				weight: 0.121,
				source: "justetf",
			},
			{
				assetId: "dcam",
				sector: "HEALTH_CARE",
				weight: 0.085,
				source: "justetf",
			},
		]);
	});

	it("leaves workbook unchanged on fetch failure", async () => {
		const base = workbook();
		const result = await applyJustEtfSectorSync(base, "dcam", {
			fetchHtml: vi.fn(async () => {
				throw new Error("network");
			}),
		});
		expect(result.ok).toBe(false);
		expect(result.workbook).toBe(base);
	});
});
