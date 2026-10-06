import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	FOYER_FISCAL_HEADERS,
	SHEET_FOYER_FISCAL,
} from "@patrimo/core/workbook-template";
import * as mobileExcel from "../../mobile/lib/excel-mobile";

const configState = vi.hoisted(() => ({ excelPath: null as string | null }));

vi.mock("@/lib/config", () => ({
	getConfiguredExcelPath: () => configState.excelPath,
	resolveUserPath: (path: string) => path,
}));

import * as webExcel from "@/lib/excel";

let temporaryDirectory: string;

beforeEach(() => {
	temporaryDirectory = mkdtempSync(join(tmpdir(), "patrimo-foyer-io-"));
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

function minimalWorkbook(withFoyer: boolean): XLSX.WorkBook {
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
	if (withFoyer) {
		appendSheet(workbook, SHEET_FOYER_FISCAL, [
			[...FOYER_FISCAL_HEADERS],
			["MANUAL", 2500, "NET_IMPOSABLE", 1],
		]);
	}
	return workbook;
}

describe("Foyer fiscal workbook I/O (N5, E4)", () => {
	it("N5: web round-trips foyer config via replaceWorkbook", () => {
		const path = configState.excelPath!;
		writeFileSync(
			path,
			XLSX.write(minimalWorkbook(false), { type: "buffer", bookType: "xlsx" }),
		);
		webExcel.resetWorkbookCache();

		const loaded = webExcel.loadWorkbook();
		expect(loaded.foyerFiscalConfig).toBeUndefined();

		webExcel.replaceWorkbook({
			...loaded,
			foyerFiscalConfig: {
				incomeSource: "MANUAL",
				manualAmount: 2500,
				manualBasis: "NET_IMPOSABLE",
				parts: 1.5,
			},
		});
		webExcel.resetWorkbookCache();

		const again = webExcel.loadWorkbook();
		expect(again.foyerFiscalConfig).toEqual({
			incomeSource: "MANUAL",
			manualAmount: 2500,
			manualBasis: "NET_IMPOSABLE",
			parts: 1.5,
		});
	});

	it("E4: absent Foyer fiscal sheet → not configured (undefined)", () => {
		const path = configState.excelPath!;
		writeFileSync(
			path,
			XLSX.write(minimalWorkbook(false), { type: "buffer", bookType: "xlsx" }),
		);
		webExcel.resetWorkbookCache();
		expect(webExcel.loadWorkbook().foyerFiscalConfig).toBeUndefined();
	});

	it("N5: mobile parses and rewrite-unchanged preserves Foyer fiscal sheet", () => {
		const bytes = XLSX.write(minimalWorkbook(true), {
			type: "array",
			bookType: "xlsx",
		}) as ArrayBuffer;

		const parsed = mobileExcel.parseWorkbook(bytes);
		expect(parsed.workbook.foyerFiscalConfig).toEqual({
			incomeSource: "MANUAL",
			manualAmount: 2500,
			manualBasis: "NET_IMPOSABLE",
			parts: 1,
		});

		const rewritten = mobileExcel.serializeWorkbook(bytes, parsed.workbook);
		const again = mobileExcel.parseWorkbook(rewritten);
		expect(again.workbook.foyerFiscalConfig).toEqual(
			parsed.workbook.foyerFiscalConfig,
		);
	});
});
