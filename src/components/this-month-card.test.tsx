// @vitest-environment jsdom

import type { NextEuroPlan } from "@patrimo/core/next-euro-plan";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThisMonthCard } from "@/components/this-month-card";

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

describe("ThisMonthCard", () => {
	it("renders nothing when plan is null (pool === 0)", () => {
		const { container } = render(<ThisMonthCard plan={null} />);
		expect(container.firstChild).toBeNull();
	});

	it("shows Ce mois-ci title, saved DCA lead, and Exécution link — not tilt catch-up", () => {
		render(<ThisMonthCard plan={plan()} />);
		expect(screen.getByText("Ce mois-ci")).toBeTruthy();
		expect(screen.getByText(/suis ton plan DCA/i)).toBeTruthy();
		expect(screen.getByText(/Voir les ordres \(Exécution\)/i)).toBeTruthy();
		expect(screen.queryByText(/Ajustement DCA du mois/i)).toBeNull();
		expect(screen.queryByText(/oriente/i)).toBeNull();
		expect(screen.queryByText(/Rattrapage bande/i)).toBeNull();
		expect(screen.queryByText(/Faut-il dévier/i)).toBeNull();
	});

	it("shows EF banner when surplus recommendation is actionable", () => {
		render(
			<ThisMonthCard
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
			/>,
		);
		expect(
			screen.getByText(/Fonds d'urgence \(hors enveloppe DCA\)/i),
		).toBeTruthy();
	});

	it("omits EF banner when recommendation is null or mode none", () => {
		const { rerender } = render(<ThisMonthCard plan={plan()} />);
		expect(
			screen.queryByText(/Fonds d'urgence \(hors enveloppe DCA\)/i),
		).toBeNull();

		rerender(
			<ThisMonthCard
				plan={plan({
					emergencyFundRecommendation: {
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
				})}
			/>,
		);
		expect(
			screen.queryByText(/Fonds d'urgence \(hors enveloppe DCA\)/i),
		).toBeNull();
		expect(screen.getByText(/suis ton plan DCA/i)).toBeTruthy();
	});

	it("shows exposure alert only for stock band_drift breaches (D8)", () => {
		render(
			<ThisMonthCard
				plan={plan({
					coherence: {
						status: "misaligned",
						liquidInvested: 10_000,
						annualDcaTotal: 6_000,
						bands: [
							{
								key: "US",
								minPct: 0.4,
								maxPct: 0.6,
								stockPct: 0.61,
								flowPct: 0.5,
							},
							{
								key: "EUROPE",
								minPct: 0.2,
								maxPct: 0.3,
								stockPct: 0.05,
								flowPct: 0.25,
							},
						],
						findings: [
							{ kind: "band_drift", key: "US", tone: "watch" },
							{ kind: "flow_misalign", key: "US", tone: "breach" },
							{ kind: "band_drift", key: "EUROPE", tone: "breach" },
						],
					},
				})}
			/>,
		);
		expect(screen.getByText(/Exposition hors bande/i)).toBeTruthy();
		expect(screen.getByText(/Europe/i)).toBeTruthy();
		expect(
			screen.getByRole("link", { name: /Voir Diversification/i }),
		).toBeTruthy();
	});

	it("hides exposure alert when no stock breach", () => {
		render(
			<ThisMonthCard
				plan={plan({
					coherence: {
						status: "watch",
						liquidInvested: 10_000,
						annualDcaTotal: 6_000,
						bands: [
							{
								key: "US",
								minPct: 0.4,
								maxPct: 0.6,
								stockPct: 0.61,
								flowPct: null,
							},
						],
						findings: [{ kind: "band_drift", key: "US", tone: "watch" }],
					},
				})}
			/>,
		);
		expect(screen.queryByText(/Exposition hors bande/i)).toBeNull();
	});
});
