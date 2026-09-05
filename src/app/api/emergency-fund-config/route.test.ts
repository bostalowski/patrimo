import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
	loadWorkbook: vi.fn(),
	replaceWorkbook: vi.fn(),
}));

import * as emergencyFundConfigRoute from "@/app/api/emergency-fund-config/route";
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
		propertyTaxes: [],
	};
}

function putRequest(body: unknown): Request {
	return new Request("http://localhost/api/emergency-fund-config", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/emergency-fund-config", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
		vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
	});

	it("persists target months, horizon and override", async () => {
		const response = await emergencyFundConfigRoute.PUT(
			putRequest({
				targetMonths: 8,
				catchUpHorizonMonths: 18,
				targetAmountOverride: 20_000,
			}),
		);

		expect(response.status).toBe(200);
		expect(excel.replaceWorkbook).toHaveBeenCalledTimes(1);
		const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0][0];
		expect(saved.emergencyFundConfig).toEqual({
			targetMonths: 8,
			catchUpHorizonMonths: 18,
			targetAmountOverride: 20_000,
		});
	});

	it("supports clearing override with null", async () => {
		const response = await emergencyFundConfigRoute.PUT(
			putRequest({
				targetMonths: 6,
				catchUpHorizonMonths: 12,
				targetAmountOverride: null,
			}),
		);

		expect(response.status).toBe(200);
		const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0][0];
		expect(saved.emergencyFundConfig).toEqual({
			targetMonths: 6,
			catchUpHorizonMonths: 12,
			targetAmountOverride: undefined,
		});
	});

	it("rejects invalid payload", async () => {
		const response = await emergencyFundConfigRoute.PUT(
			putRequest({
				targetMonths: 0,
				catchUpHorizonMonths: -1,
			}),
		);

		expect(response.status).toBe(400);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});
});
