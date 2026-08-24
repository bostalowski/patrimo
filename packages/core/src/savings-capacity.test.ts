import { describe, expect, it } from "vitest";
import type { DcaConfig } from "./schema";
import {
	computeSavingsCapacity,
	SAVINGS_CAPACITY_COMFORTABLE_RATIO,
	SAVINGS_CAPACITY_EF_TARGET_MONTHS,
} from "./savings-capacity";

function dca(
	amount: number,
	frequency: DcaConfig["frequency"] = "MENSUEL",
): DcaConfig {
	return {
		id: `dca-${amount}-${frequency}`,
		label: "plan",
		envelope: "PEA",
		amount,
		frequency,
		lines: [{ assetIds: ["WPEA"], targetPct: 1 }],
	};
}

describe("computeSavingsCapacity", () => {
	it("hides when revenusMensuels ≤ 0", () => {
		expect(
			computeSavingsCapacity({
				revenusMensuels: 0,
				depensesMensuelles: 2_000,
				livretBalance: 20_000,
				dca: [],
			}),
		).toBeNull();
		expect(
			computeSavingsCapacity({
				revenusMensuels: -100,
				depensesMensuelles: 0,
				livretBalance: 0,
				dca: [dca(200)],
			}),
		).toBeNull();
	});

	it("uses zero emergency reserve when coverage ≥ 6 months", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 5_000,
			depensesMensuelles: 2_000,
			livretBalance: 12_000, // 6 months
			dca: [dca(500)],
		});
		expect(result).toEqual({
			rawSavings: 3_000,
			monthlyEmergencyReserve: 0,
			investableSurplus: 3_000,
			plannedDcaMonthly: 500,
			gap: -2_500,
			emergencyTargetEuro: 12_000,
			emergencyTargetMonths: 6,
			emergencyCatchUpHorizonMonths: 12,
			status: "comfortable",
		});
	});

	it("reserves catch-up when coverage is below the 6-month target", () => {
		// coverage = 3_000/2_000 = 1.5 months; gap = 4.5 months
		// reserve = 4.5 × 2000 / 12 = 750
		const result = computeSavingsCapacity({
			revenusMensuels: 4_000,
			depensesMensuelles: 2_000,
			livretBalance: 3_000,
			dca: [dca(1_000)],
		});
		expect(result?.monthlyEmergencyReserve).toBe(750);
		expect(result?.rawSavings).toBe(2_000);
		expect(result?.investableSurplus).toBe(1_250);
		expect(result?.plannedDcaMonthly).toBe(1_000);
		expect(result?.gap).toBe(-250);
		expect(result?.status).toBe("comfortable");
	});

	it("skips EF reserve when depensesMensuelles ≤ 0 but still shows capacity", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 3_000,
			depensesMensuelles: 0,
			livretBalance: 0,
			dca: [dca(500)],
		});
		expect(result).toEqual({
			rawSavings: 3_000,
			monthlyEmergencyReserve: 0,
			investableSurplus: 3_000,
			plannedDcaMonthly: 500,
			gap: -2_500,
			emergencyTargetEuro: undefined,
			emergencyTargetMonths: 6,
			emergencyCatchUpHorizonMonths: 12,
			status: "comfortable",
		});
	});

	it("allows negative investable surplus and marks over_committed", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 2_500,
			depensesMensuelles: 2_000,
			livretBalance: 0, // reserve = 6×2000/12 = 1000
			dca: [dca(200)],
		});
		expect(result?.rawSavings).toBe(500);
		expect(result?.monthlyEmergencyReserve).toBe(1_000);
		expect(result?.investableSurplus).toBe(-500);
		expect(result?.plannedDcaMonthly).toBe(200);
		expect(result?.gap).toBe(700);
		expect(result?.status).toBe("over_committed");
	});

	it("marks over_committed when planned DCA exceeds surplus", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 4_000,
			depensesMensuelles: 2_000,
			livretBalance: 20_000, // healthy EF → reserve 0
			dca: [dca(2_500)],
		});
		expect(result?.investableSurplus).toBe(2_000);
		expect(result?.status).toBe("over_committed");
		expect(result?.gap).toBe(500);
	});

	it("monthlyizes TRIMESTRIEL and ANNUEL into the planned pool", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 10_000,
			depensesMensuelles: 2_000,
			livretBalance: 20_000,
			dca: [
				dca(300, "MENSUEL"),
				dca(600, "TRIMESTRIEL"), // 200 / month
				dca(1_200, "ANNUEL"), // 100 / month
			],
		});
		expect(result?.plannedDcaMonthly).toBe(600);
		expect(result?.status).toBe("comfortable");
	});

	it("shows the card with comfortable status when planned is 0 and surplus ≥ 0", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 4_000,
			depensesMensuelles: 2_000,
			livretBalance: 20_000,
			dca: [],
		});
		expect(result?.plannedDcaMonthly).toBe(0);
		expect(result?.investableSurplus).toBe(2_000);
		expect(result?.status).toBe("comfortable");
	});

	it("uses comfortable / tight boundaries at 0.8 × surplus", () => {
		const surplusBase = {
			revenusMensuels: 3_000,
			depensesMensuelles: 1_000,
			livretBalance: SAVINGS_CAPACITY_EF_TARGET_MONTHS * 1_000,
		};
		// surplus = 2000; 0.8 × 2000 = 1600
		const comfortable = computeSavingsCapacity({
			...surplusBase,
			dca: [dca(SAVINGS_CAPACITY_COMFORTABLE_RATIO * 2_000)],
		});
		expect(comfortable?.status).toBe("comfortable");

		const tight = computeSavingsCapacity({
			...surplusBase,
			dca: [dca(1_600.01)],
		});
		expect(tight?.status).toBe("tight");

		const atSurplus = computeSavingsCapacity({
			...surplusBase,
			dca: [dca(2_000)],
		});
		expect(atSurplus?.status).toBe("tight");

		const over = computeSavingsCapacity({
			...surplusBase,
			dca: [dca(2_000.01)],
		});
		expect(over?.status).toBe("over_committed");
	});

	it("ignores budget EPARGNE conceptually (caller passes revenus − depenses only)", () => {
		// Documented contract: summarizeBudget revenus/depenses, not restant.
		const result = computeSavingsCapacity({
			revenusMensuels: 5_000,
			depensesMensuelles: 3_000,
			livretBalance: 30_000,
			dca: [dca(1_000)],
		});
		expect(result?.rawSavings).toBe(2_000);
		expect(result?.investableSurplus).toBe(2_000);
	});

	it("uses custom target months and custom horizon when provided", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 4_000,
			depensesMensuelles: 2_000,
			livretBalance: 3_000,
			dca: [dca(1_000)],
			emergencyFundConfig: {
				targetMonths: 9,
				catchUpHorizonMonths: 18,
			},
		});
		// target = 9 * 2_000 = 18_000; gap = 15_000; reserve = 15_000 / 18
		expect(result?.monthlyEmergencyReserve).toBe(833.33);
		expect(result?.emergencyTargetEuro).toBe(18_000);
		expect(result?.emergencyTargetMonths).toBe(9);
		expect(result?.emergencyCatchUpHorizonMonths).toBe(18);
	});

	it("uses absolute target override even when monthly expenses are zero", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 2_500,
			depensesMensuelles: 0,
			livretBalance: 2_000,
			dca: [dca(200)],
			emergencyFundConfig: {
				targetMonths: 6,
				targetAmountOverride: 10_000,
				catchUpHorizonMonths: 10,
			},
		});
		expect(result?.monthlyEmergencyReserve).toBe(800);
		expect(result?.emergencyTargetEuro).toBe(10_000);
		expect(result?.emergencyTargetMonths).toBe(6);
		expect(result?.emergencyCatchUpHorizonMonths).toBe(10);
	});
});
