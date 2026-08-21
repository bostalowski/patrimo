// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { SavingsCapacity } from "@patrimo/core/savings-capacity";
import { SavingsCapacityOverCommitBanner } from "@/components/savings-capacity-overcommit-banner";

afterEach(cleanup);

function capacity(
	overrides: Partial<SavingsCapacity> = {},
): SavingsCapacity {
	return {
		rawSavings: 1_000,
		monthlyEmergencyReserve: 0,
		investableSurplus: 1_000,
		plannedDcaMonthly: 1_500,
		gap: 500,
		status: "over_committed",
		...overrides,
	};
}

describe("SavingsCapacityOverCommitBanner", () => {
	it("renders when status is over_committed", () => {
		render(<SavingsCapacityOverCommitBanner capacity={capacity()} />);
		expect(
			screen.getByText(/DCA au-dessus de ta capacité d'épargne/),
		).toBeTruthy();
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
