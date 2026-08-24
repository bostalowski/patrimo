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
		investableSurplus: 2_000,
		plannedDcaMonthly: 500,
		gap: -1_500,
		emergencyTargetMonths: 6,
		emergencyCatchUpHorizonMonths: 12,
		status: "comfortable",
		...overrides,
	};
}

describe("SavingsCapacityCard", () => {
	it("renders surplus, planned DCA, and status when defined", () => {
		render(<SavingsCapacityCard capacity={capacity()} />);

		expect(screen.getByText("Capacité d'épargne")).toBeTruthy();
		expect(screen.getByText("À l'aise")).toBeTruthy();
		expect(screen.getByText(/2\s*000.*\/\s*mois/)).toBeTruthy();
		expect(screen.getByText(/DCA prévu.*500/)).toBeTruthy();
	});

	it("shows gap hint when over_committed", () => {
		render(
			<SavingsCapacityCard
				capacity={capacity({
					investableSurplus: 1_000,
					plannedDcaMonthly: 1_500,
					gap: 500,
					status: "over_committed",
				})}
			/>,
		);

		expect(screen.getByText("Surengagé")).toBeTruthy();
		expect(screen.getByText(/Écart.*500/)).toBeTruthy();
	});

	it("explains emergency catch-up reserve in plain language", () => {
		render(
			<SavingsCapacityCard
				capacity={capacity({
					monthlyEmergencyReserve: 1_308.06,
					investableSurplus: 691.94,
				})}
			/>,
		);

		expect(
			screen.getByText(/1[\s\u00a0\u202f]?308.*\/\s*mois pour atteindre 6 mois de dépenses/),
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

	it("renders nothing when capacity is null", () => {
		const { container } = render(<SavingsCapacityCard capacity={null} />);
		expect(container.firstChild).toBeNull();
	});
});
