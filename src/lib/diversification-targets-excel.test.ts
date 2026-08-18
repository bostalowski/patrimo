import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DiversificationTarget } from "@patrimo/core/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import * as mobileExcel from "../../mobile/lib/excel-mobile";

const configState = vi.hoisted(() => ({ excelPath: null as string | null }));

vi.mock("@/lib/config", () => ({
	getConfiguredExcelPath: () => configState.excelPath,
	resolveUserPath: (path: string) => path,
}));

import * as webExcel from "@/lib/excel";

const TARGET_SHEET = "Cibles diversification";
const LEGACY_SHEET = "Allocation cible";
const TARGET_HEADERS = ["Dimension", "Min %", "Max %"];

let temporaryDirectory: string;

beforeEach(() => {
	temporaryDirectory = mkdtempSync(join(tmpdir(), "patrimo-div-"));
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

function sourceBuffer(options?: {
	targetRows?: unknown[][];
	legacyRows?: unknown[][];
}): ArrayBuffer {
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
		[
			new Date("2026-01-01"),
			"ACHAT",
			"broker",
			null,
			"WPEA",
			10,
			5,
			"EUR",
			0,
			"EUR",
			null,
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
		[
			"WPEA",
			"World ETF",
			"ETF",
			null,
			"WPEA.PA",
			"yahoo",
			"WPEA.PA",
			"EUR",
			null,
		],
		["BTC", "Bitcoin", "CRYPTO", null, null, "coingecko", "bitcoin", "EUR", null],
	]);
	appendSheet(workbook, "Comptes", [
		[
			"ID",
			"Libellé",
			"Type",
			"Enveloppe",
			"Date d'ouverture",
			"Taux",
			"Plafond",
		],
		["broker", "Broker", "BROKER", "CTO", null, null, null],
	]);
	appendSheet(workbook, "Metadata", [
		["Key", "Value"],
		["preserved", "yes"],
	]);
	if (options?.targetRows) {
		appendSheet(workbook, TARGET_SHEET, [TARGET_HEADERS, ...options.targetRows]);
	}
	if (options?.legacyRows) {
		appendSheet(workbook, LEGACY_SHEET, [
			["Catégorie", "Pourcentage cible", "Actifs"],
			...options.legacyRows,
		]);
	}
	return XLSX.write(workbook, {
		type: "array",
		bookType: "xlsx",
		cellDates: true,
	}) as ArrayBuffer;
}

function writeWebSource(buffer: ArrayBuffer): void {
	writeFileSync(configState.excelPath!, Buffer.from(buffer));
}

function readWebSource(): XLSX.WorkBook {
	return XLSX.read(readFileSync(configState.excelPath!), {
		type: "buffer",
		cellDates: true,
	});
}

function sheetRows(
	workbook: XLSX.WorkBook,
	name: string,
): unknown[][] | undefined {
	const sheet = workbook.Sheets[name];
	if (!sheet) return undefined;
	return XLSX.utils.sheet_to_json(sheet, {
		header: 1,
		defval: null,
		raw: true,
	}) as unknown[][];
}

function band(
	key: string,
	minPct: number,
	maxPct: number,
): DiversificationTarget {
	return { key, minPct, maxPct };
}

describe("web and mobile Cibles diversification Excel adapters", () => {
	it("missing Cibles diversification sheet reads as an empty collection", () => {
		writeWebSource(sourceBuffer());

		const webResult = webExcel.loadWorkbook();
		const mobileResult = mobileExcel.parseWorkbook(sourceBuffer());

		expect(webResult.diversificationTargets).toEqual([]);
		expect(mobileResult.workbook.diversificationTargets).toEqual([]);
	});

	it("web Excel round-trips Dimension / Min % / Max %", () => {
		const expected = [band("US", 0.6, 0.7), band("CRYPTO", 0, 0.05)];
		writeWebSource(sourceBuffer());
		const original = webExcel.loadWorkbook();

		webExcel.replaceWorkbook({ ...original, diversificationTargets: expected });
		webExcel.resetWorkbookCache();
		const parsed = webExcel.loadWorkbook();
		const persistedWorkbook = readWebSource();

		expect({
			diversificationTargets: parsed.diversificationTargets,
			metadata: sheetRows(persistedWorkbook, "Metadata"),
			headers: sheetRows(persistedWorkbook, TARGET_SHEET)?.[0],
		}).toEqual({
			diversificationTargets: expected,
			metadata: [
				["Key", "Value"],
				["preserved", "yes"],
			],
			headers: TARGET_HEADERS,
		});
	});

	it("mobile Excel round-trips Dimension / Min % / Max %", () => {
		const expected = [band("EUROPE", 0.1, 0.2), band("CRYPTO", 0, 0.05)];
		const initialBuffer = sourceBuffer();
		const initialWorkbook = mobileExcel.parseWorkbook(initialBuffer);

		const updatedBuffer = mobileExcel.serializeWorkbook(initialBuffer, {
			...initialWorkbook.workbook,
			diversificationTargets: expected,
		});
		const reparsed = mobileExcel.parseWorkbook(updatedBuffer);

		expect(reparsed.workbook.diversificationTargets).toEqual(expected);
	});

	it("parses percent-point values (e.g. 70 stored for 70%)", () => {
		writeWebSource(
			sourceBuffer({
				targetRows: [
					["US", 60, 70],
					["CRYPTO", 0, 5],
				],
			}),
		);

		const result = webExcel.loadWorkbook();

		expect(result.diversificationTargets).toEqual([
			band("US", 0.6, 0.7),
			band("CRYPTO", 0, 0.05),
		]);
	});

	it("parse drops invalid keys and inverted bands", () => {
		writeWebSource(
			sourceBuffer({
				targetRows: [
					["TECH", 10, 20],
					["US", 70, 60],
					["EUROPE", 10, 20],
				],
			}),
		);

		const result = webExcel.loadWorkbook();

		expect(result.diversificationTargets).toEqual([band("EUROPE", 0.1, 0.2)]);
	});

	it("parse keeps the first row and drops a later overlapping key", () => {
		writeWebSource(
			sourceBuffer({
				targetRows: [
					["US", 60, 70],
					["NORTH_AMERICA", 10, 20],
				],
			}),
		);

		const result = webExcel.loadWorkbook();

		expect(result.diversificationTargets).toEqual([band("US", 0.6, 0.7)]);
	});

	it("reading Allocation cible does not populate diversificationTargets", () => {
		writeWebSource(
			sourceBuffer({
				legacyRows: [["Monde", 70, "WPEA"]],
			}),
		);

		const webResult = webExcel.loadWorkbook();
		const mobileResult = mobileExcel.parseWorkbook(
			sourceBuffer({ legacyRows: [["Monde", 70, "WPEA"]] }),
		);

		expect(webResult.diversificationTargets).toEqual([]);
		expect(mobileResult.workbook.diversificationTargets).toEqual([]);
	});

	it("writing the workbook deletes the Allocation cible sheet", () => {
		writeWebSource(
			sourceBuffer({
				legacyRows: [["Monde", 70, "WPEA"]],
			}),
		);
		const original = webExcel.loadWorkbook();
		webExcel.replaceWorkbook(original);
		webExcel.resetWorkbookCache();

		const persisted = readWebSource();
		expect(persisted.SheetNames).not.toContain(LEGACY_SHEET);

		const mobileInitial = sourceBuffer({
			legacyRows: [["Monde", 70, "WPEA"]],
		});
		const parsed = mobileExcel.parseWorkbook(mobileInitial);
		const serialized = mobileExcel.serializeWorkbook(
			mobileInitial,
			parsed.workbook,
		);
		const reparsedBook = XLSX.read(serialized, { type: "array" });
		expect(reparsedBook.SheetNames).not.toContain(LEGACY_SHEET);
	});
});
