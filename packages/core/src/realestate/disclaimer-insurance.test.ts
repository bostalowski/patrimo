import { describe, expect, it } from "vitest";
import {
	loanInsuranceRuleLabelFr,
	REAL_ESTATE_ASSUMPTIONS_FR,
} from "./projection";

describe("N9 insurance rule disclaimer / labels (ADR 0029)", () => {
	it("REAL_ESTATE_ASSUMPTIONS_FR names CRD, capital initial, forfait, and Assurance emprunt paliers", () => {
		expect(REAL_ESTATE_ASSUMPTIONS_FR).toMatch(/CRD/);
		expect(REAL_ESTATE_ASSUMPTIONS_FR).toMatch(/capital initial/i);
		expect(REAL_ESTATE_ASSUMPTIONS_FR).toMatch(/forfait/i);
		expect(REAL_ESTATE_ASSUMPTIONS_FR).toMatch(/Assurance emprunt/);
		expect(REAL_ESTATE_ASSUMPTIONS_FR).toMatch(/paliers/);
	});

	it("loanInsuranceRuleLabelFr reflects mode and paliers override", () => {
		expect(loanInsuranceRuleLabelFr({ modeAssurance: "CRD" })).toMatch(/CRD/);
		expect(
			loanInsuranceRuleLabelFr({ modeAssurance: "CAPITAL_INITIAL" }),
		).toMatch(/capital initial/i);
		expect(
			loanInsuranceRuleLabelFr({ modeAssurance: "MONTANT_FIXE" }),
		).toMatch(/forfait/i);
		expect(
			loanInsuranceRuleLabelFr({
				modeAssurance: "CRD",
				assurancePaliers: [{ anneeDebut: 1, assuranceMensuelle: 40 }],
			}),
		).toMatch(/paliers/);
	});
});
