import { describe, expect, it } from "vitest";
import type { FinancialGoal, RetirementProfile } from "./schema";
import type { Portfolio } from "./portfolio";
import {
	assessFinancialGoals,
	normalizeFinancialGoals,
	rateAfterDrawOnCapitalToggle,
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
		targetDate: new Date("2040-01-01T00:00:00.000Z"),
		inflationIncluded: true,
		drawOnCapital: false,
		capitalisationRate: 0.03,
		publicPensionLink: "NONE",
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

	it("rejects retirement without targetDate", () => {
		expect(
			validateFinancialGoals([
				retirementGoal({ targetDate: undefined }),
			]),
		).toEqual({ ok: false, reason: "missing_target_date" });
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
	const pensionBrutForNet2000 = 2000 / 0.82;
	const startOk = new Date("2030-01-01T00:00:00.000Z");
	const profilePension: RetirementProfile = {
		scenarios: {
			LEGAL_AGE: {
				startDate: startOk,
				grossMonthly: pensionBrutForNet2000,
			},
		},
		activeScenario: "LEGAL_AGE",
	};

	it("CAPITAL_AT_DATE equals target amount (mode/rate/pension ignored)", () => {
		expect(
			requiredCapitalToday(
				capitalGoal({
					targetAmount: 200_000,
					drawOnCapital: true,
					capitalisationRate: 0.04,
					publicPensionLink: "LEGAL_AGE",
				}),
				profilePension,
			),
		).toBe(200_000);
	});

	it("intérêts seuls + pension nette 2000 @3% → 400_000 (teach-back)", () => {
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetDate: startOk,
					publicPensionLink: "LEGAL_AGE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profilePension,
			),
		).toBeCloseTo(400_000, 0);
	});

	it("intérêts seuls avant date scénario → pas de pension → 1_200_000 (teach-back)", () => {
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetDate: new Date("2029-12-31T00:00:00.000Z"),
					publicPensionLink: "LEGAL_AGE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profilePension,
			),
		).toBe(1_200_000);
	});

	it("vivre sur le capital + pension @4% → 300_000 (teach-back)", () => {
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetDate: startOk,
					publicPensionLink: "LEGAL_AGE",
					drawOnCapital: true,
					capitalisationRate: 0.04,
				}),
				profilePension,
			),
		).toBeCloseTo(300_000, 0);
	});

	it("does not subtract pension when grossMonthly is 0 (filled)", () => {
		const profile: RetirementProfile = {
			scenarios: {
				LEGAL_AGE: { startDate: startOk, grossMonthly: 0 },
			},
		};
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetDate: startOk,
					publicPensionLink: "LEGAL_AGE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profile,
			),
		).toBe(1_200_000);
	});

	it("returns 0 when pension covers the income target (overlap)", () => {
		const profile: RetirementProfile = {
			scenarios: {
				LEGAL_AGE: { startDate: startOk, grossMonthly: 5000 },
			},
		};
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetDate: startOk,
					publicPensionLink: "LEGAL_AGE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profile,
			),
		).toBe(0);
	});

	it("ignores profile withdrawalRate for goals capitalisation", () => {
		const profile: RetirementProfile = {
			scenarios: {},
			withdrawalRate: 0.04,
		};
		expect(
			requiredCapitalToday(
				retirementGoal({
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profile,
			),
		).toBe(1_200_000);
	});
});

describe("rateAfterDrawOnCapitalToggle sticky defaults", () => {
	it("Non→Oui with rate still 3% ⇒ 4%", () => {
		expect(
			rateAfterDrawOnCapitalToggle({
				previousDrawOnCapital: false,
				nextDrawOnCapital: true,
				currentRate: 0.03,
			}),
		).toBe(0.04);
	});

	it("Oui→Non with rate still 4% ⇒ 3%", () => {
		expect(
			rateAfterDrawOnCapitalToggle({
				previousDrawOnCapital: true,
				nextDrawOnCapital: false,
				currentRate: 0.04,
			}),
		).toBe(0.03);
	});

	it("keeps custom rate when leaving interest-only default", () => {
		expect(
			rateAfterDrawOnCapitalToggle({
				previousDrawOnCapital: false,
				nextDrawOnCapital: true,
				currentRate: 0.05,
			}),
		).toBe(0.05);
	});

	it("keeps custom rate when leaving draw-on-capital default", () => {
		expect(
			rateAfterDrawOnCapitalToggle({
				previousDrawOnCapital: true,
				nextDrawOnCapital: false,
				currentRate: 0.025,
			}),
		).toBe(0.025);
	});

	it("no-op when mode unchanged", () => {
		expect(
			rateAfterDrawOnCapitalToggle({
				previousDrawOnCapital: false,
				nextDrawOnCapital: false,
				currentRate: 0.03,
			}),
		).toBe(0.03);
	});
});

