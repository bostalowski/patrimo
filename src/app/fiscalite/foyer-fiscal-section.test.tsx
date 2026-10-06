// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn() }),
}));

import { FoyerFiscalSection } from "@/app/fiscalite/foyer-fiscal-section";

afterEach(cleanup);

describe("FoyerFiscalSection (N6 editor)", () => {
	it("owns create/edit controls plus pack and disclaimer", () => {
		render(
			<FoyerFiscalSection
				config={null}
				observation={{ status: "incomplete", reason: "not_configured" }}
				brackets={[
					{ upperBound: 11_600, rate: 0 },
					{ upperBound: 29_579, rate: 0.11 },
					{ upperBound: 84_577, rate: 0.3 },
					{ upperBound: 181_917, rate: 0.41 },
					{ upperBound: null, rate: 0.45 },
				]}
				incomeYear={2025}
			/>,
		);

		expect(screen.getByLabelText(/Source/i)).toBeTruthy();
		expect(screen.getByLabelText(/Parts/i)).toBeTruthy();
		expect(screen.getByRole("button", { name: /Enregistrer/i })).toBeTruthy();
		expect(screen.getAllByText(/barème/i).length).toBeGreaterThan(0);
		expect(screen.getAllByText(/indicatif/i).length).toBeGreaterThan(0);
	});
});
