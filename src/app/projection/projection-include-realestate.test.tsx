// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { ProjectionClient } from "@/app/projection/projection-client";
import type { SerializedProperty } from "@/app/projection/realestate-projection";

afterEach(cleanup);

const locative: SerializedProperty = {
	id: "loc1",
	label: "Locatif test",
	detention: "DIRECT",
	regime: "IR_REEL",
	partDetenue: 1,
	dateAcquisition: "2026-01-01T00:00:00.000Z",
	prixAchat: 250_000,
	fraisNotaire: 20_000,
	travaux: 0,
	valeurActuelle: 250_000,
	revaloAnnuelle: 0.02,
	montantEmprunte: 200_000,
	tauxCredit: 0.035,
	dureeMois: 240,
	dateDebutCredit: "2026-01-01T00:00:00.000Z",
	tauxAssurance: 0.003,
	modeAssurance: "CRD",
	assuranceMensuelle: 0,
	assurancePaliers: [],
	loyerMensuelHC: 1_200,
	chargesNonRecupAnnuelles: 1_000,
	taxeFonciere: 1_200,
	vacancePct: 0,
	fraisGestionPct: 0.07,
	tmiAssocie: 0.3,
	partAmortissable: 0.85,
	dureeAmortissement: 30,
};

const residence: SerializedProperty = {
	...locative,
	id: "rp1",
	label: "Résidence",
	regime: "RESIDENCE_PRINCIPALE",
	loyerMensuelHC: 0,
};

const envelopeInputs = [
	{
		envelope: "LIVRET" as const,
		currentValue: 10_000,
		monthlyDefault: 0,
		extraContributions: [],
	},
];

const envelopeRates = {
	LIVRET: 0.024,
	PEA: 0.07,
	PEE: 0.06,
	AV: 0.04,
	CTO: 0.08,
	PER: 0.06,
};

const retirementFilled = {
	profile: {
		scenarios: {
			LEGAL_AGE: { startDate: "2036-01-01", grossMonthly: 2000 },
		},
		activeScenario: "LEGAL_AGE" as const,
	},
	filledScenarios: [
		{
			type: "LEGAL_AGE" as const,
			startDate: "2036-01-01",
			grossMonthly: 2000,
		},
	],
	monthlyRealEstateNet: 0,
	resolved: {
		type: "LEGAL_AGE" as const,
		startDate: "2036-01-01",
		horizonYears: 10,
		grossMonthly: 2000,
		netMonthly: 1700,
	},
};

function renderProjection(properties: SerializedProperty[]) {
	return render(
		<ProjectionClient
			monthlyRestant={0}
			envelopeInputs={envelopeInputs}
			envelopeRates={envelopeRates}
			properties={properties}
			inflationRate={0.02}
			retirement={retirementFilled}
			goalsAlignment={null}
		/>,
	);
}

function patrimoineValue(): number {
	const title = screen.getAllByText("Patrimoine projeté")[0];
	const valueEl = title.parentElement?.querySelector(".text-2xl");
	const text = valueEl?.textContent ?? "";
	const n = Number(text.replace(/\s/g, "").replace(/[^\d,-]/g, "").replace(",", "."));
	if (!Number.isFinite(n)) {
		throw new Error(`Could not parse patrimoine from "${text}"`);
	}
	return n;
}

describe("Projection include real estate checkbox", () => {
	it("N1: default checked includes locative equity and rent line", async () => {
		renderProjection([locative]);
		const box = screen.getByRole("checkbox", {
			name: /inclure l.immobilier/i,
		});
		expect(box).toHaveProperty("checked", true);
		expect(screen.getByText(/loyers nets/i)).toBeTruthy();
		expect(patrimoineValue()).toBeGreaterThan(10_000);
	});

	it("N2: unchecking drops equity and hides rents; financials stay", async () => {
		const user = userEvent.setup();
		renderProjection([locative]);
		const included = patrimoineValue();
		await user.click(
			screen.getByRole("checkbox", { name: /inclure l.immobilier/i }),
		);
		expect(screen.queryByText(/loyers nets/i)).toBeNull();
		expect(patrimoineValue()).toBeLessThan(included);
		expect(
			screen.getAllByText(/pension publique \(net approx\.\)/i).length,
		).toBeGreaterThan(0);
	});

	it("N3: rechecking restores included totals", async () => {
		const user = userEvent.setup();
		renderProjection([locative]);
		const included = patrimoineValue();
		const box = screen.getByRole("checkbox", {
			name: /inclure l.immobilier/i,
		});
		await user.click(box);
		await user.click(box);
		expect(screen.getByText(/loyers nets/i)).toBeTruthy();
		expect(patrimoineValue()).toBe(included);
	});

	it("N4: residence-only still shows checked box without phantom rents", () => {
		renderProjection([residence]);
		const box = screen.getByRole("checkbox", {
			name: /inclure l.immobilier/i,
		});
		expect(box).toHaveProperty("checked", true);
		expect(screen.queryByText(/loyers nets/i)).toBeNull();
	});
});
