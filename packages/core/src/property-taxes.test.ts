import { describe, expect, it } from "vitest";
import type { Property, PropertyTax, Workbook } from "./schema";
import {
	deletePropertyTax,
	normalizePropertyTaxes,
	removePropertyTaxesForProperties,
	resolvePropertyTaxForYear,
	upsertPropertyTax,
} from "./property-taxes";

function property(id: string, overrides: Partial<Property> = {}): Property {
	return {
		id,
		label: id,
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

function workbook(overrides: Partial<Workbook> = {}): Workbook {
	return {
		transactions: [],
		assets: [],
		accounts: [],
		budget: [],
		properties: [property("lyon")],
		dca: [],
		manualPrices: [],
		geographicAllocations: [],
		sectorAllocations: [],
		diversificationTargets: [],
		financialGoals: [],
		propertyTaxes: [],
		...overrides,
	};
}

function tax(propertyId: string, year: number, amount: number): PropertyTax {
	return { propertyId, year, amount };
}

describe("resolvePropertyTaxForYear", () => {
	it("returns the exact-year entry when it exists (Nominal 1)", () => {
		const entries = [tax("lyon", 2023, 850), tax("lyon", 2024, 900), tax("lyon", 2025, 950)];
		expect(resolvePropertyTaxForYear(entries, "lyon", 2025, 700)).toBe(950);
	});

	it("carries forward the last known value beyond the last entry, no auto increase (Nominal 2)", () => {
		const entries = [tax("lyon", 2023, 850), tax("lyon", 2024, 900), tax("lyon", 2025, 950)];
		for (const year of [2026, 2027, 2028, 2029]) {
			expect(resolvePropertyTaxForYear(entries, "lyon", year, 700)).toBe(950);
		}
	});

	it("falls back to the flat field when there are no entries at all (Edge 1)", () => {
		expect(resolvePropertyTaxForYear([], "lyon", 2025, 700)).toBe(700);
	});

	it("carries forward from the nearest earlier entry across a gap (Edge 2)", () => {
		const entries = [tax("nantes", 2022, 600), tax("nantes", 2024, 680)];
		expect(resolvePropertyTaxForYear(entries, "nantes", 2023, 500)).toBe(600);
	});

	it("falls back to the flat field, per year, when no entry is <= the requested year (Edge 3)", () => {
		const entries = [tax("lyon", 2026, 1000)];
		expect(resolvePropertyTaxForYear(entries, "lyon", 2025, 700)).toBe(700);
	});

	it("accepts a future-year entry and it takes precedence over carry-forward (Edge 5)", () => {
		const entries = [tax("lyon", 2025, 950), tax("lyon", 2030, 1200)];
		expect(resolvePropertyTaxForYear(entries, "lyon", 2030, 700)).toBe(1200);
	});

	it("ignores entries for other properties", () => {
		const entries = [tax("marseille", 2025, 400)];
		expect(resolvePropertyTaxForYear(entries, "lyon", 2025, 700)).toBe(700);
	});
});

describe("normalizePropertyTaxes", () => {
	it("keeps the last valid row when duplicates share the same (property, year) key (Edge 6)", () => {
		const properties = [property("lyon")];
		const first = tax("lyon", 2025, 950);
		const second = tax("lyon", 2025, 960);
		const result = normalizePropertyTaxes([first, second], properties);
		expect(result).toEqual([second]);
	});

	it("drops rows referencing an unknown property", () => {
		const result = normalizePropertyTaxes([tax("unknown", 2025, 100)], [property("lyon")]);
		expect(result).toEqual([]);
	});

	it("drops rows with a non-finite or negative amount", () => {
		const properties = [property("lyon")];
		const result = normalizePropertyTaxes(
			[tax("lyon", 2025, Number.NaN), tax("lyon", 2026, -1)],
			properties,
		);
		expect(result).toEqual([]);
	});
});

describe("upsertPropertyTax", () => {
	it("appends a new (property, year) row", () => {
		const result = upsertPropertyTax(workbook(), tax("lyon", 2025, 950));
		expect(result.propertyTaxes).toEqual([tax("lyon", 2025, 950)]);
	});

	it("replaces an existing row for the same (property, year) instead of rejecting the duplicate (Edge 6 / D8)", () => {
		const source = workbook({ propertyTaxes: [tax("lyon", 2025, 950)] });
		const result = upsertPropertyTax(source, tax("lyon", 2025, 960));
		expect(result.propertyTaxes).toEqual([tax("lyon", 2025, 960)]);
	});

	it("accepts a future year without throwing (D9)", () => {
		expect(() => upsertPropertyTax(workbook(), tax("lyon", 2999, 100))).not.toThrow();
	});

	it("rejects a property tax for an unknown property", () => {
		expect(() => upsertPropertyTax(workbook(), tax("unknown", 2025, 100))).toThrow(/property/i);
	});
});

describe("deletePropertyTax", () => {
	it("removes one row without affecting other years or properties", () => {
		const removed = tax("lyon", 2025, 950);
		const otherYear = tax("lyon", 2026, 960);
		const otherProperty = tax("marseille", 2025, 400);
		const source = workbook({
			properties: [property("lyon"), property("marseille")],
			propertyTaxes: [removed, otherYear, otherProperty],
		});
		const result = deletePropertyTax(source, "lyon", 2025);
		expect(result.propertyTaxes).toEqual([otherYear, otherProperty]);
	});
});

describe("removePropertyTaxesForProperties (deletion cascade, Edge 4)", () => {
	it("removes every row referencing a deleted property id", () => {
		const kept = tax("marseille", 2025, 400);
		const source = workbook({
			properties: [property("lyon"), property("marseille")],
			propertyTaxes: [tax("lyon", 2025, 950), tax("lyon", 2026, 960), kept],
		});
		const result = removePropertyTaxesForProperties(source, new Set(["lyon"]));
		expect(result.propertyTaxes).toEqual([kept]);
	});

	it("is a no-op for an empty id set", () => {
		const source = workbook({ propertyTaxes: [tax("lyon", 2025, 950)] });
		const result = removePropertyTaxesForProperties(source, new Set());
		expect(result.propertyTaxes).toEqual([tax("lyon", 2025, 950)]);
	});
});
