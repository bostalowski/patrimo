import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ASSURANCE_EMPRUNT_HEADERS,
	IMMOBILIER_HEADERS,
	SHEET_ASSURANCE_EMPRUNT,
	SHEET_IMMOBILIER,
} from "@patrimo/core/workbook-template";
import type { Property } from "@patrimo/core/schema";
import * as mobileExcel from "../../mobile/lib/excel-mobile";

const configState = vi.hoisted(() => ({ excelPath: null as string | null }));

vi.mock("@/lib/config", () => ({
	getConfiguredExcelPath: () => configState.excelPath,
	resolveUserPath: (path: string) => path,
}));

import * as webExcel from "@/lib/excel";

let temporaryDirectory: string;

beforeEach(() => {
	temporaryDirectory = mkdtempSync(join(tmpdir(), "patrimo-insurance-io-"));
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

function minimalSheets(extras?: {
	immobilierRows?: unknown[][];
	assuranceRows?: unknown[][];
	omitAssuranceSheet?: boolean;
}): XLSX.WorkBook {
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
	appendSheet(workbook, "Budget", [
		["ID", "Libellé", "Montant", "Fréquence", "Catégorie", "Notes"],
	]);

	const immobilierHeader = [...IMMOBILIER_HEADERS];
	const immobilierRows = extras?.immobilierRows ?? [
		immobilierHeader,
		[
			"loc1",
			"Locatif",
			"DIRECT",
			"IR_REEL",
			1,
			new Date("2026-01-01T00:00:00.000Z"),
			250_000,
			20_000,
			0,
			250_000,
			0.02,
			200_000,
			0.035,
			240,
			new Date("2026-01-01T00:00:00.000Z"),
			0.003,
			"CAPITAL_INITIAL",
			0,
			1_200,
			1_000,
			1_200,
			0,
			0.07,
			0.3,
			0.85,
			30,
			null,
		],
	];
	appendSheet(workbook, SHEET_IMMOBILIER, immobilierRows);

	if (!extras?.omitAssuranceSheet) {
		appendSheet(
			workbook,
			SHEET_ASSURANCE_EMPRUNT,
			extras?.assuranceRows ?? [
				[...ASSURANCE_EMPRUNT_HEADERS],
				["loc1", 1, 40],
				["loc1", 10, 55],
				["other", 1, 999],
			],
		);
	}

	appendSheet(workbook, "DCA", [
		[
			"ID",
			"Libellé",
			"Compte",
			"Montant",
			"Fréquence",
			"Jour",
			"Mois paiement",
			"Date début",
			"Date fin",
			"Notes",
			"Lignes",
		],
	]);
	appendSheet(workbook, "Prix manuels", [["Actif", "Date", "Prix"]]);
	appendSheet(workbook, "Exposition geo", [
		["Actif", "Pays", "Poids", "Source"],
	]);
	appendSheet(workbook, "Exposition secteur", [
		["Actif", "Secteur", "Poids", "Source"],
	]);
	appendSheet(workbook, "Cibles diversification", [
		["Clé", "Min", "Cible", "Max"],
	]);
	appendSheet(workbook, "Objectifs", [
		[
			"ID",
			"Libellé",
			"Type",
			"Montant cible",
			"Date cible",
			"Inflation incluse",
			"Notes",
		],
	]);
	appendSheet(workbook, "Fonds urgence", [
		["Mois cible", "Montant override", "Horizon rattrapage (mois)"],
	]);
	return workbook;
}

function writeSource(wb: XLSX.WorkBook): ArrayBuffer {
	const buffer = XLSX.write(wb, {
		type: "buffer",
		bookType: "xlsx",
		cellDates: true,
	}) as Buffer;
	writeFileSync(configState.excelPath!, buffer);
	const copy = new Uint8Array(buffer.byteLength);
	copy.set(buffer);
	return copy.buffer;
}

describe("loan insurance workbook I/O (N7 N8 E10 E11)", () => {
	it("web parses modeAssurance, assuranceMensuelle, and Assurance emprunt paliers", () => {
		writeSource(minimalSheets());
		const workbook = webExcel.loadWorkbook();
		const property = workbook.properties.find((p) => p.id === "loc1");
		expect(property?.modeAssurance).toBe("CAPITAL_INITIAL");
		expect(property?.assuranceMensuelle).toBe(0);
		expect(workbook.loanInsurancePaliers).toEqual([
			{ propertyId: "loc1", anneeDebut: 1, assuranceMensuelle: 40 },
			{ propertyId: "loc1", anneeDebut: 10, assuranceMensuelle: 55 },
			{ propertyId: "other", anneeDebut: 1, assuranceMensuelle: 999 },
		]);
		expect(property?.assurancePaliers).toEqual([
			{ anneeDebut: 1, assuranceMensuelle: 40 },
			{ anneeDebut: 10, assuranceMensuelle: 55 },
		]);
	});

	it("mobile parses the same columns and Assurance emprunt sheet", () => {
		const buffer = writeSource(minimalSheets());
		const { workbook } = mobileExcel.parseWorkbook(buffer);
		const property = workbook.properties.find((p) => p.id === "loc1");
		expect(property?.modeAssurance).toBe("CAPITAL_INITIAL");
		expect(workbook.loanInsurancePaliers).toEqual([
			{ propertyId: "loc1", anneeDebut: 1, assuranceMensuelle: 40 },
			{ propertyId: "loc1", anneeDebut: 10, assuranceMensuelle: 55 },
			{ propertyId: "other", anneeDebut: 1, assuranceMensuelle: 999 },
		]);
		expect(property?.assurancePaliers).toEqual([
			{ anneeDebut: 1, assuranceMensuelle: 40 },
			{ anneeDebut: 10, assuranceMensuelle: 55 },
		]);
	});

	it("missing Assurance emprunt sheet yields empty paliers (E10)", () => {
		writeSource(minimalSheets({ omitAssuranceSheet: true }));
		const workbook = webExcel.loadWorkbook();
		expect(workbook.loanInsurancePaliers ?? []).toEqual([]);
		expect(
			workbook.properties.find((p) => p.id === "loc1")?.assurancePaliers,
		).toEqual([]);
	});

	it("legacy Immobilier without Mode assurance defaults to CRD (E11)", () => {
		const headers = IMMOBILIER_HEADERS.filter((h) => h !== "Mode assurance");
		const row = [
			"legacy",
			"Legacy",
			"DIRECT",
			"IR_REEL",
			1,
			new Date("2026-01-01T00:00:00.000Z"),
			250_000,
			20_000,
			0,
			250_000,
			0.02,
			200_000,
			0.035,
			240,
			new Date("2026-01-01T00:00:00.000Z"),
			0.003,
			// no Mode assurance column — Assurance mensuelle still present after Taux
			0,
			1_200,
			1_000,
			1_200,
			0,
			0.07,
			0.3,
			0.85,
			30,
			null,
		];
		// Build a header/row without Mode assurance: drop that column from a full row
		const full = minimalSheets().Sheets[SHEET_IMMOBILIER];
		void full;
		const wb = minimalSheets({
			immobilierRows: [
				[
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
				],
				[
					"legacy",
					"Legacy",
					"DIRECT",
					"IR_REEL",
					1,
					new Date("2026-01-01T00:00:00.000Z"),
					250_000,
					20_000,
					0,
					250_000,
					0.02,
					200_000,
					0.035,
					240,
					new Date("2026-01-01T00:00:00.000Z"),
					0.003,
					1_200,
					1_000,
					1_200,
					0,
					0.07,
					0.3,
					0.85,
					30,
					null,
				],
			],
			omitAssuranceSheet: true,
		});
		writeSource(wb);
		const property = webExcel.loadWorkbook().properties[0];
		expect(property.modeAssurance).toBe("CRD");
		expect(property.assuranceMensuelle).toBe(0);
		void headers;
		void row;
	});

	it("web upsert round-trips mode, montant fixe, and paliers (N7)", () => {
		writeSource(minimalSheets({ omitAssuranceSheet: true }));
		const property: Property = {
			id: "loc1",
			label: "Locatif",
			detention: "DIRECT",
			regime: "IR_REEL",
			partDetenue: 1,
			dateAcquisition: new Date("2026-01-01T00:00:00.000Z"),
			prixAchat: 250_000,
			fraisNotaire: 20_000,
			travaux: 0,
			valeurActuelle: 250_000,
			revaloAnnuelle: 0.02,
			montantEmprunte: 200_000,
			tauxCredit: 0.035,
			dureeMois: 240,
			dateDebutCredit: new Date("2026-01-01T00:00:00.000Z"),
			tauxAssurance: 0.003,
			modeAssurance: "MONTANT_FIXE",
			assuranceMensuelle: 42,
			assurancePaliers: [
				{ anneeDebut: 1, assuranceMensuelle: 40 },
				{ anneeDebut: 8, assuranceMensuelle: 60 },
			],
			loyerMensuelHC: 1_200,
			chargesNonRecupAnnuelles: 1_000,
			taxeFonciere: 1_200,
			vacancePct: 0,
			fraisGestionPct: 0.07,
			tmiAssocie: 0.3,
			partAmortissable: 0.85,
			dureeAmortissement: 30,
		};
		webExcel.upsertProperty(property);
		webExcel.resetWorkbookCache();
		const reloaded = webExcel.loadWorkbook();
		const saved = reloaded.properties.find((p) => p.id === "loc1");
		expect(saved?.modeAssurance).toBe("MONTANT_FIXE");
		expect(saved?.assuranceMensuelle).toBe(42);
		expect(saved?.assurancePaliers).toEqual([
			{ anneeDebut: 1, assuranceMensuelle: 40 },
			{ anneeDebut: 8, assuranceMensuelle: 60 },
		]);
		expect(reloaded.loanInsurancePaliers).toEqual([
			{ propertyId: "loc1", anneeDebut: 1, assuranceMensuelle: 40 },
			{ propertyId: "loc1", anneeDebut: 8, assuranceMensuelle: 60 },
		]);
	});

	it("rejects invalid palier rows (anneeDebut < 1 or amount ≤ 0)", () => {
		writeSource(
			minimalSheets({
				assuranceRows: [
					[...ASSURANCE_EMPRUNT_HEADERS],
					["loc1", 0, 40],
					["loc1", 1, 0],
					["loc1", 2, -5],
					["loc1", 3, 50],
				],
			}),
		);
		const workbook = webExcel.loadWorkbook();
		expect(workbook.loanInsurancePaliers).toEqual([
			{ propertyId: "loc1", anneeDebut: 3, assuranceMensuelle: 50 },
		]);
	});

	it("last duplicate Bien+Année début wins", () => {
		writeSource(
			minimalSheets({
				assuranceRows: [
					[...ASSURANCE_EMPRUNT_HEADERS],
					["loc1", 1, 40],
					["loc1", 1, 45],
				],
			}),
		);
		expect(webExcel.loadWorkbook().loanInsurancePaliers).toEqual([
			{ propertyId: "loc1", anneeDebut: 1, assuranceMensuelle: 45 },
		]);
	});
});
