import { describe, expect, it } from "vitest";
import type { NextEuroPlan, NextEuroStep } from "./next-euro-plan";
import {
	NEXT_EURO_EF_BANNER_TITLE,
	nextEuroEmergencyFundBannerBody,
	nextEuroLeadRecommendation,
	nextEuroPrimaryStep,
} from "./next-euro-copy";
import type { EmergencyFundSurplusRecommendation } from "./emergency-fund-recommendation";

const formatEuro = (n: number) => `${n} €`;

function step(overrides: Partial<NextEuroStep> = {}): NextEuroStep {
	return {
		priority: 1,
		action: "buy",
		euros: 300,
		kind: "band_catchup",
		envelope: "PEA",
		bandKey: "EUROPE",
		reason: "test",
		...overrides,
	};
}

function plan(steps: NextEuroStep[]): NextEuroPlan {
	return {
		monthlyPool: 500,
		coherence: null,
		steps,
		emergencyFundRecommendation: null,
	};
}

describe("nextEuroPrimaryStep", () => {
	it("prefers the first buy with euros", () => {
		const primary = nextEuroPrimaryStep(
			plan([
				step({ action: "pause", euros: 0, kind: "band_pause", priority: 1 }),
				step({
					action: "buy",
					euros: 200,
					kind: "band_catchup",
					priority: 2,
					assetId: "EU",
				}),
			]),
		);
		expect(primary?.euros).toBe(200);
		expect(primary?.assetId).toBe("EU");
	});

	it("falls back to the first step when no buy", () => {
		const primary = nextEuroPrimaryStep(
			plan([step({ action: "pause", euros: 0, kind: "band_pause" })]),
		);
		expect(primary?.action).toBe("pause");
	});
});

describe("nextEuroLeadRecommendation", () => {
	it("formats a buy lead", () => {
		expect(
			nextEuroLeadRecommendation(step(), "Amundi Europe", formatEuro),
		).toBe("Ce mois-ci : priorise 300 € sur Amundi Europe.");
	});

	it("formats a pause lead", () => {
		expect(
			nextEuroLeadRecommendation(
				step({ action: "pause", euros: 0 }),
				"World",
				formatEuro,
			),
		).toBe("Ce mois-ci : mets en pause World.");
	});
});

describe("nextEuroEmergencyFundBannerBody", () => {
	it("returns null when no actionable recommendation", () => {
		expect(nextEuroEmergencyFundBannerBody(null, formatEuro)).toBeNull();
	});

	it("reuses surplus copy for the banner", () => {
		const recommendation: EmergencyFundSurplusRecommendation = {
			mode: "oneshot",
			gapEuro: 2_000,
			targetEuro: 12_000,
			livretBalance: 10_000,
			availableCashMonthly: 2_500,
			rawSavings: 3_000,
			plannedInvestmentDcaMonthly: 500,
			plannedLivretDcaMonthly: 0,
			catchUpHorizonMonths: 12,
			monthlyNeed: 166.67,
			amountToAdd: 2_000,
		};
		expect(NEXT_EURO_EF_BANNER_TITLE).toMatch(/Fonds d'urgence/);
		expect(nextEuroEmergencyFundBannerBody(recommendation, formatEuro)).toMatch(
			/dépose 2000 €/,
		);
	});
});
