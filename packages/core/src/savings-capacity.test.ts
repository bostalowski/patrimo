import { describe, expect, it } from "vitest";
import type { DcaConfig } from "./schema";
import { DcaConfig as DcaConfigSchema } from "./schema";
import {
	computeSavingsCapacity,
	SAVINGS_CAPACITY_COMFORTABLE_RATIO,
	SAVINGS_CAPACITY_EF_TARGET_MONTHS,
} from "./savings-capacity";

function dca(
	amount: number,
	frequency: DcaConfig["frequency"] = "MENSUEL",
	envelope: DcaConfig["envelope"] = "PEA",
): DcaConfig {
	return {
		id: `dca-${envelope}-${amount}-${frequency}`,
		label: "plan",
		envelope,
		amount,
		frequency,
		lines:
			envelope === "LIVRET"
				? []
				: [{ assetIds: ["WPEA"], targetPct: 1 }],
	};
}

function capacityDefaults(overrides: Partial<ReturnType<typeof computeSavingsCapacity>>) {
	return {
		plannedLivretDcaMonthly: 0,
		plannedInvestmentDcaMonthly: 0,
		emergencyMonthlyOutflow: 0,
		emergencyOverContributing: false,
		emergencyOverContribution: 0,
		...overrides,
	};
}

describe("DcaConfig LIVRET empty lines", () => {
	it("accepts empty lines when envelope is LIVRET", () => {
		const parsed = DcaConfigSchema.safeParse({
			id: "livret-1",
			label: "Épargne sécurité",
			envelope: "LIVRET",
			amount: 200,
			frequency: "MENSUEL",
			lines: [],
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects empty lines for non-LIVRET envelopes", () => {
		const parsed = DcaConfigSchema.safeParse({
			id: "pea-1",
			label: "PEA",
			envelope: "PEA",
			amount: 200,
			frequency: "MENSUEL",
			lines: [],
		});
		expect(parsed.success).toBe(false);
	});
});

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
		expect(result).toEqual(
			capacityDefaults({
				rawSavings: 3_000,
				monthlyEmergencyReserve: 0,
				investableSurplus: 3_000,
				plannedInvestmentDcaMonthly: 500,
				plannedDcaMonthly: 500,
				gap: -2_500,
				emergencyTargetEuro: 12_000,
				emergencyTargetMonths: 6,
				emergencyCatchUpHorizonMonths: 12,
				status: "comfortable",
			}),
		);
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
		expect(result?.emergencyMonthlyOutflow).toBe(750);
		expect(result?.rawSavings).toBe(2_000);
		expect(result?.investableSurplus).toBe(1_250);
		expect(result?.plannedDcaMonthly).toBe(1_000);
		expect(result?.plannedInvestmentDcaMonthly).toBe(1_000);
		expect(result?.plannedLivretDcaMonthly).toBe(0);
		expect(result?.gap).toBe(-250);
		expect(result?.status).toBe("comfortable");
		expect(result?.emergencyOverContributing).toBe(false);
	});

	it("skips EF reserve when depensesMensuelles ≤ 0 but still shows capacity", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 3_000,
			depensesMensuelles: 0,
			livretBalance: 0,
			dca: [dca(500)],
		});
		expect(result).toEqual(
			capacityDefaults({
				rawSavings: 3_000,
				monthlyEmergencyReserve: 0,
				investableSurplus: 3_000,
				plannedInvestmentDcaMonthly: 500,
				plannedDcaMonthly: 500,
				gap: -2_500,
				emergencyTargetEuro: undefined,
				emergencyTargetMonths: 6,
				emergencyCatchUpHorizonMonths: 12,
				status: "comfortable",
			}),
		);
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
		expect(result?.emergencyMonthlyOutflow).toBe(1_000);
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

	it("splits LIVRET vs investment DCA and uses max(need, plannedLivret) as outflow", () => {
		// need = (12_000 − 3_000) / 12 = 750
		// plannedLivret = 400; plannedInvestment = 500
		// outflow = max(750, 400) = 750; surplus = 2000 − 750 = 1250
		const result = computeSavingsCapacity({
			revenusMensuels: 4_000,
			depensesMensuelles: 2_000,
			livretBalance: 3_000,
			dca: [dca(500, "MENSUEL", "PEA"), dca(400, "MENSUEL", "LIVRET")],
		});
		expect(result?.monthlyEmergencyReserve).toBe(750);
		expect(result?.plannedLivretDcaMonthly).toBe(400);
		expect(result?.plannedInvestmentDcaMonthly).toBe(500);
		expect(result?.plannedDcaMonthly).toBe(500);
		expect(result?.emergencyMonthlyOutflow).toBe(750);
		expect(result?.investableSurplus).toBe(1_250);
		expect(result?.emergencyOverContributing).toBe(false);
		expect(result?.status).toBe("comfortable");
	});

	it("raises outflow to plannedLivret when it exceeds need without forcing investment over_committed", () => {
		// need = 750; plannedLivret = 1_200 → outflow 1_200; surplus = 800
		// investment 500 ≤ 800 → comfortable; over-contribution = 450
		const result = computeSavingsCapacity({
			revenusMensuels: 4_000,
			depensesMensuelles: 2_000,
			livretBalance: 3_000,
			dca: [dca(500, "MENSUEL", "PEA"), dca(1_200, "MENSUEL", "LIVRET")],
		});
		expect(result?.monthlyEmergencyReserve).toBe(750);
		expect(result?.plannedLivretDcaMonthly).toBe(1_200);
		expect(result?.emergencyMonthlyOutflow).toBe(1_200);
		expect(result?.investableSurplus).toBe(800);
		expect(result?.plannedDcaMonthly).toBe(500);
		expect(result?.status).toBe("comfortable");
		expect(result?.emergencyOverContributing).toBe(true);
		expect(result?.emergencyOverContribution).toBe(450);
	});

	it("alerts when need is 0 and plannedLivret > 0", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 5_000,
			depensesMensuelles: 2_000,
			livretBalance: 20_000, // need = 0
			dca: [dca(300, "MENSUEL", "LIVRET")],
		});
		expect(result?.monthlyEmergencyReserve).toBe(0);
		expect(result?.plannedLivretDcaMonthly).toBe(300);
		expect(result?.emergencyMonthlyOutflow).toBe(300);
		expect(result?.investableSurplus).toBe(2_700);
		expect(result?.plannedDcaMonthly).toBe(0);
		expect(result?.status).toBe("comfortable");
		expect(result?.emergencyOverContributing).toBe(true);
		expect(result?.emergencyOverContribution).toBe(300);
	});

	it("sums multiple LIVRET configs into plannedLivretDcaMonthly", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 5_000,
			depensesMensuelles: 2_000,
			livretBalance: 20_000,
			dca: [
				dca(100, "MENSUEL", "LIVRET"),
				dca(300, "TRIMESTRIEL", "LIVRET"), // 100 / month
			],
		});
		expect(result?.plannedLivretDcaMonthly).toBe(200);
		expect(result?.emergencyOverContribution).toBe(200);
		expect(result?.emergencyOverContributing).toBe(true);
	});

	it("does not alert when plannedLivret equals need", () => {
		const result = computeSavingsCapacity({
			revenusMensuels: 4_000,
			depensesMensuelles: 2_000,
			livretBalance: 3_000, // need = 750
			dca: [dca(750, "MENSUEL", "LIVRET")],
		});
		expect(result?.plannedLivretDcaMonthly).toBe(750);
		expect(result?.emergencyMonthlyOutflow).toBe(750);
		expect(result?.emergencyOverContributing).toBe(false);
		expect(result?.emergencyOverContribution).toBe(0);
	});
});
