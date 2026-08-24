// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PortfolioHealthCockpit } from "@patrimo/core/portfolio-health-cockpit";
import { PortfolioHealthCockpitCard } from "@/components/portfolio-health-cockpit";

afterEach(cleanup);

function cockpit(
	overrides: Partial<PortfolioHealthCockpit> = {},
): PortfolioHealthCockpit {
	return {
		pills: [
			{
				id: "emergency_fund",
				label: "Fonds d'urgence",
				tone: "breach",
				href: "/budget",
			},
			{
				id: "diversification",
				label: "Diversification",
				tone: "ok",
				href: "/diversification",
			},
		],
		nextAction: {
			sentence: "Priorité : renforcer le fonds d'urgence.",
			href: "/budget",
			source: "pill",
			pillId: "emergency_fund",
		},
		...overrides,
	};
}

describe("PortfolioHealthCockpitCard", () => {
	it("renders nothing when cockpit is null", () => {
		const { container } = render(
			<PortfolioHealthCockpitCard cockpit={null} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders pills as links and the next-action sentence", () => {
		render(<PortfolioHealthCockpitCard cockpit={cockpit()} />);

		expect(screen.getByText("Santé du portefeuille")).toBeTruthy();
		const ef = screen.getByRole("link", {
			name: /Fonds d'urgence.*À traiter/i,
		});
		expect(ef.getAttribute("href")).toBe("/budget");
		expect(screen.getByText("OK")).toBeTruthy();

		const action = screen.getByRole("link", {
			name: /^Priorité : renforcer le fonds d'urgence/,
		});
		expect(action.getAttribute("href")).toBe("/budget");
	});

	it("still shows next-action when there are no pills", () => {
		render(
			<PortfolioHealthCockpitCard
				cockpit={cockpit({
					pills: [],
					nextAction: {
						sentence: "Acheter 500 € — Fonds d'urgence sous 3 mois",
						href: "/diversification",
						source: "next_euro",
					},
				})}
			/>,
		);

		expect(
			screen.getByRole("link", { name: /Acheter 500/ }),
		).toBeTruthy();
	});
});
