import { describe, expect, it } from "vitest";
import type { Property } from "../schema";
import {
	acquisitionCost,
	apport,
	grossAnnualRent,
	loanEndDate,
	monthsSince,
	operatingForYear,
} from "./property";

function baseProperty(overrides: Partial<Property> = {}): Property {
	return {
		id: "p1",
		label: "Test",
		detention: "DIRECT",
		regime: "IR_REEL",
		partDetenue: 1,
		dateAcquisition: new Date(Date.UTC(2024, 0, 1)),
		prixAchat: 200_000,
		fraisNotaire: 14_000,
		travaux: 6_000,
		valeurActuelle: 220_000,
		revaloAnnuelle: 0.02,
		montantEmprunte: 160_000,
		tauxCredit: 0.035,
		dureeMois: 240,
		dateDebutCredit: new Date(Date.UTC(2024, 0, 1)),
		tauxAssurance: 0.003,
		modeAssurance: "CRD",
		assuranceMensuelle: 0,
		assurancePaliers: [],
		loyerMensuelHC: 1_000,
		chargesNonRecupAnnuelles: 1_200,
		taxeFonciere: 1_500,
		vacancePct: 0.1,
		fraisGestionPct: 0.08,
		tmiAssocie: 0.3,
		partAmortissable: 0.85,
		dureeAmortissement: 30,
		...overrides,
	};
}

describe("grossAnnualRent", () => {
	it("is 0 for RESIDENCE_PRINCIPALE", () => {
		expect(
			grossAnnualRent(baseProperty({ regime: "RESIDENCE_PRINCIPALE" })),
		).toBe(0);
	});

	it("applies vacancy to monthly rent × 12", () => {
		expect(grossAnnualRent(baseProperty())).toBeCloseTo(
			1_000 * 12 * 0.9,
			6,
		);
	});
});

describe("operatingForYear", () => {
	it("does not index when yearIndex is 0 or omitted", () => {
		const op = operatingForYear(baseProperty(), { rentIndexRate: 0.02 });
		expect(op.grossRent).toBeCloseTo(1_000 * 12 * 0.9, 6);
		expect(op.taxeFonciere).toBe(1_500);
		expect(op.chargesNonRecup).toBe(1_200);
		expect(op.gestion).toBeCloseTo(op.grossRent * 0.08, 6);
		expect(op.operatingCharges).toBeCloseTo(
			op.gestion + op.taxeFonciere + op.chargesNonRecup,
			6,
		);
		expect(op.netOperatingIncome).toBeCloseTo(
			op.grossRent - op.operatingCharges,
			6,
		);
	});

	it("indexes rent and charges by (1+rate)^yearIndex but not taxe foncière", () => {
		const op = operatingForYear(baseProperty(), {
			yearIndex: 2,
			rentIndexRate: 0.02,
		});
		const factor = 1.02 ** 2;
		expect(op.grossRent).toBeCloseTo(1_000 * 12 * 0.9 * factor, 6);
		// Taxe foncière is year-resolved / flat — never × rent index (ADR 0027 history).
		expect(op.taxeFonciere).toBe(1_500);
		expect(op.chargesNonRecup).toBeCloseTo(1_200 * factor, 6);
	});

	it("uses resolved taxe foncière number overload without rent index", () => {
		const result = operatingForYear(baseProperty({ taxeFonciere: 700 }), 950);
		expect(result.taxeFonciere).toBe(950);
		expect(result.operatingCharges).toBe(
			result.gestion + 950 + baseProperty().chargesNonRecupAnnuelles,
		);
	});
});

describe("acquisitionCost and apport", () => {
	it("sums prix + notaire + travaux", () => {
		expect(acquisitionCost(baseProperty())).toBe(220_000);
	});

	it("apport is max(0, cost − emprunt)", () => {
		expect(apport(baseProperty())).toBe(60_000);
		expect(apport(baseProperty({ montantEmprunte: 300_000 }))).toBe(0);
	});
});

describe("monthsSince", () => {
	it("returns 0 when date is missing or in the future", () => {
		const now = new Date(Date.UTC(2026, 0, 1));
		expect(monthsSince(undefined, now)).toBe(0);
		expect(monthsSince(new Date(Date.UTC(2027, 0, 1)), now)).toBe(0);
	});

	it("counts whole UTC months between dates", () => {
		const now = new Date(Date.UTC(2026, 0, 1));
		expect(monthsSince(new Date(Date.UTC(2024, 0, 1)), now)).toBe(24);
		expect(monthsSince(new Date(Date.UTC(2025, 6, 1)), now)).toBe(6);
	});
});

describe("loanEndDate", () => {
	it("returns null without credit start or duration", () => {
		expect(
			loanEndDate(baseProperty({ dateDebutCredit: undefined, dureeMois: 0 })),
		).toBeNull();
		expect(
			loanEndDate(
				baseProperty({ dateDebutCredit: undefined, dureeMois: 240 }),
			),
		).toBeNull();
		expect(
			loanEndDate(
				baseProperty({
					dateDebutCredit: new Date(Date.UTC(2024, 0, 1)),
					dureeMois: 0,
				}),
			),
		).toBeNull();
	});

	it("adds dureeMois to dateDebutCredit", () => {
		const end = loanEndDate(baseProperty({ dureeMois: 24 }));
		expect(end?.toISOString()).toBe(
			new Date(Date.UTC(2026, 0, 1)).toISOString(),
		);
	});
});
