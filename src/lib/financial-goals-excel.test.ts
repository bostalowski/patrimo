import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FinancialGoal } from "@patrimo/core/schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import * as mobileExcel from "../../mobile/lib/excel-mobile";

const configState = vi.hoisted(() => ({ excelPath: null as string | null }));

vi.mock("@/lib/config", () => ({
	getConfiguredExcelPath: () => configState.excelPath,
	resolveUserPath: (path: string) => path,
}));

import * as webExcel from "@/lib/excel";

const GOALS_SHEET = "Objectifs";
const GOALS_HEADERS = [
	"ID",
	"Libellé",
	"Type",
	"Montant cible",
	"Âge cible",
	"Date cible",
	"Inflation comprise",
	"Notes",
];

let temporaryDirectory: string;

beforeEach(() => {
	temporaryDirectory = mkdtempSync(join(tmpdir(), "patrimo-goals-"));
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

function sourceBuffer(goalRows?: unknown[][]): ArrayBuffer {
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
		[
			"ID",
			"Libellé",
			"Type",
			"Enveloppe",
			"Date d'ouverture",
			"Taux",
			"Plafond",
		],
	]);
	if (goalRows) {
		appendSheet(workbook, GOALS_SHEET, [GOALS_HEADERS, ...goalRows]);
	}
	return XLSX.write(workbook, {
		type: "array",
		bookType: "xlsx",
		cellDates: true,
	}) as ArrayBuffer;
}

describe("Objectifs excel round-trip", () => {
	it("missing sheet yields empty financialGoals", () => {
		const buffer = sourceBuffer();
		writeFileSync(configState.excelPath!, Buffer.from(buffer));

		expect(webExcel.loadWorkbook().financialGoals).toEqual([]);
		expect(mobileExcel.parseWorkbook(buffer).workbook.financialGoals).toEqual(
			[],
		);
	});

	it("web and mobile parse the same goals", () => {
		const buffer = sourceBuffer([
			["g1", "Retraite", "RETIREMENT_INCOME", 3000, 58, null, "Oui", "notes"],
			[
				"g2",
				"Capital",
				"CAPITAL_AT_DATE",
				200000,
				null,
				new Date("2035-06-15"),
				"Non",
				null,
			],
		]);
		writeFileSync(configState.excelPath!, Buffer.from(buffer));

		const webGoals = webExcel.loadWorkbook().financialGoals;
		const mobileGoals =
			mobileExcel.parseWorkbook(buffer).workbook.financialGoals;

		expect(webGoals).toHaveLength(2);
		expect(mobileGoals).toHaveLength(2);
		expect(webGoals[0]).toMatchObject({
			id: "g1",
			type: "RETIREMENT_INCOME",
			targetAmount: 3000,
			targetAge: 58,
			inflationIncluded: true,
		});
		expect(webGoals[1].type).toBe("CAPITAL_AT_DATE");
		expect(webGoals[1].targetAmount).toBe(200000);
		expect(webGoals[1].targetDate).toBeInstanceOf(Date);
		expect(webGoals[1].inflationIncluded).toBe(false);
		expect(mobileGoals[1].inflationIncluded).toBe(false);
	});

	it("missing Inflation comprise defaults to Oui (true)", () => {
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
			[
				"ID",
				"Libellé",
				"Type",
				"Enveloppe",
				"Date d'ouverture",
				"Taux",
				"Plafond",
			],
		]);
		appendSheet(workbook, GOALS_SHEET, [
			[
				"ID",
				"Libellé",
				"Type",
				"Montant cible",
				"Âge cible",
				"Date cible",
				"Notes",
			],
			["g1", "Capital", "CAPITAL_AT_DATE", 100000, null, new Date("2035-01-01"), null],
		]);
		const buffer = XLSX.write(workbook, {
			type: "array",
			bookType: "xlsx",
			cellDates: true,
		}) as ArrayBuffer;
		writeFileSync(configState.excelPath!, Buffer.from(buffer));

		expect(webExcel.loadWorkbook().financialGoals[0].inflationIncluded).toBe(
			true,
		);
		expect(
			mobileExcel.parseWorkbook(buffer).workbook.financialGoals[0]
				.inflationIncluded,
		).toBe(true);
	});

	it("replaceWorkbook writes Objectifs and reloads", () => {
		writeFileSync(configState.excelPath!, Buffer.from(sourceBuffer()));

		const goals: FinancialGoal[] = [
			{
				id: "g1",
				label: "Retraite",
				type: "RETIREMENT_INCOME",
				targetAmount: 2500,
				targetAge: 60,
				inflationIncluded: false,
			},
		];

		webExcel.replaceWorkbook({
			...webExcel.loadWorkbook(),
			financialGoals: goals,
		});
		webExcel.resetWorkbookCache();

		expect(webExcel.loadWorkbook().financialGoals).toMatchObject([
			{
				id: "g1",
				label: "Retraite",
				type: "RETIREMENT_INCOME",
				targetAmount: 2500,
				targetAge: 60,
				inflationIncluded: false,
			},
		]);
	});
});
