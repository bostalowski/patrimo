import { describe, expect, it } from "vitest";
import type { DiversificationCoherenceResult } from "./diversification-coherence";
import type { EmergencyFundHealth } from "./emergency-fund";
import type { GoalsAssessment } from "./financial-goals";
import type { NextEuroPlan } from "./next-euro-plan";
import {
	buildPortfolioHealthCockpit,
	toneForDiversification,
	toneForEmergencyFund,
	toneForGoals,
	toneForRisk,
	toneForSavingsCapacity,
	type PortfolioHealthCockpitInput,
} from "./portfolio-health-cockpit";
import type { SavingsCapacity } from "./savings-capacity";

function emergency(
	status: EmergencyFundHealth["status"],
): EmergencyFundHealth {
	return {
		coverageMonths: 4,
		status,
		livretBalance: 10_000,
		monthlyExpenses: 2_500,
	};
}

function savings(
	status: SavingsCapacity["status"],
): SavingsCapacity {
	return {
		rawSavings: 2_000,
		monthlyEmergencyReserve: 0,
		investableSurplus: 2_000,
		plannedDcaMonthly: 500,
		gap: -1_500,
		status,
	};
}

function diversification(
	status: DiversificationCoherenceResult["status"],
): DiversificationCoherenceResult {
	return {
		bands: [],
		findings: [],
		status,
		liquidInvested: 100_000,
		annualDcaTotal: 6_000,
	};
}

function goals(
	overrides: Partial<GoalsAssessment> = {},
): GoalsAssessment {
	return {
		goals: [],
		sumRequiredToday: 0,
		liquidMarketValue: 0,
		progressOverall: 1,
		projectedCapacity: null,
		sumRequiredAtHorizons: 0,
		oversubscribed: false,
		scenario: "modere",
		incompleteProfile: false,
		...overrides,
	};
}

function nextEuro(reason = "Fonds d'urgence sous 3 mois de dépenses"): NextEuroPlan {
	return {
		monthlyPool: 500,
		coherence: null,
		steps: [
			{
				priority: 1,
				action: "buy",
				euros: 500,
				kind: "emergency_fund",
				envelope: "LIVRET",
				reason,
			},
		],
	};
}

function input(
	overrides: Partial<PortfolioHealthCockpitInput> = {},
): PortfolioHealthCockpitInput {
	return {
		emergencyFund: null,
		savingsCapacity: null,
		diversification: null,
		volatility: null,
		drawdown: null,
		goals: null,
		nextEuroPlan: null,
		...overrides,
	};
}

describe("tone maps", () => {
	it("maps emergency fund statuses", () => {
		expect(toneForEmergencyFund("healthy")).toBe("ok");
		expect(toneForEmergencyFund("acceptable")).toBe("watch");
		expect(toneForEmergencyFund("over_allocated")).toBe("watch");
		expect(toneForEmergencyFund("insufficient")).toBe("breach");
	});

	it("maps savings capacity statuses", () => {
		expect(toneForSavingsCapacity("comfortable")).toBe("ok");
		expect(toneForSavingsCapacity("tight")).toBe("watch");
		expect(toneForSavingsCapacity("over_committed")).toBe("breach");
	});

	it("maps diversification statuses", () => {
		expect(toneForDiversification("aligned")).toBe("ok");
		expect(toneForDiversification("watch")).toBe("watch");
		expect(toneForDiversification("misaligned")).toBe("breach");
	});

	it("maps risk from worst of vol / drawdown; null when both missing", () => {
		expect(toneForRisk(null, null)).toBeNull();
		expect(toneForRisk("low", null)).toBe("ok");
		expect(toneForRisk(null, "mild")).toBe("ok");
		expect(toneForRisk("low", "mild")).toBe("ok");
		expect(toneForRisk("moderate", "mild")).toBe("watch");
		expect(toneForRisk("low", "marked")).toBe("watch");
		expect(toneForRisk("high", "mild")).toBe("breach");
		expect(toneForRisk("low", "severe")).toBe("breach");
		expect(toneForRisk("moderate", "severe")).toBe("breach");
	});

	it("maps goals: oversubscribed breach; behind or incomplete watch", () => {
		expect(toneForGoals(goals())).toBe("ok");
		expect(
			toneForGoals(
				goals({
					goals: [
						{
							goal: {
								id: "g1",
								label: "Maison",
								type: "CAPITAL_AT_DATE",
								targetAmount: 100_000,
								targetDate: new Date("2030-01-01"),
								inflationIncluded: true,
							},
							requiredToday: 100_000,
							progressCurrent: 0.2,
							horizonYears: 4,
							horizonDate: "2030-01-01",
							expired: false,
							incomplete: false,
							projectedReal: 50_000,
							requiredAtHorizon: 110_000,
							targetNominalAtHorizon: 110_000,
							requiredNominalAtHorizon: 110_000,
							status: "behind",
							scenario: "modere",
							inflationRate: 0.02,
						},
					],
				}),
			),
		).toBe("watch");
		expect(toneForGoals(goals({ incompleteProfile: true }))).toBe("watch");
		expect(toneForGoals(goals({ oversubscribed: true }))).toBe("breach");
	});
});

