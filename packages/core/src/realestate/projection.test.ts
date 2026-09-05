import { describe, expect, it } from "vitest";
import type { LoanInsurancePalier, Property, PropertyTax } from "../schema";
import {
	aggregatePropertySnapshots,
	annualIrr,
	currentEquity,
	projectProperty,
	propertySnapshot,
} from "./projection";

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

describe("projectProperty insurance modes (ADR 0029)", () => {
	it("CAPITAL_INITIAL charges a flat annual insurance across the horizon", () => {
		const property = rentalProperty({
			modeAssurance: "CAPITAL_INITIAL",
			tauxAssurance: 0.003,
		});
		const projection = projectProperty(property, {
			horizonYears: 10,
			now: NOW,
			rentIndexRate: 0,
			revaloAnnuelle: 0,
		});
		const year1 = projection.years[0].loanInsurance;
		const year10 = projection.years[9].loanInsurance;
		expect(year1).toBeCloseTo(year10, 2);
		expect(year1).toBeCloseTo(200_000 * 0.003, 2);
	});

	it("MONTANT_FIXE charges the flat euro amount and ignores tauxAssurance", () => {
		const property = rentalProperty({
			modeAssurance: "MONTANT_FIXE",
			assuranceMensuelle: 42,
			tauxAssurance: 0.003,
		});
		const projection = projectProperty(property, {
			horizonYears: 2,
			now: NOW,
			rentIndexRate: 0,
			revaloAnnuelle: 0,
		});
		expect(projection.years[0].loanInsurance).toBeCloseTo(42 * 12, 2);
	});

	it("MONTANT_FIXE with assuranceMensuelle 0 stays 0 (no fallback)", () => {
		const property = rentalProperty({
			modeAssurance: "MONTANT_FIXE",
			assuranceMensuelle: 0,
			tauxAssurance: 0.003,
		});
		const projection = projectProperty(property, {
			horizonYears: 1,
			now: NOW,
		});
		expect(projection.years[0].loanInsurance).toBe(0);
	});

	it("paliers override the property's mode for this property only", () => {
		const property = rentalProperty({ id: "loc1", modeAssurance: "CRD" });
		const paliers: LoanInsurancePalier[] = [
			{ propertyId: "loc1", anneeDebut: 1, assuranceMensuelle: 40 },
			{ propertyId: "loc1", anneeDebut: 10, assuranceMensuelle: 55 },
			{ propertyId: "other", anneeDebut: 1, assuranceMensuelle: 999 },
		];
		const projection = projectProperty(property, {
			horizonYears: 10,
			now: NOW,
			rentIndexRate: 0,
			revaloAnnuelle: 0,
			paliers,
		});
		expect(projection.years[0].loanInsurance).toBeCloseTo(40 * 12, 2);
		expect(projection.years[8].loanInsurance).toBeCloseTo(40 * 12, 2);
		expect(projection.years[9].loanInsurance).toBeCloseTo(55 * 12, 2);
	});

	it("no paliers for this property -> formula mode applies", () => {
		const property = rentalProperty({ id: "loc1", modeAssurance: "CRD" });
		const paliers: LoanInsurancePalier[] = [
			{ propertyId: "other", anneeDebut: 1, assuranceMensuelle: 999 },
		];
		const projection = projectProperty(property, {
			horizonYears: 1,
			now: NOW,
			paliers,
		});
		expect(projection.years[0].loanInsurance).toBeGreaterThan(0);
		expect(projection.years[0].loanInsurance).toBeLessThan(999 * 12);
	});
});

