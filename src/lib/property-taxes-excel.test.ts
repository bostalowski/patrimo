import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Workbook } from "@patrimo/core/schema";
import * as mobileExcel from "../../mobile/lib/excel-mobile";

const configState = vi.hoisted(() => ({ excelPath: null as string | null }));

vi.mock("@/lib/config", () => ({
	getConfiguredExcelPath: () => configState.excelPath,
	resolveUserPath: (path: string) => path,
}));

import * as webExcel from "@/lib/excel";

const TAXE_FONCIERE_SHEET = "Taxe foncière";
const TAXE_FONCIERE_HEADERS = ["Bien", "Année", "Montant"];
const IMMOBILIER_SHEET = "Immobilier";
const IMMOBILIER_HEADERS = [
	"ID",
	"Libellé",
	"Détention",
	"Régime",
	"Part détenue",
	"Date acquisition",
	"Prix achat",
	"Frais notaire",
	"Travaux",
	"Valeur actuelle",
	"Revalo annuelle",
	"Montant emprunté",
	"Taux crédit",
	"Durée (mois)",
	"Date début crédit",
	"Taux assurance",
	"Loyer mensuel HC",
	"Charges non récup",
	"Taxe foncière",
	"Vacance",
	"Frais gestion",
	"TMI associé",
	"Part amortissable",
	"Durée amortissement",
	"Notes",
];

type PropertyTax = { propertyId: string; year: number; amount: number };

type PropertyTaxWorkbook = Workbook & { propertyTaxes: PropertyTax[] };

let temporaryDirectory: string;

beforeEach(() => {
	temporaryDirectory = mkdtempSync(join(tmpdir(), "patrimo-property-taxes-"));
	configState.excelPath = join(temporaryDirectory, "portfolio.xlsx");
	webExcel.resetWorkbookCache();
});

afterEach(() => {
	configState.excelPath = null;
	webExcel.resetWorkbookCache();
	rmSync(temporaryDirectory, { recursive: true, force: true });
});

function appendSheet(
	workbook: XLSX.WorkBook,
	name: string,
	rows: unknown[][],
): void {
	XLSX.utils.book_append_sheet(
		workbook,
		XLSX.utils.aoa_to_sheet(rows, { cellDates: true }),
		name,
	);
}

function propertyRow(id: string): unknown[] {
	return [
		id,
		"Appartement Lyon",
		"SCI",
		"IR_REEL",
		1,
		null,
		200000,
		0,
		0,
		200000,
		0,
		0,
		0,
		0,
		null,
		0,
		900,
		300,
		700,
		0,
		0,
		0.3,
		0.85,
		30,
		null,
	];
}

function sourceBuffer(propertyTaxRows?: unknown[][]): ArrayBuffer {
	const workbook = XLSX.utils.book_new();
	appendSheet(workbook, "Transactions", [
		[
			"Date",
			"Type",
			"Compte",
			"Compte destination",
			"Actif",
			"Quantité",
			"Prix unitaire",
			"Devise",
			"Frais",
			"Frais devise",
			"Notes",
		],
	]);
	appendSheet(workbook, "Actifs", [
		[
			"ID",
			"Libellé",
			"Type",
			"ISIN",
			"Ticker",
			"Source prix",
			"Param source",
			"Devise",
			"TER",
		],
	]);
	appendSheet(workbook, "Comptes", [
		["ID", "Libellé", "Type", "Enveloppe", "Date d'ouverture", "Taux", "Plafond"],
	]);
	appendSheet(workbook, IMMOBILIER_SHEET, [
		IMMOBILIER_HEADERS,
		propertyRow("lyon"),
		propertyRow("marseille"),
	]);
	appendSheet(workbook, "Metadata", [
		["Key", "Value"],
		["preserved", "yes"],
	]);
	if (propertyTaxRows) {
		appendSheet(workbook, TAXE_FONCIERE_SHEET, [
			TAXE_FONCIERE_HEADERS,
			...propertyTaxRows,
		]);
	}

	return XLSX.write(workbook, {
		type: "array",
		bookType: "xlsx",
		cellDates: true,
	}) as ArrayBuffer;
}

function writeWebSource(buffer: ArrayBuffer): void {
	const path = configState.excelPath;
	if (!path) throw new Error("Web Excel path is not configured");
	writeFileSync(path, Buffer.from(buffer));
}

function readWebSource(): XLSX.WorkBook {
	const path = configState.excelPath;
	if (!path) throw new Error("Web Excel path is not configured");
	return XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
}

function sheetRows(
	workbook: XLSX.WorkBook,
	sheetName: string,
): unknown[][] | undefined {
	const sheet = workbook.Sheets[sheetName];
	return sheet
		? XLSX.utils.sheet_to_json<unknown[]>(sheet, {
				header: 1,
				raw: true,
				defval: null,
			})
		: undefined;
}

