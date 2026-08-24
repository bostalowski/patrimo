import { describe, expect, it } from "vitest";
import type { NextEuroPlan, NextEuroStep } from "./next-euro-plan";
import {
	nextEuroEmergencyFundBannerBody,
	nextEuroLeadRecommendation,
	nextEuroPrimaryStep,
} from "./next-euro-copy";

const formatEuro = (n: number) => `${n} €`;

function step(overrides: Partial<NextEuroStep> = {}): NextEuroStep {
	return {
		priority: 1,
		action: "buy",
		euros: 300,
		kind: "band_catchup",
		assetId: "EU",
		envelope: "PEA",
		reason: "test",
		...overrides,
	};
}

const emptyTilt = {
	verdict: "tilt" as const,
	monthlyPool: 500,
	contributions: {},
	catchupContributions: {},
	bandAssetCatchup: [],
	baselineContributions: {},
	pausedAssetIds: [],
	bands: [],
	coherence: null,
};

function plan(steps: NextEuroStep[]): NextEuroPlan {
	return {
		monthlyPool: 500,
		coherence: null,
		steps,
		tilt: emptyTilt,
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
	it("returns null for none / missing", () => {
		expect(nextEuroEmergencyFundBannerBody(null, formatEuro)).toBeNull();
		expect(
			nextEuroEmergencyFundBannerBody(
				{
					mode: "none",
					gapEuro: 0,
					targetEuro: 12_000,
					livretBalance: 12_000,
					availableCashMonthly: 1_500,
					rawSavings: 2_000,
					plannedInvestmentDcaMonthly: 500,
					plannedLivretDcaMonthly: 0,
					catchUpHorizonMonths: 12,
					monthlyNeed: 0,
					amountToAdd: 0,
				},
				formatEuro,
			),
		).toBeNull();
	});
});
