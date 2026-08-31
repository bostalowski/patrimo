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
	"Vivre sur le capital",
	"Taux capitalisation",
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
			["g1", "Retraite", "RETIREMENT_INCOME", 3000, 58, null, "Oui", "Non", 0.03, "notes"],
			[
				"g2",
				"Capital",
				"CAPITAL_AT_DATE",
				200000,
				null,
				new Date("2035-06-15"),
				"Non",
				null,
				null,
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
			drawOnCapital: false,
			capitalisationRate: 0.03,
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
				targetDate: new Date("2045-01-01T00:00:00.000Z"),
				inflationIncluded: false,
				drawOnCapital: true,
				capitalisationRate: 0.04,
				publicPensionLink: "NONE",
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
				targetDate: expect.any(Date),
				inflationIncluded: false,
				drawOnCapital: true,
				capitalisationRate: 0.04,
			},
		]);
	});

	it("RETIREMENT_INCOME write clears Âge cible cell (date only)", () => {
		writeFileSync(configState.excelPath!, Buffer.from(sourceBuffer()));

		webExcel.replaceWorkbook({
			...webExcel.loadWorkbook(),
			financialGoals: [
				{
					id: "g1",
					label: "Retraite",
					type: "RETIREMENT_INCOME",
					targetAmount: 3000,
					targetAge: 64,
					targetDate: new Date("2045-06-15T00:00:00.000Z"),
					inflationIncluded: true,
					drawOnCapital: false,
					capitalisationRate: 0.03,
					publicPensionLink: "NONE",
				},
			],
		});

		const sheet = XLSX.readFile(configState.excelPath!, {
			cellDates: true,
		}).Sheets[GOALS_SHEET];
		const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
			defval: null,
		});
		expect(rows[0]["Âge cible"]).toBeNull();
		expect(rows[0]["Date cible"]).toBeInstanceOf(Date);
		expect(webExcel.loadWorkbook().financialGoals[0].targetAge).toBeUndefined();
	});

	it("legacy sheet without mode/rate columns defaults to Non + 3%", () => {
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
				"Inflation comprise",
				"Notes",
			],
			["g1", "Retraite", "RETIREMENT_INCOME", 3000, 64, null, "Oui", null],
		]);
		const buffer = XLSX.write(workbook, {
			type: "array",
			bookType: "xlsx",
			cellDates: true,
		}) as ArrayBuffer;
		writeFileSync(configState.excelPath!, Buffer.from(buffer));

		const webGoal = webExcel.loadWorkbook().financialGoals[0];
		const mobileGoal =
			mobileExcel.parseWorkbook(buffer).workbook.financialGoals[0];
		expect(webGoal).toMatchObject({
			drawOnCapital: false,
			capitalisationRate: 0.03,
		});
		expect(mobileGoal).toMatchObject({
			drawOnCapital: false,
			capitalisationRate: 0.03,
		});
	});
});
