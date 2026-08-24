import { describe, expect, it } from "vitest";
import type { SavingsCapacity } from "./savings-capacity";
import {
	savingsCapacityEmergencyFundSurplusRecommendation,
	savingsCapacityLivretRecommendation,
	savingsCapacityRecommendation,
} from "./savings-capacity-copy";

const formatEuro = (n: number) => `${n} €`;

function capacity(
	overrides: Partial<SavingsCapacity> = {},
): SavingsCapacity {
	return {
		rawSavings: 2_000,
		monthlyEmergencyReserve: 0,
		plannedLivretDcaMonthly: 0,
		plannedInvestmentDcaMonthly: 500,
		emergencyMonthlyOutflow: 0,
		investableSurplus: 2_000,
		plannedDcaMonthly: 500,
		gap: -1_500,
		emergencyOverContributing: false,
		emergencyOverContribution: 0,
		emergencyTargetMonths: 6,
		emergencyCatchUpHorizonMonths: 12,
		status: "comfortable",
		emergencyFundRecommendation: null,
		...overrides,
	};
}

describe("savingsCapacityRecommendation", () => {
	it("tells comfortable users nothing to change when they have investment DCA", () => {
		expect(savingsCapacityRecommendation(capacity(), formatEuro)).toMatch(
			/Rien à changer/,
		);
	});

	it("mentions margin when comfortable with no investment DCA", () => {
		expect(
			savingsCapacityRecommendation(
				capacity({ plannedInvestmentDcaMonthly: 0, plannedDcaMonthly: 0 }),
				formatEuro,
			),
		).toMatch(/marge/);
	});

	it("warns tight users not to increase", () => {
		expect(
			savingsCapacityRecommendation(
				capacity({ status: "tight", gap: -100 }),
				formatEuro,
			),
		).toMatch(/près du plafond/);
	});

	it("asks over_committed users to reduce with the gap amount", () => {
		expect(
			savingsCapacityRecommendation(
				capacity({
					status: "over_committed",
					gap: 500,
					investableSurplus: 1_000,
					plannedDcaMonthly: 1_500,
				}),
				formatEuro,
			),
		).toMatch(/À faire.*500 €/);
	});
});

describe("savingsCapacityLivretRecommendation", () => {
	it("returns null when not over-contributing", () => {
		expect(
			savingsCapacityLivretRecommendation(capacity(), formatEuro),
		).toBeNull();
	});

	it("asks to lower LIVRET when over-contributing", () => {
		expect(
			savingsCapacityLivretRecommendation(
				capacity({
					emergencyOverContributing: true,
					emergencyOverContribution: 450,
				}),
				formatEuro,
			),
		).toMatch(/À faire.*450 €/);
	});
});

describe("savingsCapacityEmergencyFundSurplusRecommendation", () => {
	it("returns null when no surplus recommendation", () => {
		expect(
			savingsCapacityEmergencyFundSurplusRecommendation(capacity(), formatEuro),
		).toBeNull();
	});

	it("formats oneshot catch-up from attached recommendation", () => {
		expect(
			savingsCapacityEmergencyFundSurplusRecommendation(
				capacity({
					emergencyFundRecommendation: {
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
					},
				}),
				formatEuro,
			),
		).toMatch(/dépose 2000 €/);
	});
});
