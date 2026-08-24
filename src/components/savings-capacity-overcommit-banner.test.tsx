// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SavingsCapacity } from "@patrimo/core/savings-capacity";
import {
	SavingsCapacityEmergencyOverBanner,
	SavingsCapacityOverCommitBanner,
} from "@/components/savings-capacity-overcommit-banner";

afterEach(cleanup);

function capacity(
	overrides: Partial<SavingsCapacity> = {},
): SavingsCapacity {
	return {
		rawSavings: 1_000,
		monthlyEmergencyReserve: 0,
		plannedLivretDcaMonthly: 0,
		plannedInvestmentDcaMonthly: 1_500,
		emergencyMonthlyOutflow: 0,
		investableSurplus: 1_000,
		plannedDcaMonthly: 1_500,
		gap: 500,
		emergencyOverContributing: false,
		emergencyOverContribution: 0,
		emergencyTargetMonths: 6,
		emergencyCatchUpHorizonMonths: 12,
		status: "over_committed",
		...overrides,
	};
}

describe("SavingsCapacityOverCommitBanner", () => {
	it("renders when status is over_committed", () => {
		render(<SavingsCapacityOverCommitBanner capacity={capacity()} />);
		expect(
			screen.getByText(/DCA investi au-dessus de ta capacité/),
		).toBeTruthy();
		expect(screen.getByText(/À faire.*baisse tes plans/)).toBeTruthy();
		expect(screen.getByText(/1\s*500/)).toBeTruthy();
	});

	it("renders nothing when status is comfortable", () => {
		const { container } = render(
			<SavingsCapacityOverCommitBanner
				capacity={capacity({ status: "comfortable", gap: -500 })}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when capacity is null", () => {
		const { container } = render(
			<SavingsCapacityOverCommitBanner capacity={null} />,
		);
		expect(container.firstChild).toBeNull();
	});
});

describe("SavingsCapacityEmergencyOverBanner", () => {
	it("renders when emergencyOverContributing is true", () => {
		render(
			<SavingsCapacityEmergencyOverBanner
				capacity={capacity({
					status: "comfortable",
					plannedLivretDcaMonthly: 1_200,
					monthlyEmergencyReserve: 750,
					emergencyOverContributing: true,
					emergencyOverContribution: 450,
				})}
			/>,
		);
		expect(
			screen.getByText(/Dépôt LIVRET au-dessus du besoin de rattrapage/),
		).toBeTruthy();
		expect(screen.getByText(/À faire.*baisse le plan LIVRET/)).toBeTruthy();
		expect(screen.getByText(/1[\s\u00a0\u202f]?200/)).toBeTruthy();
		expect(screen.getByText(/750/)).toBeTruthy();
	});

	it("renders nothing when not over-contributing", () => {
		const { container } = render(
			<SavingsCapacityEmergencyOverBanner capacity={capacity()} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when capacity is null", () => {
		const { container } = render(
			<SavingsCapacityEmergencyOverBanner capacity={null} />,
		);
		expect(container.firstChild).toBeNull();
	});
});
