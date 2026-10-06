// @vitest-environment jsdom

import type { TaxBracketObservation } from "@patrimo/core/tax-bracket";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaxBracketObservationCard } from "@/components/tax-bracket-observation-card";

afterEach(cleanup);

const ok: TaxBracketObservation = {
	status: "ok",
	rniAnnuel: 30_000,
	quotient: 30_000,
	parts: 1,
	tmi: 0.3,
	trancheLower: 29_579,
	trancheUpper: 84_577,
	roomToNextBracket: 54_577,
	irAnnuelIndicatif: 2_103.99,
	irMensuelIndicatif: 2_103.99 / 12,
	tauxPrelevementConseille: 2_103.99 / 30_000,
	assiettePas: 30_000,
	incomeYear: 2025,
	baremeEffectiveFrom: "2025-01-01",
	strongerDisclaimer: false,
};

describe("TaxBracketObservationCard (N6, D12)", () => {
	it("shows TMI, IR annuel/mensuel, PAS to 1 decimal, tranche, year, disclaimer", () => {
		render(<TaxBracketObservationCard observation={ok} />);

		expect(screen.getByText(/TMI/i)).toBeTruthy();
		expect(screen.getByText(/30\s*%/)).toBeTruthy();
		expect(screen.getByText(/2[\s\u00a0]?103/)).toBeTruthy();
		expect(screen.getByText(/7,0\s*%/)).toBeTruthy();
		expect(screen.getByText(/revenus 2025/i)).toBeTruthy();
		expect(screen.getAllByText(/indicatif/i).length).toBeGreaterThan(0);
		expect(screen.getByText(/décote/i)).toBeTruthy();
		expect(screen.getByText(/plafond/i)).toBeTruthy();
	});

	it("incomplete foyer shows CTA to Fiscalité without invented TMI/IR/PAS", () => {
		render(
			<TaxBracketObservationCard
				observation={{ status: "incomplete", reason: "not_configured" }}
			/>,
		);

		expect(screen.getByRole("link", { name: /Fiscalité/i })).toBeTruthy();
		expect(screen.queryByText(/7,0\s*%/)).toBeNull();
		expect(screen.queryByText(/TMI\s*30/i)).toBeNull();
	});

	it("read-only variant has no foyer editor controls", () => {
		render(<TaxBracketObservationCard observation={ok} readOnly />);
		expect(screen.queryByRole("button", { name: /Enregistrer/i })).toBeNull();
		expect(screen.queryByLabelText(/Parts/i)).toBeNull();
		expect(screen.getByRole("link", { name: /Fiscalité/i })).toBeTruthy();
	});
});
