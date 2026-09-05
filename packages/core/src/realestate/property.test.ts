import { describe, expect, it } from "vitest";
import type { Property } from "../schema";
import { operatingForYear } from "./property";

function property(overrides: Partial<Property> = {}): Property {
	return {
		id: "lyon",
		label: "Appartement Lyon",
		detention: "SCI",
		regime: "IR_REEL",
		partDetenue: 1,
		prixAchat: 200000,
		fraisNotaire: 0,
		travaux: 0,
		valeurActuelle: 200000,
		revaloAnnuelle: 0,
		montantEmprunte: 0,
		tauxCredit: 0,
		dureeMois: 0,
		tauxAssurance: 0,
		loyerMensuelHC: 1000,
		chargesNonRecupAnnuelles: 200,
		taxeFonciere: 700,
		vacancePct: 0,
		fraisGestionPct: 0,
		tmiAssocie: 0.3,
		partAmortissable: 0.85,
		dureeAmortissement: 30,
		...overrides,
	};
}

describe("operatingForYear", () => {
	it("uses the flat property.taxeFonciere field when no resolved amount is given (backward compatible default)", () => {
		const result = operatingForYear(property({ taxeFonciere: 700 }));
		expect(result.taxeFonciere).toBe(700);
		expect(result.operatingCharges).toBe(700 + 200);
	});

	it("uses the resolved taxe foncière amount instead of the flat field when provided", () => {
		const result = operatingForYear(property({ taxeFonciere: 700 }), 950);
		expect(result.taxeFonciere).toBe(950);
		expect(result.operatingCharges).toBe(950 + 200);
	});
});