describe("propertySnapshot insurance paliers threading", () => {
	it("passes paliers through to the underlying projection", () => {
		const property = rentalProperty({ id: "loc1", modeAssurance: "CRD" });
		const paliers: LoanInsurancePalier[] = [
			{ propertyId: "loc1", anneeDebut: 1, assuranceMensuelle: 40 },
		];
		const withPaliers = propertySnapshot(property, NOW, paliers);
		const without = propertySnapshot(property, NOW, []);
		expect(withPaliers.monthlyPayment).not.toBeCloseTo(
			without.monthlyPayment,
			6,
		);
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

describe("annualIrr", () => {
	it("returns null for trivial or same-sign series", () => {
		expect(annualIrr([])).toBeNull();
		expect(annualIrr([-100])).toBeNull();
		expect(annualIrr([-100, -50])).toBeNull();
		expect(annualIrr([100, 50])).toBeNull();
	});

	it("recovers a known 10% two-period IRR", () => {
		// −100 then +110 → IRR = 10%
		expect(annualIrr([-100, 110])).toBeCloseTo(0.1, 6);
	});
});

describe("currentEquity and aggregatePropertySnapshots", () => {
	it("currentEquity is (valeur − remaining) × part", () => {
		const property = rentalProperty({
			valeurActuelle: 250_000,
			partDetenue: 0.5,
			montantEmprunte: 200_000,
			tauxCredit: 0,
			dureeMois: 100,
			dateDebutCredit: new Date(Date.UTC(2025, 0, 1)),
		});
		// 12 months elapsed → remaining 176k; equity = (250k - 176k) * 0.5
		expect(currentEquity(property, NOW)).toBeCloseTo(37_000, 4);
	});

	it("aggregates snapshots into portfolio totals", () => {
		const a = propertySnapshot(rentalProperty({ id: "a" }), NOW);
		const b = propertySnapshot(
			rentalProperty({ id: "b", partDetenue: 0.5, valeurActuelle: 100_000 }),
			NOW,
		);
		const totals = aggregatePropertySnapshots([a, b]);
		expect(totals.value).toBeCloseTo(a.property.valeurActuelle + 50_000, 4);
		expect(totals.equity).toBeCloseTo(a.equity + b.equity, 4);
		expect(totals.debt).toBeCloseTo(a.remainingLoan + b.remainingLoan, 4);
		expect(totals.cashFlow).toBeCloseTo(
			a.monthlyCashFlowAfterTax + b.monthlyCashFlowAfterTax,
			4,
		);
	});
});

describe("projectProperty edge cases", () => {
	it("returns an empty year list when horizon is 0", () => {
		const projection = projectProperty(rentalProperty(), {
			horizonYears: 0,
			now: NOW,
		});
		expect(projection.years).toHaveLength(0);
		expect(projection.cagr).toBeNull();
		expect(projection.irr).toBeNull();
	});

	it("scales KPIs by partDetenue", () => {
		const full = projectProperty(rentalProperty({ partDetenue: 1 }), {
			horizonYears: 1,
			now: NOW,
		});
		const half = projectProperty(rentalProperty({ partDetenue: 0.5 }), {
			horizonYears: 1,
			now: NOW,
		});
		expect(half.monthlyPayment).toBeCloseTo(full.monthlyPayment / 2, 6);
		expect(half.share).toBe(0.5);
	});
});

function residenceProperty(overrides: Partial<Property> = {}): Property {
	// RESIDENCE_PRINCIPALE + no loan keeps operatingCharges/cashFlowAfterTax
	// equal to -taxeFonciere exactly (grossRent = 0, annualTax = 0), which
	// isolates the taxe-foncière-per-year resolution from loan/tax math.
	return {
		id: "lyon",
		label: "Appartement Lyon",
		detention: "DIRECT",
		regime: "RESIDENCE_PRINCIPALE",
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
		modeAssurance: "CRD",
		assuranceMensuelle: 0,
		assurancePaliers: [],
		loyerMensuelHC: 0,
		chargesNonRecupAnnuelles: 0,
		taxeFonciere: 700,
		vacancePct: 0,
		fraisGestionPct: 0,
		tmiAssocie: 0.3,
		partAmortissable: 0.85,
		dureeAmortissement: 30,
		...overrides,
	};
}

function taxHistoryRentalProperty(overrides: Partial<Property> = {}): Property {
	return {
		id: "lyon",
		label: "Appartement Lyon",
		detention: "SCI",
		regime: "IR_REEL",
		partDetenue: 1,
		prixAchat: 200000,
		fraisNotaire: 8000,
		travaux: 0,
		valeurActuelle: 220000,
		revaloAnnuelle: 0.01,
		montantEmprunte: 150000,
		tauxCredit: 0.03,
		dureeMois: 240,
		dateDebutCredit: new Date("2020-01-01T00:00:00.000Z"),
		dateAcquisition: new Date("2020-01-01T00:00:00.000Z"),
		tauxAssurance: 0.003,
		modeAssurance: "CRD",
		assuranceMensuelle: 0,
		assurancePaliers: [],
		loyerMensuelHC: 900,
		chargesNonRecupAnnuelles: 300,
		taxeFonciere: 700,
		vacancePct: 0,
		fraisGestionPct: 0,
		tmiAssocie: 0.3,
		partAmortissable: 0.85,
		dureeAmortissement: 30,
		...overrides,
	};
}

function tax(propertyId: string, year: number, amount: number): PropertyTax {
	return { propertyId, year, amount };
}

describe("projectProperty — taxe foncière per-year resolution (D6 calendarYear mapping)", () => {
	it("Nominal 1 / Teach-back scenario 1: uses the exact-year entry for the current calendar year (k=1)", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty();
		const propertyTaxes = [tax("lyon", 2023, 850), tax("lyon", 2024, 900), tax("lyon", 2025, 950)];

		const result = projectProperty(property, { horizonYears: 5, now, propertyTaxes });

		expect(result.years[0].operatingCharges).toBe(950);
	});

	it("Nominal 2 / Teach-back scenario 1: carries forward the last known value for years beyond the last entry, no auto increase", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty();
		const propertyTaxes = [tax("lyon", 2023, 850), tax("lyon", 2024, 900), tax("lyon", 2025, 950)];

		const result = projectProperty(property, { horizonYears: 5, now, propertyTaxes });

		// years[1..4] => calendar years 2026..2029
		for (let k = 1; k < 5; k += 1) {
			expect(result.years[k].operatingCharges).toBe(950);
		}
	});

	it("Edge 1 / Teach-back scenario 2: falls back to the flat field for every year when there is no history at all", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ taxeFonciere: 700 });

		const result = projectProperty(property, { horizonYears: 3, now, propertyTaxes: [] });

		for (const year of result.years) {
			expect(year.operatingCharges).toBe(700);
		}
	});

	it("Edge 2 / Teach-back scenario 3: carries forward from the nearest earlier entry across a gap", () => {
		const now = new Date("2023-06-15T00:00:00.000Z");
		const property = residenceProperty({ taxeFonciere: 500 });
		const propertyTaxes = [tax("lyon", 2022, 600), tax("lyon", 2024, 680)];

		const result = projectProperty(property, { horizonYears: 1, now, propertyTaxes });

		// k=1 => calendar year 2023: no exact entry, carries forward 2022=600
		expect(result.years[0].operatingCharges).toBe(600);
	});

	it("Edge 3: falls back to the flat field, per year, when no entry is <= the requested year", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ taxeFonciere: 700 });
		const propertyTaxes = [tax("lyon", 2026, 1000)];

		const result = projectProperty(property, { horizonYears: 1, now, propertyTaxes });

		expect(result.years[0].operatingCharges).toBe(700);
	});

	it("Edge 5: a future-year entry is accepted and takes precedence over carry-forward", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty();
		const propertyTaxes = [tax("lyon", 2025, 950), tax("lyon", 2030, 1200)];

		const result = projectProperty(property, { horizonYears: 6, now, propertyTaxes });

		// years[5] => calendar year 2030
		expect(result.years[5].operatingCharges).toBe(1200);
	});
});

