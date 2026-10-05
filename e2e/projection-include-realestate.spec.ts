import { expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capturePrScreenshot } from "./pr-screenshot";

test.describe("projection include real estate toggle", () => {
	test("default-on includes locative equity and rents on /projection", async ({
		page,
		request,
	}) => {
		const dir = mkdtempSync(join(tmpdir(), "patrimo-proj-re-"));
		const excelPath = join(dir, "portfolio.xlsx");

		const create = await request.post("/api/settings/create", {
			data: { excelPath },
		});
		expect(create.ok()).toBeTruthy();

		const account = await request.post("/api/accounts", {
			data: {
				label: "Livret E2E",
				type: "BANQUE",
				envelope: "LIVRET",
			},
		});
		expect(account.ok()).toBeTruthy();

		const propertyRes = await request.post("/api/properties", {
			data: {
				label: "Appartement Projection E2E",
				detention: "SCI",
				regime: "IR_REEL",
				partDetenue: 1,
				prixAchat: 200000,
				fraisNotaire: 0,
				travaux: 0,
				valeurActuelle: 250000,
				revaloAnnuelle: 0.02,
				montantEmprunte: 150000,
				tauxCredit: 0.035,
				dureeMois: 240,
				tauxAssurance: 0.003,
				loyerMensuelHC: 900,
				chargesNonRecupAnnuelles: 300,
				taxeFonciere: 700,
				vacancePct: 0,
				fraisGestionPct: 0,
				tmiAssocie: 0.3,
				partAmortissable: 0.85,
				dureeAmortissement: 30,
			},
		});
		expect(propertyRes.ok()).toBeTruthy();

		const retirement = await request.post("/api/retirement-profile", {
			data: {
				scenarios: {
					LEGAL_AGE: {
						startDate: "2036-01-01",
						grossMonthly: 2000,
					},
				},
				activeScenario: "LEGAL_AGE",
			},
		});
		expect(retirement.ok()).toBeTruthy();

		await page.goto("/projection");
		await expect(page.getByRole("heading", { name: "Projection" })).toBeVisible({
			timeout: 15_000,
		});
		const box = page.getByRole("checkbox", { name: /inclure l.immobilier/i });
		await expect(box).toBeVisible();
		await expect(box).toBeChecked();
		await expect(page.getByText(/loyers nets/i).first()).toBeVisible({
			timeout: 15_000,
		});
		await expect(page.getByText(/capital projeté/i).first()).toBeVisible();
		await capturePrScreenshot(
			page,
			"feat-projection-include-realestate",
			"projection-include-realestate-feature",
		);
	});
});
