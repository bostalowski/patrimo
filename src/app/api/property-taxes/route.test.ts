import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Property, Workbook } from "@/lib/schema";

vi.mock("@/lib/excel", () => ({
	loadWorkbook: vi.fn(),
	replaceWorkbook: vi.fn(),
}));

import * as excel from "@/lib/excel";
import * as propertyTaxRoute from "@/app/api/property-taxes/route";

type PropertyTax = { propertyId: string; year: number; amount: number };

type WorkbookWithPropertyTaxes = Workbook & { propertyTaxes: PropertyTax[] };

const property: Property = {
	id: "lyon",
	label: "Appartement Lyon",
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
};

function workbook(
	propertyTaxes: PropertyTax[] = [
		{ propertyId: "lyon", year: 2025, amount: 950 },
	],
): WorkbookWithPropertyTaxes {
	return {
		transactions: [],
		assets: [],
		accounts: [],
		budget: [],
		properties: [property],
		dca: [],
		manualPrices: [],
		geographicAllocations: [],
		sectorAllocations: [],
		diversificationTargets: [],
		financialGoals: [],
		propertyTaxes,
	};
}

function request(method: "POST" | "DELETE", body: unknown): Request {
	return new Request("http://localhost/api/property-taxes", {
		method,
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("/api/property-taxes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(excel.loadWorkbook).mockReturnValue(workbook());
		vi.mocked(excel.replaceWorkbook).mockReturnValue(undefined);
	});

	it("POST persists a new (property, year) row", async () => {
		const response = await propertyTaxRoute.POST(
			request("POST", { propertyId: "lyon", year: 2026, amount: 960 }),
		);

		expect(response.status).toBe(200);
		expect(excel.replaceWorkbook).toHaveBeenCalledTimes(1);
		expect(excel.replaceWorkbook).toHaveBeenCalledWith({
			...workbook(),
			propertyTaxes: [
				...workbook().propertyTaxes,
				{ propertyId: "lyon", year: 2026, amount: 960 },
			],
		});
	});

	it("POST replaces an existing (property, year) row instead of rejecting the duplicate (D8)", async () => {
		const response = await propertyTaxRoute.POST(
			request("POST", { propertyId: "lyon", year: 2025, amount: 960 }),
		);

		expect(response.status).toBe(200);
		expect(excel.replaceWorkbook).toHaveBeenCalledWith({
			...workbook(),
			propertyTaxes: [{ propertyId: "lyon", year: 2025, amount: 960 }],
		});
	});

	it("POST accepts a future year without rejecting it (D9)", async () => {
		const response = await propertyTaxRoute.POST(
			request("POST", { propertyId: "lyon", year: 2999, amount: 100 }),
		);

		expect(response.status).toBe(200);
	});

	it("POST rejects an unknown property", async () => {
		const response = await propertyTaxRoute.POST(
			request("POST", { propertyId: "unknown", year: 2025, amount: 100 }),
		);

		expect(response.ok).toBe(false);
		expect(excel.replaceWorkbook).not.toHaveBeenCalled();
	});

	it("DELETE removes the workbook entry for (property, year)", async () => {
		const response = await propertyTaxRoute.DELETE(
			request("DELETE", { propertyId: "lyon", year: 2025 }),
		);

		expect(response.status).toBe(200);
		expect(excel.replaceWorkbook).toHaveBeenCalledWith({
			...workbook(),
			propertyTaxes: [],
		});
	});
});
