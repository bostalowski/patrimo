// @vitest-environment jsdom

import type { NextEuroPlan } from "@patrimo/core/next-euro-plan";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextEuroPlanCard } from "@/components/next-euro-plan-card";

afterEach(cleanup);

function plan(overrides: Partial<NextEuroPlan> = {}): NextEuroPlan {
	return {
		monthlyPool: 500,
		coherence: null,
		steps: [
			{
				priority: 1,
				action: "buy",
				euros: 200,
				kind: "band_catchup",
				assetId: "EU",
				envelope: "PEA",
				bandKey: "EUROPE",
				reason: "Rattrapage bande EUROPE",
			},
			{
				priority: 2,
				action: "pause",
				euros: 0,
				kind: "band_pause",
				assetId: "WPEA",
				bandKey: "US",
				reason: "Surpondération — pause ce mois-ci",
			},
		],
		tilt: {
			verdict: "tilt",
			monthlyPool: 500,
			contributions: { EU: 200, BTC: 300 },
			catchupContributions: { EU: 200 },
			bandAssetCatchup: [{ bandKey: "EUROPE", assetId: "EU", euros: 200 }],
			baselineContributions: { WPEA: 375, EU: 125 },
			pausedAssetIds: ["WPEA"],
			bands: [
				{
					key: "EUROPE",
					stockPct: 0.1,
					minPct: 0.2,
					maxPct: 0.3,
					gapEuros: 2000,
					thisMonthEuros: 200,
					mappable: true,
				},
			],
			coherence: null,
		},
		emergencyFundRecommendation: null,
		...overrides,
	};
}

describe("NextEuroPlanCard", () => {
	it("renders nothing when plan is null", () => {
		const { container } = render(<NextEuroPlanCard plan={null} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders verdict, lead, and execution link", () => {
		render(
			<NextEuroPlanCard
				plan={plan()}
				variant="summary"
				assetLabels={{ EU: "Amundi Europe", WPEA: "World" }}
			/>,
		);
		expect(screen.getByText(/Ajustement DCA du mois/i)).toBeTruthy();
		expect(
			screen.getByText(/Faut-il dévier de ton plan DCA investi/),
		).toBeTruthy();
		expect(screen.getByText(/Ajustement ce mois-ci/i)).toBeTruthy();
		expect(screen.getByText(/Voir les ordres \(Exécution\)/i)).toBeTruthy();
	});

	it("shows EF banner when surplus recommendation is present", () => {
		render(
			<NextEuroPlanCard
				plan={plan({
					emergencyFundRecommendation: {
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
					},
				})}
				variant="summary"
			/>,
		);
		expect(screen.getByText(/Fonds d'urgence \(hors enveloppe DCA\)/i)).toBeTruthy();
	});

	it("shows aligned verdict without step detail in summary", () => {
		render(
			<NextEuroPlanCard
				plan={plan({
					tilt: {
						...plan().tilt,
						verdict: "aligned",
						pausedAssetIds: [],
						bands: [],
					},
					steps: [],
				})}
				variant="summary"
			/>,
		);
		expect(screen.getByText(/Aligné/i)).toBeTruthy();
		expect(screen.queryByText(/Détail de l'ajustement/i)).toBeNull();
	});
});
