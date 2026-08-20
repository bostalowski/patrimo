import { describe, expect, it } from "vitest";
import type { FinancialGoal, RetirementProfile } from "./schema";
import type { Portfolio } from "./portfolio";
import {
	assessFinancialGoals,
	normalizeFinancialGoals,
	requiredCapitalToday,
	resolveGoalCapitalNeeds,
	trajectoryStatus,
	validateFinancialGoals,
} from "./financial-goals";

function retirementGoal(
	overrides: Partial<FinancialGoal> = {},
): FinancialGoal {
	return {
		id: "ret",
		label: "Retraite",
		type: "RETIREMENT_INCOME",
		targetAmount: 3000,
		targetAge: 58,
		inflationIncluded: true,
		...overrides,
	};
}

function capitalGoal(overrides: Partial<FinancialGoal> = {}): FinancialGoal {
	return {
		id: "cap",
		label: "Capital",
		type: "CAPITAL_AT_DATE",
		targetAmount: 200_000,
		targetDate: new Date("2035-01-01T00:00:00.000Z"),
		inflationIncluded: true,
		...overrides,
	};
}

function emptyPortfolio(marketValue: number): Portfolio {
	return {
		assets: [],
		accounts: [],
		totals: {
			marketValue,
			costBasis: marketValue,
			netInvested: marketValue,
			unrealizedPnL: 0,
			realizedPnL: 0,
			realizedIncome: 0,
			totalReturn: 0,
			totalReturnPct: 0,
			fees: 0,
		},
	};
}

describe("validateFinancialGoals", () => {
	it("accepts empty collection", () => {
		expect(validateFinancialGoals([])).toEqual({ ok: true });
	});

	it("accepts valid retirement and capital goals", () => {
		expect(
			validateFinancialGoals([retirementGoal(), capitalGoal()]),
		).toEqual({ ok: true });
	});

	it("rejects retirement without age", () => {
		expect(
			validateFinancialGoals([
				retirementGoal({ targetAge: undefined }),
			]),
		).toEqual({ ok: false, reason: "missing_target_age" });
	});

	it("rejects capital without date", () => {
		expect(
			validateFinancialGoals([capitalGoal({ targetDate: undefined })]),
		).toEqual({ ok: false, reason: "missing_target_date" });
	});

	it("rejects duplicate ids", () => {
		expect(
			validateFinancialGoals([
				retirementGoal({ id: "x" }),
				capitalGoal({ id: "x" }),
			]),
		).toEqual({ ok: false, reason: "duplicate_id" });
	});
});

describe("requiredCapitalToday", () => {
	it("capital goal equals target amount", () => {
		expect(requiredCapitalToday(capitalGoal())).toBe(200_000);
	});

	it("retirement capitalises income gap at withdrawal rate", () => {
		const profile: RetirementProfile = {
			targetRetirementAge: 64,
			estimatedPublicPension: 0,
			withdrawalRate: 0.04,
		};
		// 3000 * 12 / 0.04 = 900_000
		expect(requiredCapitalToday(retirementGoal(), profile)).toBe(900_000);
	});

	it("subtracts public pension before capitalising", () => {
		const profile: RetirementProfile = {
			targetRetirementAge: 64,
			estimatedPublicPension: 2000 / 0.82, // ≈ 2439 brut → 2000 net
			withdrawalRate: 0.04,
		};
		const required = requiredCapitalToday(retirementGoal(), profile);
		// annual gap ≈ (3000-2000)*12 = 12000; / 0.04 = 300_000
		expect(required).toBeCloseTo(300_000, -2);
	});

	it("returns 0 when pension covers the income target", () => {
		const profile: RetirementProfile = {
			targetRetirementAge: 64,
			estimatedPublicPension: 5000,
			withdrawalRate: 0.04,
		};
		expect(requiredCapitalToday(retirementGoal(), profile)).toBe(0);
	});
});

describe("trajectoryStatus", () => {
	it("classifies ahead / on_track / behind with ±5% band", () => {
		expect(trajectoryStatus(110, 100)).toBe("ahead");
		expect(trajectoryStatus(100, 100)).toBe("on_track");
		expect(trajectoryStatus(96, 100)).toBe("on_track");
		expect(trajectoryStatus(90, 100)).toBe("behind");
	});
});

describe("normalizeFinancialGoals inflationIncluded", () => {
	it("defaults missing inflationIncluded to true", () => {
		const [goal] = normalizeFinancialGoals([
			{
				id: "cap",
				label: "Capital",
				type: "CAPITAL_AT_DATE",
				targetAmount: 100_000,
				targetDate: new Date("2035-01-01T00:00:00.000Z"),
				// Simulate legacy workbook rows before the field existed.
				inflationIncluded: undefined as unknown as boolean,
			},
		]);
		expect(goal.inflationIncluded).toBe(true);
	});

	it("preserves inflationIncluded false", () => {
		const [goal] = normalizeFinancialGoals([
			capitalGoal({ inflationIncluded: false }),
		]);
		expect(goal.inflationIncluded).toBe(false);
	});
});

