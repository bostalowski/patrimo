import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deleteAsset } from "@patrimo/core/deletion";
import type { TargetAllocationCategory } from "@patrimo/core/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import * as mobileExcel from "../../mobile/lib/excel-mobile";

const configState = vi.hoisted(() => ({ excelPath: null as string | null }));

vi.mock("@/lib/config", () => ({
	getConfiguredExcelPath: () => configState.excelPath,
	resolveUserPath: (path: string) => path,
}));

import * as webExcel from "@/lib/excel";

const ALLOC_SHEET = "Allocation cible";
const ALLOC_HEADERS = ["Catégorie", "Pourcentage cible", "Actifs"];

let temporaryDirectory: string;

beforeEach(() => {
	temporaryDirectory = mkdtempSync(join(tmpdir(), "patrimo-alloc-"));
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

function sourceBuffer(
	allocRows?: unknown[][],
	headers: string[] = ALLOC_HEADERS,
): ArrayBuffer {
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
		[
			new Date("2026-01-02"),
			"ACHAT",
			"broker",
			null,
			"BTC",
			0.01,
			90000,
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
		[
			"BTC",
			"Bitcoin",
			"CRYPTO",
			null,
			null,
			"coingecko",
			"bitcoin",
			"EUR",
			null,
		],
		["PLEM", "EM ETF", "ETF", null, "PLEM.PA", "yahoo", "PLEM.PA", "EUR", null],
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
	if (allocRows) {
		appendSheet(workbook, ALLOC_SHEET, [headers, ...allocRows]);
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

function category(
	cat: string,
	targetPct: number,
	assetIds: string[],
): TargetAllocationCategory {
	return { category: cat, targetPct, assetIds };
}

describe("web and mobile Allocation cible Excel adapters", () => {
	it("missing Allocation cible sheet reads as an empty collection", () => {
		writeWebSource(sourceBuffer());

		const webResult = webExcel.loadWorkbook();
		const mobileResult = mobileExcel.parseWorkbook(sourceBuffer());

		expect(webResult.targetAllocations).toEqual([]);
		expect(mobileResult.workbook.targetAllocations).toEqual([]);
	});

	it("Excel parse accepts legacy header Actifs (séparés par virgule)", () => {
		writeWebSource(
			sourceBuffer(
				[
					["Monde", 70, "WPEA"],
					["Crypto", 30, "BTC"],
				],
				["Catégorie", "Pourcentage cible", "Actifs (séparés par virgule)"],
			),
		);

		const result = webExcel.loadWorkbook();

		expect(result.targetAllocations).toEqual([
			category("Monde", 0.7, ["WPEA"]),
			category("Crypto", 0.3, ["BTC"]),
		]);
	});

	it("replaceWorkbook keeps asset ids when sheet had legacy Actifs header", () => {
		writeWebSource(
			sourceBuffer(
				[
					["Monde", 70, null],
					["Crypto", 30, null],
				],
				["Catégorie", "Pourcentage cible", "Actifs (séparés par virgule)"],
			),
		);

		const workbook = webExcel.loadWorkbook();
		webExcel.replaceWorkbook({
			...workbook,
			targetAllocations: [
				category("Monde", 0.7, ["WPEA"]),
				category("Crypto", 0.3, ["BTC"]),
			],
		});
		webExcel.resetWorkbookCache();

		const reloaded = webExcel.loadWorkbook();
		expect(reloaded.targetAllocations).toEqual([
			category("Monde", 0.7, ["WPEA"]),
			category("Crypto", 0.3, ["BTC"]),
		]);

		const sheet = XLSX.read(readFileSync(configState.excelPath!), {
			type: "buffer",
		}).Sheets[ALLOC_SHEET];
		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
			defval: null,
		});
		expect(rows[0]).toMatchObject({
			Catégorie: "Monde",
			Actifs: "WPEA",
		});
		expect(rows[0]["Actifs (séparés par virgule)"]).toBeUndefined();
	});

	it("parses percent-point values (e.g. 70 stored for 70%)", () => {
		writeWebSource(
			sourceBuffer([
				["Monde", 70, "WPEA"],
				["Émergent", 10, "PLEM"],
				["Crypto", 20, "BTC"],
			]),
		);

		const result = webExcel.loadWorkbook();

		expect(result.targetAllocations).toEqual([
			category("Monde", 0.7, ["WPEA"]),
			category("Émergent", 0.1, ["PLEM"]),
			category("Crypto", 0.2, ["BTC"]),
		]);
	});

	it("skips rows with unknown asset ids silently", () => {
		writeWebSource(
			sourceBuffer([
				["Monde", 80, "WPEA,UNKNOWN"],
				["Crypto", 20, "BTC"],
			]),
		);

		const result = webExcel.loadWorkbook();

		expect(result.targetAllocations).toEqual([
			category("Monde", 0.8, ["WPEA"]),
			category("Crypto", 0.2, ["BTC"]),
		]);
	});

	it("drops duplicate categories keeping first occurrence", () => {
		writeWebSource(
			sourceBuffer([
				["Monde", 80, "WPEA"],
				["Monde", 20, "PLEM"],
				["Crypto", 20, "BTC"],
			]),
		);

		const result = webExcel.loadWorkbook();

		const categories = result.targetAllocations.map((c) => c.category);
		expect(categories.filter((c) => c === "Monde")).toHaveLength(1);
	});

	it("web Excel round-trips Allocation cible without changing other sheets", () => {
		const expected = [
			category("Monde", 0.7, ["WPEA"]),
			category("Crypto", 0.1, ["BTC"]),
			category("Émergent", 0.2, ["PLEM"]),
		];
		writeWebSource(sourceBuffer());
		const original = webExcel.loadWorkbook();

		webExcel.replaceWorkbook({ ...original, targetAllocations: expected });
		webExcel.resetWorkbookCache();
		const parsed = webExcel.loadWorkbook();
		const persistedWorkbook = readWebSource();

		expect({
			targetAllocations: parsed.targetAllocations,
			metadata: sheetRows(persistedWorkbook, "Metadata"),
			transactions: parsed.transactions.length,
			headers: sheetRows(persistedWorkbook, ALLOC_SHEET)?.[0],
		}).toEqual({
			targetAllocations: expected,
			metadata: [
				["Key", "Value"],
				["preserved", "yes"],
			],
			transactions: original.transactions.length,
			headers: ALLOC_HEADERS,
		});
	});

	it("mobile round-trips Allocation cible", () => {
		const expected = [
			category("Monde", 0.7, ["WPEA"]),
			category("Crypto", 0.3, ["BTC"]),
		];
		const initialBuffer = sourceBuffer();
		const initialWorkbook = mobileExcel.parseWorkbook(initialBuffer);

		const updatedBuffer = mobileExcel.serializeWorkbook(initialBuffer, {
			...initialWorkbook.workbook,
			targetAllocations: expected,
		});
		const reparsed = mobileExcel.parseWorkbook(updatedBuffer);

		expect(reparsed.workbook.targetAllocations).toEqual(expected);
	});

	it("deletion removes the deleted asset from target category assetIds", () => {
		writeWebSource(
			sourceBuffer([
				["Monde", 70, "WPEA"],
				["Crypto", 30, "BTC"],
			]),
		);
		const original = webExcel.loadWorkbook();
		expect(
			original.targetAllocations.find((c) => c.category === "Monde")?.assetIds,
		).toContain("WPEA");

		const { workbook: after } = deleteAsset(original, "WPEA");

		expect(
			after.targetAllocations.find((c) => c.category === "Monde")?.assetIds,
		).not.toContain("WPEA");
		expect(
			after.targetAllocations.find((c) => c.category === "Crypto")?.assetIds,
		).toContain("BTC");
	});
});
