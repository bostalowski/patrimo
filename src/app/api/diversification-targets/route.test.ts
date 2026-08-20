import { existsSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Asset, Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
	loadWorkbook: vi.fn(),
	replaceWorkbook: vi.fn(),
}));

import * as diversificationTargetsRoute from "@/app/api/diversification-targets/route";
import * as excel from "@/lib/excel";

const assets: Asset[] = [
	{
		id: "WPEA",
		label: "WPEA",
		type: "ETF",
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
		sectorAllocations: [],
		diversificationTargets: [],
		financialGoals: [],
	};
}

function putRequest(body: unknown): Request {
	return new Request("http://localhost/api/diversification-targets", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/diversification-targets", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
		vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
	});

	it("PUT /api/diversification-targets persists valid bands", async () => {
		const targets = [
			{ key: "US", minPct: 0.6, maxPct: 0.7 },
			{ key: "CRYPTO", minPct: 0, maxPct: 0.05 },
		];

		const response = await diversificationTargetsRoute.PUT(
			putRequest({ targets }),
		);

		expect(response.status).toBe(200);
		expect(excel.replaceWorkbook).toHaveBeenCalledTimes(1);
		const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0][0];
		expect(saved.diversificationTargets).toEqual(targets);
	});

	it("PUT with empty targets clears the plan", async () => {
		vi.mocked(excel.loadWorkbook).mockReturnValue({
			...workbook(),
			diversificationTargets: [{ key: "US", minPct: 0.6, maxPct: 0.7 }],
		});

		const response = await diversificationTargetsRoute.PUT(
			putRequest({ targets: [] }),
		);

		expect(response.status).toBe(200);
		const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0][0];
		expect(saved.diversificationTargets).toEqual([]);
	});

	it("PUT with overlapping keys returns 400 and does not write", async () => {
		const response = await diversificationTargetsRoute.PUT(
			putRequest({
				targets: [
					{ key: "US", minPct: 0.6, maxPct: 0.7 },
					{ key: "NORTH_AMERICA", minPct: 0.1, maxPct: 0.2 },
				],
			}),
		);

		expect(response.status).toBe(400);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});

	it("PUT with an invalid band returns 400 and does not write", async () => {
		const response = await diversificationTargetsRoute.PUT(
			putRequest({
				targets: [{ key: "US", minPct: 0.7, maxPct: 0.6 }],
			}),
		);

		expect(response.status).toBe(400);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});

	it("PUT /api/target-allocation no longer exists", () => {
		expect(
			existsSync(
				join(process.cwd(), "src/app/api/target-allocation/route.ts"),
			),
		).toBe(false);
	});
});
