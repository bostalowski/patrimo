import { describe, expect, it } from "vitest";
import type { Property } from "../schema";
import { projectProperty } from "./projection";

const NOW = new Date(Date.UTC(2026, 0, 1));

function rentalProperty(overrides: Partial<Property> = {}): Property {
	return {
		id: "loc1",
		label: "Locatif",
		detention: "DIRECT",
		regime: "IR_REEL",
		partDetenue: 1,
		dateAcquisition: new Date(Date.UTC(2026, 0, 1)),
		prixAchat: 250_000,
		fraisNotaire: 20_000,
		travaux: 0,
		valeurActuelle: 250_000,
		revaloAnnuelle: 0.02,
		montantEmprunte: 200_000,
		tauxCredit: 0.035,
		dureeMois: 240,
		dateDebutCredit: new Date(Date.UTC(2026, 0, 1)),
		tauxAssurance: 0.003,
		loyerMensuelHC: 1_200,
		chargesNonRecupAnnuelles: 1_000,
		taxeFonciere: 1_200,
		vacancePct: 0,
		fraisGestionPct: 0.07,
		tmiAssocie: 0.3,
		partAmortissable: 0.85,
		dureeAmortissement: 30,
		...overrides,
	};
}

describe("projectProperty rent indexing", () => {
	it("indexes year-k gross rent by (1+r)^k using revalo by default", () => {
		const property = rentalProperty({ revaloAnnuelle: 0.02 });
		const projection = projectProperty(property, {
			horizonYears: 10,
			now: NOW,
		});
		const year10 = projection.years[9];
		const baseRent = 1_200 * 12;
		expect(year10.grossRent).toBeCloseTo(baseRent * 1.02 ** 10, 4);
	});

	it("keeps rents constant when rentIndexRate is 0", () => {
		const property = rentalProperty({ revaloAnnuelle: 0.02 });
		const projection = projectProperty(property, {
			horizonYears: 5,
			now: NOW,
			rentIndexRate: 0,
		});
		expect(projection.years[4].grossRent).toBeCloseTo(1_200 * 12, 4);
	});
});

describe("projectProperty CRD insurance", () => {
	it("charges less insurance in a later year than in year 1 (CRD declines)", () => {
		const property = rentalProperty({ tauxAssurance: 0.003 });
		const projection = projectProperty(property, {
			horizonYears: 10,
			now: NOW,
			rentIndexRate: 0,
			revaloAnnuelle: 0,
		});
		const year1 = projection.years[0].loanInsurance;
		const year10 = projection.years[9].loanInsurance;
		expect(year10).toBeLessThan(year1);
		expect(year1).toBeGreaterThan(0);
	});
});

describe("projectProperty returns", () => {
	it("exposes cagr and irr when apport > 0", () => {
		const property = rentalProperty();
		const projection = projectProperty(property, {
			horizonYears: 15,
			now: NOW,
		});
		expect(projection.apport).toBeGreaterThan(0);
		expect(projection.cagr).not.toBeNull();
		expect(projection.irr).not.toBeNull();
		expect(typeof projection.cagr).toBe("number");
		expect(typeof projection.irr).toBe("number");
	});

	it("hides cagr/irr as null when apport is 0", () => {
		const property = rentalProperty({
			montantEmprunte: 270_000, // prix + notaire
		});
		const projection = projectProperty(property, {
			horizonYears: 10,
			now: NOW,
		});
		expect(projection.apport).toBe(0);
		expect(projection.cagr).toBeNull();
		expect(projection.irr).toBeNull();
	});
});

describe("projectProperty rate 0% with insurance", () => {
	it("still applies CRD-based insurance when credit rate is 0%", () => {
		const property = rentalProperty({
			tauxCredit: 0,
			tauxAssurance: 0.003,
			dureeMois: 120,
		});
		const projection = projectProperty(property, {
			horizonYears: 2,
			now: NOW,
			rentIndexRate: 0,
			revaloAnnuelle: 0,
		});
		expect(projection.years[0].loanInsurance).toBeGreaterThan(0);
		expect(projection.years[1].loanInsurance).toBeLessThan(
			projection.years[0].loanInsurance,
		);
	});
});
