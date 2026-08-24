// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SavingsCapacity } from "@patrimo/core/savings-capacity";
import { SavingsCapacityCard } from "@/components/savings-capacity-card";

afterEach(cleanup);

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
		...overrides,
	};
}

describe("SavingsCapacityCard", () => {
	it("renders question, surplus caption, recommendation, and status", () => {
		render(<SavingsCapacityCard capacity={capacity()} />);

		expect(screen.getByText("Capacité d'épargne")).toBeTruthy();
		expect(
			screen.getByText(/Ton plan d'investissement tient-il avec ton budget/),
		).toBeTruthy();
		expect(screen.getByText("À l'aise")).toBeTruthy();
		expect(screen.getByText(/Surplus investissable/)).toBeTruthy();
		expect(screen.getByText(/Rien à changer/)).toBeTruthy();
		expect(screen.getByText(/DCA investi.*500/)).toBeTruthy();
	});

	it("shows actionable recommendation when over_committed", () => {
		render(
			<SavingsCapacityCard
				capacity={capacity({
					investableSurplus: 1_000,
					plannedDcaMonthly: 1_500,
					plannedInvestmentDcaMonthly: 1_500,
					gap: 500,
					status: "over_committed",
				})}
			/>,
		);

		expect(screen.getByText("Surengagé")).toBeTruthy();
		expect(screen.getByText(/À faire.*baisse le DCA investi.*500/)).toBeTruthy();
	});

	it("explains emergency catch-up reserve in supporting detail", () => {
		render(
			<SavingsCapacityCard
				capacity={capacity({
					monthlyEmergencyReserve: 1_308.06,
					investableSurplus: 691.94,
				})}
			/>,
		);

		expect(
			screen.getByText(/besoin rattrapage.*1[\s\u00a0\u202f]?308.*atteindre 6 mois de dépenses/),
		).toBeTruthy();
	});

	it("shows absolute target label when override is used", () => {
		render(
			<SavingsCapacityCard
				capacity={capacity({
					monthlyEmergencyReserve: 800,
					emergencyTargetEuro: 10_000,
				})}
			/>,
		);
		expect(screen.getByText(/800.*atteindre.*10[\s\u00a0\u202f]?000/)).toBeTruthy();
	});

	it("shows LIVRET recommendation when over-contributing", () => {
		render(
			<SavingsCapacityCard
				capacity={capacity({
					plannedLivretDcaMonthly: 1_200,
					monthlyEmergencyReserve: 750,
					emergencyOverContributing: true,
					emergencyOverContribution: 450,
				})}
			/>,
		);
		expect(screen.getByText(/LIVRET prévu.*1[\s\u00a0\u202f]?200/)).toBeTruthy();
		expect(
			screen.getByText(/À faire.*baisse le dépôt LIVRET.*450/),
		).toBeTruthy();
	});

	it("renders nothing when capacity is null", () => {
		const { container } = render(<SavingsCapacityCard capacity={null} />);
		expect(container.firstChild).toBeNull();
	});
});
