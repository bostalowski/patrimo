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
				euros: 300,
				kind: "emergency_fund",
				envelope: "LIVRET",
				reason: "Fonds d'urgence sous 3 mois de dépenses",
			},
			{
				priority: 2,
				action: "buy",
				euros: 200,
				kind: "band_catchup",
				assetId: "EU",
				envelope: "PEA",
				bandKey: "EUROPE",
				reason: "Rattrapage bande EUROPE",
			},
			{
				priority: 3,
				action: "pause",
				euros: 0,
				kind: "band_pause",
				assetId: "WPEA",
				bandKey: "US",
				reason: "Surpondération US",
			},
			{
				priority: 4,
				action: "buy",
				euros: 50,
				kind: "dca_continue",
				assetId: "BTC",
				envelope: "CTO",
				reason: "Poursuite du plan DCA",
			},
		],
		...overrides,
	};
}

describe("NextEuroPlanCard", () => {
	it("renders nothing when plan is null", () => {
		const { container } = render(<NextEuroPlanCard plan={null} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders summary with lead recommendation, top 3, and link", () => {
		render(
			<NextEuroPlanCard
				plan={plan()}
				variant="summary"
				assetLabels={{ EU: "Amundi Europe", WPEA: "World", BTC: "Bitcoin" }}
			/>,
		);
		expect(screen.getByText(/Prochain euro/i)).toBeTruthy();
		expect(
			screen.getByText(/Où prioriser l'enveloppe DCA déjà prévue/),
		).toBeTruthy();
		expect(
			screen.getByText(/Ce mois-ci : priorise.*Livret \(fonds d'urgence\)/),
		).toBeTruthy();
		expect(screen.getByText(/Détail des étapes/)).toBeTruthy();
		expect(screen.getAllByText(/Acheter/i).length).toBeGreaterThan(0);
		expect(screen.getByText("Amundi Europe")).toBeTruthy();
		expect(screen.queryByText("Bitcoin")).toBeNull();
		expect(screen.getByText(/Voir les 4 étapes/i)).toBeTruthy();
	});

	it("renders full list on Diversification variant", () => {
		render(
			<NextEuroPlanCard
				plan={plan()}
				variant="full"
				assetLabels={{ EU: "Amundi Europe", WPEA: "World", BTC: "Bitcoin" }}
			/>,
		);
		expect(screen.getByText("Bitcoin")).toBeTruthy();
		expect(screen.getByText("Pause")).toBeTruthy();
	});
});
