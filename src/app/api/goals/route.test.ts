import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
	loadWorkbook: vi.fn(),
	replaceWorkbook: vi.fn(),
}));

import * as goalsRoute from "@/app/api/goals/route";
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
	return new Request("http://localhost/api/goals", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/goals", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
		vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
	});

	it("PUT persists valid goals", async () => {
		const goals = [
			{
				id: "g1",
				label: "Retraite",
				type: "RETIREMENT_INCOME",
				targetAmount: 3000,
				targetAge: 58,
			},
			{
				id: "g2",
				label: "Apport",
				type: "CAPITAL_AT_DATE",
				targetAmount: 200_000,
				targetDate: "2035-01-01T00:00:00.000Z",
			},
		];

		const response = await goalsRoute.PUT(putRequest({ goals }));

		expect(response.status).toBe(200);
		expect(excel.replaceWorkbook).toHaveBeenCalledTimes(1);
		const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0][0];
		expect(saved.financialGoals).toHaveLength(2);
		expect(saved.financialGoals[0].id).toBe("g1");
		expect(saved.financialGoals[1].type).toBe("CAPITAL_AT_DATE");
	});

	it("PUT with empty goals clears the plan", async () => {
		vi.mocked(excel.loadWorkbook).mockReturnValue({
			...workbook(),
			financialGoals: [
				{
					id: "g1",
					label: "Retraite",
					type: "RETIREMENT_INCOME",
					targetAmount: 3000,
					targetAge: 60,
				},
			],
		});

		const response = await goalsRoute.PUT(putRequest({ goals: [] }));

		expect(response.status).toBe(200);
		const saved = vi.mocked(excel.replaceWorkbook).mock.calls[0][0];
		expect(saved.financialGoals).toEqual([]);
	});

	it("PUT with retirement goal missing age returns 400", async () => {
		const response = await goalsRoute.PUT(
			putRequest({
				goals: [
					{
						id: "g1",
						label: "Retraite",
						type: "RETIREMENT_INCOME",
						targetAmount: 3000,
					},
				],
			}),
		);

		expect(response.status).toBe(400);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});

	it("PUT with duplicate ids returns 400", async () => {
		const response = await goalsRoute.PUT(
			putRequest({
				goals: [
					{
						id: "g1",
						label: "A",
						type: "CAPITAL_AT_DATE",
						targetAmount: 10_000,
						targetDate: "2030-01-01T00:00:00.000Z",
					},
					{
						id: "g1",
						label: "B",
						type: "CAPITAL_AT_DATE",
						targetAmount: 20_000,
						targetDate: "2031-01-01T00:00:00.000Z",
					},
				],
			}),
		);

		expect(response.status).toBe(400);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});
});
