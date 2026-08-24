import { describe, expect, it } from "vitest";
import type { NextEuroPlan, NextEuroStep } from "./next-euro-plan";
import {
	nextEuroLeadRecommendation,
	nextEuroPrimaryStep,
} from "./next-euro-copy";

const formatEuro = (n: number) => `${n} €`;

function step(overrides: Partial<NextEuroStep> = {}): NextEuroStep {
	return {
		priority: 1,
		action: "buy",
		euros: 300,
		kind: "emergency_fund",
		envelope: "LIVRET",
		reason: "test",
		...overrides,
	};
}

function plan(steps: NextEuroStep[]): NextEuroPlan {
	return { monthlyPool: 500, coherence: null, steps };
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
			nextEuroLeadRecommendation(
				step(),
				"Livret (fonds d'urgence)",
				formatEuro,
			),
		).toBe(
			"Ce mois-ci : priorise 300 € sur Livret (fonds d'urgence).",
		);
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
