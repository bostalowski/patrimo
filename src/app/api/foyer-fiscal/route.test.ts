import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
	loadWorkbook: vi.fn(),
	replaceWorkbook: vi.fn(),
}));

import * as foyerFiscalRoute from "@/app/api/foyer-fiscal/route";
import * as excel from "@/lib/excel";

function workbook(): Workbook {
	return {
		transactions: [],
		assets: [],
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
	return new Request("http://localhost/api/foyer-fiscal", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/foyer-fiscal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
		vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
	});

	it("GET returns null when the sheet is absent (E4)", async () => {
		const response = await foyerFiscalRoute.GET();
		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ foyerFiscalConfig: null });
	});

	it("PUT persists MANUAL foyer config (N5)", async () => {
		const response = await foyerFiscalRoute.PUT(
			putRequest({
				incomeSource: "MANUAL",
				manualAmount: 2500,
				manualBasis: "NET_IMPOSABLE",
				parts: 1.5,
			}),
		);

		expect(response.status).toBe(200);
		expect(excel.replaceWorkbook).toHaveBeenCalledTimes(1);
		const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0]![0];
		expect(saved.foyerFiscalConfig).toEqual({
			incomeSource: "MANUAL",
			manualAmount: 2500,
			manualBasis: "NET_IMPOSABLE",
			parts: 1.5,
		});
	});

	it("rejects MANUAL amount ≤ 0 (E2)", async () => {
		const response = await foyerFiscalRoute.PUT(
			putRequest({
				incomeSource: "MANUAL",
				manualAmount: 0,
				manualBasis: "NET_IMPOSABLE",
				parts: 1,
			}),
		);
		expect(response.status).toBe(400);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});

	it("rejects parts = 0 (E3)", async () => {
		const response = await foyerFiscalRoute.PUT(
			putRequest({
				incomeSource: "FROM_BUDGET",
				parts: 0,
			}),
		);
		expect(response.status).toBe(400);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});
});