describe("buildPortfolioHealthCockpit", () => {
	it("returns null when nothing to show", () => {
		expect(buildPortfolioHealthCockpit(input())).toBeNull();
	});

	it("hides pills when sources are null", () => {
		const cockpit = buildPortfolioHealthCockpit(
			input({
				emergencyFund: emergency("healthy"),
				volatility: 0.05,
				drawdown: -0.05,
			}),
		);
		expect(cockpit).not.toBeNull();
		expect(cockpit!.pills.map((p) => p.id)).toEqual([
			"emergency_fund",
			"risk",
		]);
		expect(
			buildPortfolioHealthCockpit(input({ volatility: null, drawdown: null }))
				?.pills.find((p) => p.id === "risk"),
		).toBeUndefined();
	});

	it("links savings over_committed to /dca and other statuses to /budget", () => {
		const over = buildPortfolioHealthCockpit(
			input({ savingsCapacity: savings("over_committed") }),
		);
		expect(over!.pills[0].href).toBe("/dca");

		const tight = buildPortfolioHealthCockpit(
			input({ savingsCapacity: savings("tight") }),
		);
		expect(tight!.pills[0].href).toBe("/budget");
	});

	it("prefers next-euro first step over a breach pill", () => {
		const cockpit = buildPortfolioHealthCockpit(
			input({
				emergencyFund: emergency("insufficient"),
				nextEuroPlan: nextEuro(),
			}),
		);
		expect(cockpit!.nextAction.source).toBe("next_euro");
		expect(cockpit!.nextAction.href).toBe("/diversification");
		expect(cockpit!.nextAction.sentence).toMatch(/Acheter/);
		expect(cockpit!.nextAction.sentence).toMatch(/Fonds d'urgence/);
	});

	it("picks breach before watch; fixed order when tones tie", () => {
		const breachOrder = buildPortfolioHealthCockpit(
			input({
				emergencyFund: emergency("insufficient"),
				savingsCapacity: savings("over_committed"),
			}),
		);
		expect(breachOrder!.nextAction.pillId).toBe("emergency_fund");
		expect(breachOrder!.nextAction.source).toBe("pill");

		const savingsFirst = buildPortfolioHealthCockpit(
			input({
				savingsCapacity: savings("over_committed"),
				diversification: diversification("misaligned"),
			}),
		);
		expect(savingsFirst!.nextAction.pillId).toBe("savings_capacity");

		const watchOrder = buildPortfolioHealthCockpit(
			input({
				emergencyFund: emergency("acceptable"),
				diversification: diversification("watch"),
			}),
		);
		expect(watchOrder!.nextAction.pillId).toBe("emergency_fund");
		expect(watchOrder!.nextAction.source).toBe("pill");
	});

	it("uses calm copy when all visible pills are ok", () => {
		const cockpit = buildPortfolioHealthCockpit(
			input({
				emergencyFund: emergency("healthy"),
				savingsCapacity: savings("comfortable"),
				diversification: diversification("aligned"),
				volatility: 0.05,
				drawdown: -0.05,
				goals: goals(),
			}),
		);
		expect(cockpit!.nextAction.source).toBe("all_ok");
		expect(cockpit!.nextAction.href).toBe("/");
		expect(cockpit!.nextAction.sentence).toBe(
			"Rien d'urgent — surveille le Dashboard.",
		);
	});

	it("risk pill uses worst of vol/drawdown only (not sharpe)", () => {
		const ok = buildPortfolioHealthCockpit(
			input({ volatility: 0.05, drawdown: -0.05 }),
		);
		expect(ok!.pills.find((p) => p.id === "risk")?.tone).toBe("ok");

		const watch = buildPortfolioHealthCockpit(
			input({ volatility: 0.15, drawdown: -0.05 }),
		);
		expect(watch!.pills.find((p) => p.id === "risk")?.tone).toBe("watch");

		const breach = buildPortfolioHealthCockpit(
			input({ volatility: 0.05, drawdown: -0.25 }),
		);
		expect(breach!.pills.find((p) => p.id === "risk")?.tone).toBe("breach");
		expect(breach!.pills.find((p) => p.id === "risk")?.href).toBe(
			"/#performance",
		);
	});
});