function propertyTaxesFrom(source: Workbook): PropertyTax[] {
	return (source as PropertyTaxWorkbook).propertyTaxes;
}

describe("web and mobile property-tax Excel adapters (Taxe foncière sheet)", () => {
	it("web treats a missing Taxe foncière sheet as an empty collection (Edge 1)", () => {
		writeWebSource(sourceBuffer());

		const result = webExcel.loadWorkbook();

		expect(propertyTaxesFrom(result)).toEqual([]);
	});

	it("mobile treats a missing Taxe foncière sheet as an empty collection (Edge 1)", () => {
		const result = mobileExcel.parseWorkbook(sourceBuffer());

		expect(propertyTaxesFrom(result.workbook)).toEqual([]);
	});

	it("web parsing ignores an orphan row and keeps the last valid duplicate (Edge 6)", () => {
		writeWebSource(
			sourceBuffer([
				["lyon", 2025, 950],
				["unknown-property", 2025, 111],
				["lyon", 2025, 960],
			]),
		);

		const result = webExcel.loadWorkbook();

		expect(propertyTaxesFrom(result)).toEqual([
			{ propertyId: "lyon", year: 2025, amount: 960 },
		]);
	});

	it("mobile parsing ignores an orphan row and keeps the last valid duplicate (Edge 6)", () => {
		const result = mobileExcel.parseWorkbook(
			sourceBuffer([
				["lyon", 2025, 950],
				["unknown-property", 2025, 111],
				["lyon", 2025, 960],
			]),
		);

		expect(propertyTaxesFrom(result.workbook)).toEqual([
			{ propertyId: "lyon", year: 2025, amount: 960 },
		]);
	});

	it("web round-trips property tax rows without changing other workbook data (Nominal 3)", () => {
		writeWebSource(sourceBuffer());
		const original = webExcel.loadWorkbook();
		const nextPropertyTaxes: PropertyTax[] = [
			{ propertyId: "lyon", year: 2024, amount: 900 },
			{ propertyId: "lyon", year: 2025, amount: 950 },
		];

		webExcel.replaceWorkbook({
			...original,
			propertyTaxes: nextPropertyTaxes,
		} as PropertyTaxWorkbook);
		webExcel.resetWorkbookCache();
		const parsed = webExcel.loadWorkbook();
		const persistedWorkbook = readWebSource();

		expect(sheetRows(persistedWorkbook, TAXE_FONCIERE_SHEET)?.[0]).toEqual(
			TAXE_FONCIERE_HEADERS,
		);
		expect(propertyTaxesFrom(parsed)).toEqual(nextPropertyTaxes);
		expect(sheetRows(persistedWorkbook, "Metadata")).toEqual([
			["Key", "Value"],
			["preserved", "yes"],
		]);
	});

	it("mobile round-trips property tax rows without changing other workbook data (Nominal 3)", () => {
		const source = sourceBuffer();
		const original = mobileExcel.parseWorkbook(source).workbook;
		const nextPropertyTaxes: PropertyTax[] = [
			{ propertyId: "lyon", year: 2025, amount: 950 },
		];

		const serialized = mobileExcel.serializeWorkbook(source, {
			...original,
			propertyTaxes: nextPropertyTaxes,
		} as PropertyTaxWorkbook);
		const parsed = mobileExcel.parseWorkbook(serialized);
		const persistedWorkbook = XLSX.read(serialized, {
			type: "array",
			cellDates: true,
		});

		expect(sheetRows(persistedWorkbook, TAXE_FONCIERE_SHEET)?.[0]).toEqual(
			TAXE_FONCIERE_HEADERS,
		);
		expect(propertyTaxesFrom(parsed.workbook)).toEqual(nextPropertyTaxes);
		expect(sheetRows(persistedWorkbook, "Metadata")).toEqual([
			["Key", "Value"],
			["preserved", "yes"],
		]);
	});

	it("a newly created workbook includes an empty Taxe foncière sheet", () => {
		const path = join(temporaryDirectory, "new-workbook.xlsx");

		webExcel.createEmptyWorkbook(path);

		const created = XLSX.read(readFileSync(path), {
			type: "buffer",
			cellDates: true,
		});
		expect(sheetRows(created, TAXE_FONCIERE_SHEET)).toEqual([
			TAXE_FONCIERE_HEADERS,
		]);
	});

	it("deleteProperty removes its Taxe foncière rows but keeps other properties' rows (Edge 4, cascade)", () => {
		writeWebSource(
			sourceBuffer([
				["lyon", 2025, 950],
				["lyon", 2026, 960],
				["marseille", 2025, 400],
			]),
		);

		webExcel.deleteProperty("lyon");
		webExcel.resetWorkbookCache();
		const result = webExcel.loadWorkbook();

		expect(propertyTaxesFrom(result)).toEqual([
			{ propertyId: "marseille", year: 2025, amount: 400 },
		]);
	});
});
