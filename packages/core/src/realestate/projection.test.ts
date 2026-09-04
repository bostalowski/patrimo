import { describe, expect, it } from "vitest";
import type { Property, PropertyTax } from "../schema";
import { projectProperty, propertySnapshot } from "./projection";

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

function rentalProperty(overrides: Partial<Property> = {}): Property {
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
		const withoutHistory = rentalProperty();
		const withHistory = rentalProperty();

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

		const snapshot = propertySnapshot(property, now, propertyTaxes);

		expect(snapshot.currentPropertyTax).toBe(950);
	});

	it("part-adjusts currentPropertyTax like other monetary PropertySnapshot fields", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ partDetenue: 0.5 });
		const propertyTaxes = [tax("lyon", 2025, 950)];

		const snapshot = propertySnapshot(property, now, propertyTaxes);

		expect(snapshot.currentPropertyTax).toBe(475);
	});

	it("falls back to the flat field when the property has no history (Edge 1 at the snapshot level)", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ taxeFonciere: 700, partDetenue: 1 });

		const snapshot = propertySnapshot(property, now, []);

		expect(snapshot.currentPropertyTax).toBe(700);
	});

	it("monthlyCashFlowAfterTax reflects the resolved amount rather than the raw flat field", () => {
		const now = new Date("2025-06-15T00:00:00.000Z");
		const property = residenceProperty({ taxeFonciere: 700, partDetenue: 1 });
		const propertyTaxes = [tax("lyon", 2025, 950)];

		const snapshot = propertySnapshot(property, now, propertyTaxes);

		// grossRent = 0, annualTax = 0 for RESIDENCE_PRINCIPALE, so
		// cashFlowAfterTax === -resolvedTaxeFonciere for the current year.
		expect(snapshot.monthlyCashFlowAfterTax).toBeCloseTo(-950 / 12, 6);
	});
});