describe("resolveGoalCapitalNeeds", () => {
	const inflationRate = 0.02;
	const horizonYears = 10;

	it("cochée: montant en euros d'aujourd'hui — applique l'inflation à l'horizon", () => {
		const needs = resolveGoalCapitalNeeds({
			goal: capitalGoal({
				targetAmount: 100_000,
				inflationIncluded: true,
			}),
			horizonYears,
			inflationRate,
		});
		expect(needs.requiredToday).toBe(100_000);
		expect(needs.requiredAtHorizon).toBeCloseTo(
			100_000 * (1.02) ** 10,
			0,
		);
		expect(needs.targetNominalAtHorizon).toBeCloseTo(
			100_000 * (1.02) ** 10,
			0,
		);
	});

	it("décochée: montant déjà en euros de l'horizon — déflate pour la jauge", () => {
		const needs = resolveGoalCapitalNeeds({
			goal: capitalGoal({
				targetAmount: 100_000,
				inflationIncluded: false,
			}),
			horizonYears,
			inflationRate,
		});
		expect(needs.requiredAtHorizon).toBe(100_000);
		expect(needs.targetNominalAtHorizon).toBe(100_000);
		expect(needs.requiredToday).toBeCloseTo(
			100_000 / (1.02) ** 10,
			0,
		);
	});

	it("sans horizon: n'invente pas d'inflation (requiredToday = requiredAtHorizon)", () => {
		const needs = resolveGoalCapitalNeeds({
			goal: capitalGoal({
				targetAmount: 100_000,
				inflationIncluded: false,
			}),
			horizonYears: null,
			inflationRate,
		});
		expect(needs.requiredToday).toBe(100_000);
		expect(needs.requiredAtHorizon).toBe(100_000);
		expect(needs.targetNominalAtHorizon).toBeNull();
	});

	it("inflation à 0: cochée ou non, pas de surprise sur les montants", () => {
		const included = resolveGoalCapitalNeeds({
			goal: capitalGoal({
				targetAmount: 100_000,
				inflationIncluded: true,
			}),
			horizonYears,
			inflationRate: 0,
		});
		const excluded = resolveGoalCapitalNeeds({
			goal: capitalGoal({
				targetAmount: 100_000,
				inflationIncluded: false,
			}),
			horizonYears,
			inflationRate: 0,
		});
		expect(included.requiredToday).toBe(100_000);
		expect(included.requiredAtHorizon).toBe(100_000);
		expect(excluded.requiredToday).toBe(100_000);
		expect(excluded.requiredAtHorizon).toBe(100_000);
	});
});

describe("assessFinancialGoals", () => {
	const now = new Date("2026-08-20T00:00:00.000Z");
	const profile: RetirementProfile = {
		birthDate: new Date("1980-01-01T00:00:00.000Z"),
		targetRetirementAge: 64,
		estimatedPublicPension: 0,
		withdrawalRate: 0.04,
	};

	it("returns null when there are no goals", () => {
		expect(
			assessFinancialGoals({
				goals: [],
				portfolio: emptyPortfolio(100_000),
				dcaConfigs: [],
				profile,
				inflationRate: 0.02,
				now,
			}),
		).toBeNull();
	});

	it("computes progress and trajectory for a capital goal", () => {
		const assessment = assessFinancialGoals({
			goals: [capitalGoal({ targetAmount: 100_000 })],
			portfolio: emptyPortfolio(50_000),
			dcaConfigs: [],
			profile,
			inflationRate: 0.02,
			scenario: "modere",
			now,
		});

		expect(assessment).not.toBeNull();
		expect(assessment!.goals[0].progressCurrent).toBe(0.5);
		expect(assessment!.goals[0].requiredToday).toBe(100_000);
		expect(assessment!.goals[0].status).toBeTruthy();
		expect(assessment!.progressOverall).toBe(0.5);
		expect(assessment!.goals[0].targetNominalAtHorizon).toBeGreaterThan(
			100_000,
		);
		expect(assessment!.goals[0].requiredAtHorizon).toBeGreaterThan(100_000);
		expect(assessment!.goals[0].inflationRate).toBe(0.02);
	});

	it("décochée: jauge en euros d'aujourd'hui (déflatés) et cible horizon sans ré-inflation", () => {
		const assessment = assessFinancialGoals({
			goals: [
				capitalGoal({
					targetAmount: 100_000,
					inflationIncluded: false,
					targetDate: new Date("2036-08-20T00:00:00.000Z"),
				}),
			],
			portfolio: emptyPortfolio(50_000),
			dcaConfigs: [],
			profile,
			inflationRate: 0.02,
			scenario: "modere",
			now,
		});

		const goal = assessment!.goals[0];
		expect(goal.requiredAtHorizon).toBe(100_000);
		expect(goal.targetNominalAtHorizon).toBe(100_000);
		expect(goal.requiredToday).toBeLessThan(100_000);
		expect(goal.progressCurrent).toBeGreaterThan(0.5);
	});

	it("flags oversubscription when sum of needs exceeds projected capacity", () => {
		const assessment = assessFinancialGoals({
			goals: [
				capitalGoal({
					id: "a",
					targetAmount: 5_000_000,
					targetDate: new Date("2027-01-01T00:00:00.000Z"),
				}),
				capitalGoal({
					id: "b",
					targetAmount: 5_000_000,
					targetDate: new Date("2027-01-01T00:00:00.000Z"),
				}),
			],
			portfolio: emptyPortfolio(10_000),
			dcaConfigs: [],
			profile,
			inflationRate: 0,
			scenario: "prudent",
			now,
		});

		expect(assessment!.oversubscribed).toBe(true);
		expect(assessment!.sumRequiredToday).toBe(10_000_000);
	});

	it("marks retirement goal incomplete without birth date", () => {
		const assessment = assessFinancialGoals({
			goals: [retirementGoal()],
			portfolio: emptyPortfolio(100_000),
			dcaConfigs: [],
			profile: {
				targetRetirementAge: 64,
				withdrawalRate: 0.04,
			},
			inflationRate: 0.02,
			now,
		});

		expect(assessment!.incompleteProfile).toBe(true);
		expect(assessment!.goals[0].incomplete).toBe(true);
		expect(assessment!.goals[0].status).toBeNull();
		expect(assessment!.goals[0].requiredToday).toBe(900_000);
	});
});
