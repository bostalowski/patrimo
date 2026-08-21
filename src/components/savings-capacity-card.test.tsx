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

	it("renders nothing when capacity is null", () => {
		const { container } = render(<SavingsCapacityCard capacity={null} />);
		expect(container.firstChild).toBeNull();
	});
});
