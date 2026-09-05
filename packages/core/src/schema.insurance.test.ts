import { describe, expect, it } from "vitest";
import {
	InsurancePalier,
	LoanInsurancePalier,
	ModeAssurance,
	Property,
} from "./schema";

describe("schema borrower-insurance fields", () => {
	it("parses ModeAssurance enum and defaults Property to CRD", () => {
		expect(ModeAssurance.parse("CRD")).toBe("CRD");
		expect(ModeAssurance.parse("CAPITAL_INITIAL")).toBe("CAPITAL_INITIAL");
		expect(ModeAssurance.parse("MONTANT_FIXE")).toBe("MONTANT_FIXE");
		expect(() => ModeAssurance.parse("OTHER")).toThrow();

		const p = Property.parse({
			id: "p1",
			label: "Loc",
			detention: "DIRECT",
			regime: "IR_REEL",
			dateAcquisition: new Date("2020-01-01"),
			prixAchat: 100_000,
			valeurActuelle: 110_000,
		});
		expect(p.modeAssurance).toBe("CRD");
		expect(p.assuranceMensuelle).toBe(0);
		expect(p.assurancePaliers).toEqual([]);
	});

	it("rejects invalid InsurancePalier / LoanInsurancePalier rows", () => {
		expect(
			InsurancePalier.parse({ anneeDebut: 1, assuranceMensuelle: 40 }),
		).toEqual({ anneeDebut: 1, assuranceMensuelle: 40 });
		expect(() =>
			InsurancePalier.parse({ anneeDebut: 0, assuranceMensuelle: 40 }),
		).toThrow();
		expect(() =>
			InsurancePalier.parse({ anneeDebut: 1, assuranceMensuelle: 0 }),
		).toThrow();
		expect(
			LoanInsurancePalier.parse({
				propertyId: "p1",
				anneeDebut: 2,
				assuranceMensuelle: 55,
			}),
		).toMatchObject({ propertyId: "p1", anneeDebut: 2 });
		expect(() =>
			LoanInsurancePalier.parse({
				propertyId: "",
				anneeDebut: 1,
				assuranceMensuelle: 10,
			}),
		).toThrow();
	});
});
