import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Asset, Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
	loadWorkbook: vi.fn(),
	replaceWorkbook: vi.fn(),
}));

import * as targetAllocationRoute from "@/app/api/target-allocation/route";
import * as excel from "@/lib/excel";

const assets: Asset[] = [
	{
		id: "WPEA",
		label: "WPEA",
		type: "ETF",
		source: "yahoo",
		currency: "EUR",
	},
	{
		id: "BTC",
		label: "BTC",
		type: "CRYPTO",
		source: "yahoo",
		currency: "EUR",
	},
];

function workbook(): Workbook {
	return {
		transactions: [],
		assets,
		accounts: [],
		budget: [],
		properties: [],
		dca: [],
		manualPrices: [],
		geographicAllocations: [],
		targetAllocations: [],
	};
}

function putRequest(body: unknown): Request {
	return new Request("http://localhost/api/target-allocation", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/target-allocation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
		vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
	});

	it("PUT with valid body persists targetAllocations via replaceWorkbook", async () => {
		const categories = [
			{ category: "Monde", targetPct: 0.7, assetIds: ["WPEA"] },
			{ category: "Crypto", targetPct: 0.3, assetIds: ["BTC"] },
		];

		const response = await targetAllocationRoute.PUT(
			putRequest({ categories }),
		);

		expect(response.status).toBe(200);
		expect(excel.replaceWorkbook).toHaveBeenCalledTimes(1);
		const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0][0];
		expect(saved.targetAllocations).toEqual(categories);
	});

	it("PUT with invalid sum returns 400 and does not call replaceWorkbook", async () => {
		const response = await targetAllocationRoute.PUT(
			putRequest({
				categories: [{ category: "Monde", targetPct: 0.5, assetIds: ["WPEA"] }],
			}),
		);

		expect(response.status).toBe(400);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});
});
