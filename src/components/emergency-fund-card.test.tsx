// @vitest-environment jsdom

import type { EmergencyFundHealth } from "@patrimo/core/emergency-fund";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { EmergencyFundCard } from "@/components/emergency-fund-card";

afterEach(cleanup);

function health(
	overrides: Partial<EmergencyFundHealth> = {},
): EmergencyFundHealth {
	return {
		coverageMonths: 4.2,
		status: "acceptable",
		livretBalance: 12_450,
		monthlyExpenses: 2_980,
		...overrides,
	};
}

describe("EmergencyFundCard", () => {
	it("renders months, status label, and input detail when health is defined", () => {
		render(<EmergencyFundCard health={health()} />);

		expect(screen.getByText("Fonds d'urgence")).toBeTruthy();
		expect(screen.getByText(/4,2\s*mois/)).toBeTruthy();
		expect(screen.getByText("Acceptable")).toBeTruthy();
		expect(screen.getByText(/12\s*450.*livrets/i)).toBeTruthy();
		expect(screen.getByText(/2\s*980.*\/\s*mois/i)).toBeTruthy();
	});

	it("renders over-allocated hint when status is over_allocated", () => {
		render(
			<EmergencyFundCard
				health={health({
					coverageMonths: 14,
					status: "over_allocated",
					livretBalance: 42_000,
					monthlyExpenses: 3_000,
				})}
			/>,
		);

		expect(screen.getByText("Surdimensionné")).toBeTruthy();
		expect(
			screen.getByText(/Capital potentiellement immobilisé/i),
		).toBeTruthy();
	});

	it("shows surplus recommendation when actionable", () => {
		render(
			<EmergencyFundCard
				health={health()}
				surplusRecommendation={{
					mode: "oneshot",
					gapEuro: 7_837.42,
					targetEuro: 7_859.25,
					livretBalance: 21.83,
					availableCashMonthly: 8_000,
					rawSavings: 8_650,
					plannedInvestmentDcaMonthly: 650,
					plannedLivretDcaMonthly: 0,
					catchUpHorizonMonths: 12,
					monthlyNeed: 653.12,
					amountToAdd: 7_837.42,
				}}
			/>,
		);

		expect(screen.getByText(/dépose.*7.*837.*LIVRET/i)).toBeTruthy();
		expect(
			screen.getByText(
				/Hors enveloppe DCA — le plan d'investissement n'est pas réalloué/i,
			),
		).toBeTruthy();
	});

	it("omits surplus block when recommendation is null or mode none", () => {
		const { rerender } = render(<EmergencyFundCard health={health()} />);
		expect(screen.queryByText(/Hors enveloppe DCA/i)).toBeNull();

		rerender(
			<EmergencyFundCard
				health={health()}
				surplusRecommendation={{
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
				}}
			/>,
		);
		expect(screen.queryByText(/Hors enveloppe DCA/i)).toBeNull();
	});

	it("renders recommendation-only card when health is null but surplus is actionable", () => {
		render(
			<EmergencyFundCard
				health={null}
				surplusRecommendation={{
					mode: "monthly",
					gapEuro: 6_000,
					targetEuro: 12_000,
					livretBalance: 6_000,
					availableCashMonthly: 1_500,
					rawSavings: 2_000,
					plannedInvestmentDcaMonthly: 500,
					plannedLivretDcaMonthly: 0,
					catchUpHorizonMonths: 12,
					monthlyNeed: 500,
					amountToAdd: 500,
				}}
			/>,
		);

		expect(screen.getByText("Fonds d'urgence")).toBeTruthy();
		expect(screen.queryByText("Acceptable")).toBeNull();
		expect(
			screen.getByText(/ajoute.*500.*\/ mois sur le LIVRET/i),
		).toBeTruthy();
	});

	it("renders nothing when health and surplus recommendation are both absent", () => {
		const { container } = render(
			<EmergencyFundCard health={null} surplusRecommendation={null} />,
		);
		expect(container.firstChild).toBeNull();
	});
});
