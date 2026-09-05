import { describe, expect, it } from "vitest";
import {
	ASSURANCE_EMPRUNT_HEADERS,
	ALL_SHEETS,
	IMMOBILIER_HEADERS,
	SHEET_ASSURANCE_EMPRUNT,
	SHEET_TAXE_FONCIERE,
	TAXE_FONCIERE_HEADERS,
} from "./workbook-template";

describe("workbook-template loan insurance surface", () => {
	it("registers Assurance emprunt sheet with Bien / Année début / Assurance mensuelle (€)", () => {
		expect(SHEET_ASSURANCE_EMPRUNT).toBe("Assurance emprunt");
		expect([...ASSURANCE_EMPRUNT_HEADERS]).toEqual([
			"Bien",
			"Année début",
			"Assurance mensuelle (€)",
		]);
		const entry = ALL_SHEETS.find((s) => s.name === SHEET_ASSURANCE_EMPRUNT);
		expect(entry?.headers).toEqual([...ASSURANCE_EMPRUNT_HEADERS]);
	});

	it("exposes Mode assurance and Assurance mensuelle (€) on Immobilier", () => {
		expect(IMMOBILIER_HEADERS).toContain("Mode assurance");
		expect(IMMOBILIER_HEADERS).toContain("Assurance mensuelle (€)");
	});
});

describe("workbook-template property tax surface", () => {
	it("registers Taxe foncière sheet with Bien / Année / Montant", () => {
		expect(SHEET_TAXE_FONCIERE).toBe("Taxe foncière");
		expect([...TAXE_FONCIERE_HEADERS]).toEqual(["Bien", "Année", "Montant"]);
		const entry = ALL_SHEETS.find((s) => s.name === SHEET_TAXE_FONCIERE);
		expect(entry?.headers).toEqual([...TAXE_FONCIERE_HEADERS]);
	});
});