describe("normalizeFinancialGoals capitalisation defaults", () => {
	it("legacy retirement goal without mode/rate → Non + 3%", () => {
		const [goal] = normalizeFinancialGoals(
			[
				{
					id: "ret",
					label: "Retraite",
					type: "RETIREMENT_INCOME",
					targetAmount: 3000,
					targetAge: 60,
					inflationIncluded: true,
				},
			],
			new Date("1970-01-01T00:00:00.000Z"),
		);
		expect(goal.drawOnCapital).toBe(false);
		expect(goal.capitalisationRate).toBe(0.03);
		expect(goal.targetDate).toBeInstanceOf(Date);
	});

	it("empty rate with drawOnCapital true → 4%", () => {
		const [goal] = normalizeFinancialGoals([
			retirementGoal({
				drawOnCapital: true,
				capitalisationRate: undefined,
			}),
		]);
		expect(goal.drawOnCapital).toBe(true);
		expect(goal.capitalisationRate).toBe(0.04);
	});
});

describe("validateFinancialGoals capitalisationRate", () => {
	it("rejects rate ≤ 0", () => {
		expect(
			validateFinancialGoals([
				retirementGoal({ capitalisationRate: 0 }),
			]),
		).toEqual({ ok: false, reason: "invalid_capitalisation_rate" });
	});

	it("rejects rate > 0.10", () => {
		expect(
			validateFinancialGoals([
				retirementGoal({ capitalisationRate: 0.11 }),
			]),
		).toEqual({ ok: false, reason: "invalid_capitalisation_rate" });
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

	it("marks retirement goal incomplete without targetDate", () => {
		const assessment = assessFinancialGoals({
			goals: [
				retirementGoal({ targetAge: 64, targetDate: undefined }),
			],
			portfolio: emptyPortfolio(100_000),
			dcaConfigs: [],
			profile: {
				scenarios: {},
				withdrawalRate: 0.04,
			},
			inflationRate: 0.02,
			now,
		});

		expect(assessment!.incompleteProfile).toBe(true);
		expect(assessment!.goals[0].incomplete).toBe(true);
		expect(assessment!.goals[0].status).toBeNull();
		expect(assessment!.goals[0].requiredToday).toBe(1_200_000);
	});

	it("legacy age-only + profile birthDate: migrates targetDate and assesses horizon", () => {
		const birthDate = new Date("1965-04-01T00:00:00.000Z");
		const assessment = assessFinancialGoals({
			goals: [
				retirementGoal({
					targetAge: 64,
					targetDate: undefined,
					publicPensionLink: "NONE",
				}),
			],
			portfolio: emptyPortfolio(100_000),
			dcaConfigs: [],
			profile: {
				birthDate,
				scenarios: {},
				withdrawalRate: 0.04,
			},
			inflationRate: 0.02,
			now: new Date("2026-04-01T00:00:00.000Z"),
		});

		expect(assessment!.goals[0].incomplete).toBe(false);
		expect(assessment!.goals[0].horizonDate).toBe("2029-04-01");
		expect(assessment!.goals[0].goal.targetDate).toEqual(
			new Date("2029-04-01T00:00:00.000Z"),
		);
		expect(assessment!.goals[0].goal.targetAge).toBeUndefined();
	});

	it("exposes pension nette mensuelle when targetDate overlaps scenario (assessment copy)", () => {
		const pensionBrutForNet2000 = 2000 / 0.82;
		const start = new Date("2030-01-01T00:00:00.000Z");
		const profileWithPension: RetirementProfile = {
			...profile,
			scenarios: {
				LEGAL_AGE: {
					startDate: start,
					grossMonthly: pensionBrutForNet2000,
				},
			},
			activeScenario: "LEGAL_AGE",
		};
		const withOverlap = assessFinancialGoals({
			goals: [
				retirementGoal({
					targetDate: start,
					publicPensionLink: "LEGAL_AGE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
			],
			portfolio: emptyPortfolio(100_000),
			dcaConfigs: [],
			profile: profileWithPension,
			inflationRate: 0.02,
			now,
		});
		expect(withOverlap!.goals[0].pensionNetMonthlyApplied).toBeCloseTo(
			2000,
			0,
		);

		const beforeRetirement = assessFinancialGoals({
			goals: [
				retirementGoal({
					targetDate: new Date("2029-12-31T00:00:00.000Z"),
					publicPensionLink: "LEGAL_AGE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
			],
			portfolio: emptyPortfolio(100_000),
			dcaConfigs: [],
			profile: profileWithPension,
			inflationRate: 0.02,
			now,
		});
		expect(beforeRetirement!.goals[0].pensionNetMonthlyApplied).toBe(0);

		const capital = assessFinancialGoals({
			goals: [capitalGoal()],
			portfolio: emptyPortfolio(100_000),
			dcaConfigs: [],
			profile: profileWithPension,
			inflationRate: 0.02,
			now,
		});
		expect(capital!.goals[0].pensionNetMonthlyApplied).toBe(0);
	});
});

describe("public pension link + date overlap (multi-scenario)", () => {
	const fullRateStart = new Date("2054-04-01T00:00:00.000Z");
	const profileWithScenarios: RetirementProfile = {
		birthDate: new Date("1965-06-15T00:00:00.000Z"),
		scenarios: {
			LEGAL_AGE: {
				startDate: new Date("2030-06-15T00:00:00.000Z"),
				grossMonthly: 2966,
			},
			FULL_RATE: {
				startDate: fullRateStart,
				grossMonthly: 2000 / 0.82,
			},
		},
		activeScenario: "LEGAL_AGE",
	};

	it("Aucune / NONE: never subtracts pension", () => {
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetAge: undefined,
					targetDate: new Date("2060-01-01T00:00:00.000Z"),
					publicPensionLink: "NONE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profileWithScenarios,
			),
		).toBe(1_200_000);
	});

	it("FULL_RATE + targetDate >= startDate: subtracts net before capitalisation", () => {
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetAge: undefined,
					targetDate: new Date("2054-04-01T00:00:00.000Z"),
					publicPensionLink: "FULL_RATE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
					targetAmount: 3000,
				}),
				profileWithScenarios,
			),
		).toBeCloseTo((3000 - 2000) * 12 / 0.03, 0);
	});

	it("targetDate before scenario startDate: pension deducted = 0", () => {
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetAge: undefined,
					targetDate: new Date("2054-03-31T00:00:00.000Z"),
					publicPensionLink: "FULL_RATE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profileWithScenarios,
			),
		).toBe(1_200_000);
	});

	it("link to unfilled scenario type: treat as NONE", () => {
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetAge: undefined,
					targetDate: new Date("2060-01-01T00:00:00.000Z"),
					publicPensionLink: "AUTOMATIC_FULL_RATE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profileWithScenarios,
			),
		).toBe(1_200_000);
	});

	it("CAPITAL_AT_DATE: pension link does not change requiredFromTarget", () => {
		expect(
			requiredCapitalToday(
				capitalGoal({
					targetAmount: 200_000,
					publicPensionLink: "FULL_RATE",
				}),
				profileWithScenarios,
			),
		).toBe(200_000);
	});

	it("income <= net pension with overlap: requiredToday = 0", () => {
		expect(
			requiredCapitalToday(
				retirementGoal({
					targetAge: undefined,
					targetAmount: 1500,
					targetDate: new Date("2055-01-01T00:00:00.000Z"),
					publicPensionLink: "FULL_RATE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
				profileWithScenarios,
			),
		).toBe(0);
	});

	it("income <= net + overlap: stock progressCurrent = 1", () => {
		const assessment = assessFinancialGoals({
			goals: [
				retirementGoal({
					targetAge: undefined,
					targetAmount: 1500,
					targetDate: new Date("2055-01-01T00:00:00.000Z"),
					publicPensionLink: "FULL_RATE",
					drawOnCapital: false,
					capitalisationRate: 0.03,
				}),
			],
			portfolio: emptyPortfolio(50_000),
			dcaConfigs: [],
			profile: profileWithScenarios,
			inflationRate: 0.02,
			now: new Date("2026-01-01T00:00:00.000Z"),
		});
		expect(assessment!.goals[0].requiredToday).toBe(0);
		expect(assessment!.goals[0].progressCurrent).toBe(1);
	});

	it("normalize: age-only + birthDate → targetDate anniversary; age dropped", () => {
		const birthDate = new Date("1965-04-01T00:00:00.000Z");
		const [goal] = normalizeFinancialGoals(
			[
				retirementGoal({
					targetAge: 64,
					targetDate: undefined,
				}),
			],
			birthDate,
		);
		expect(goal.targetDate).toEqual(new Date("2029-04-01T00:00:00.000Z"));
		expect(goal.targetAge).toBeUndefined();
	});

	it("normalize: both age and date → targetDate wins, age dropped", () => {
		const [goal] = normalizeFinancialGoals([
			retirementGoal({
				targetAge: 70,
				targetDate: new Date("2050-06-15T00:00:00.000Z"),
			}),
		]);
		expect(goal.targetDate).toEqual(new Date("2050-06-15T00:00:00.000Z"));
		expect(goal.targetAge).toBeUndefined();
	});

	it("validate RETIREMENT_INCOME requires targetDate (not age)", () => {
		expect(
			validateFinancialGoals([
				retirementGoal({
					targetAge: undefined,
					targetDate: new Date("2050-01-01T00:00:00.000Z"),
				}),
			]),
		).toEqual({ ok: true });
		expect(
			validateFinancialGoals([
				retirementGoal({ targetAge: 64, targetDate: undefined }),
			]),
		).toEqual({ ok: false, reason: "missing_target_date" });
	});
});