describe("Scenario 5 (D3): resaleTax()/capitalGainTax do not vary with taxe foncière history", () => {
	it("two otherwise-identical properties with different taxe foncière histories have the same capitalGainTax/grossPlusValue", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const withoutHistory = taxHistoryRentalProperty();
		const withHistory = taxHistoryRentalProperty();

		const resultWithoutHistory = projectProperty(withoutHistory, {
			horizonYears: 5,
			now,
			propertyTaxes: [],
		});
		const resultWithHistory = projectProperty(withHistory, {
			horizonYears: 5,
			now,
			propertyTaxes: [
				tax("lyon", 2025, 950),
				tax("lyon", 2026, 1000),
				tax("lyon", 2027, 1050),
				tax("lyon", 2028, 1100),
				tax("lyon", 2029, 1150),
			],
		});

		expect(resultWithHistory.resale.grossPlusValue).toBe(
			resultWithoutHistory.resale.grossPlusValue,
		);
		expect(resultWithHistory.resale.capitalGainTax).toBe(
			resultWithoutHistory.resale.capitalGainTax,
		);

		// The taxe foncière difference does feed into the overall result via
		// operating cash flow — that's the whole point of this branch.
		expect(resultWithHistory.totalReturn).not.toBe(resultWithoutHistory.totalReturn);
		expect(resultWithHistory.netIfSold).toBeLessThan(resultWithoutHistory.netIfSold);
	});
});

describe("propertySnapshot — currentPropertyTax (D10)", () => {
	it("Teach-back scenario 6: exposes the taxe foncière resolved for the current calendar year, part-adjusted", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ partDetenue: 1 });
		const propertyTaxes = [tax("lyon", 2023, 850), tax("lyon", 2024, 900), tax("lyon", 2025, 950)];

		const snapshot = propertySnapshot(property, now, [], propertyTaxes);

		expect(snapshot.currentPropertyTax).toBe(950);
	});

	it("part-adjusts currentPropertyTax like other monetary PropertySnapshot fields", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ partDetenue: 0.5 });
		const propertyTaxes = [tax("lyon", 2025, 950)];

		const snapshot = propertySnapshot(property, now, [], propertyTaxes);

		expect(snapshot.currentPropertyTax).toBe(475);
	});

	it("falls back to the flat field when the property has no history (Edge 1 at the snapshot level)", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ taxeFonciere: 700, partDetenue: 1 });

		const snapshot = propertySnapshot(property, now, [], []);

		expect(snapshot.currentPropertyTax).toBe(700);
	});

	it("monthlyCashFlowAfterTax reflects the resolved amount rather than the raw flat field", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ taxeFonciere: 700, partDetenue: 1 });
		const propertyTaxes = [tax("lyon", 2025, 950)];

		const snapshot = propertySnapshot(property, now, [], propertyTaxes);

		// grossRent = 0, annualTax = 0 for RESIDENCE_PRINCIPALE, so
		// cashFlowAfterTax === -resolvedTaxeFonciere for the current year.
		expect(snapshot.monthlyCashFlowAfterTax).toBeCloseTo(-950 / 12, 6);
	});
});
