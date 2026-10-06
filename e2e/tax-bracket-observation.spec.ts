import { expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capturePrScreenshot } from "./pr-screenshot";

test.describe("indicative household IR observation", () => {
	test("saving foyer via API shows the same pack on Fiscalité and Budget", async ({
		page,
		request,
	}) => {
		const dir = mkdtempSync(join(tmpdir(), "patrimo-foyer-e2e-"));
		const excelPath = join(dir, "portfolio.xlsx");

		const create = await request.post("/api/settings/create", {
			data: { excelPath },
		});
		expect(create.ok()).toBeTruthy();

		await page.goto("/fiscalite");
		await expect(page.getByRole("button", { name: /Enregistrer/i })).toBeVisible();
		await capturePrScreenshot(page, "tax-bracket-observation", "fiscalite-empty-cta");

		const put = await request.put("/api/foyer-fiscal", {
			data: {
				incomeSource: "MANUAL",
				manualAmount: 2500,
				manualBasis: "NET_IMPOSABLE",
				parts: 1,
			},
		});
		expect(put.ok()).toBeTruthy();

		await page.goto("/fiscalite");
		await expect(page.getByText(/7,0/).first()).toBeVisible();
		await expect(page.getByText(/Barème revenus 2025/i).first()).toBeVisible();
		await capturePrScreenshot(page, "tax-bracket-observation", "fiscalite-configured");

		await page.goto("/budget");
		await expect(page.getByText(/Tranche d'imposition/)).toBeVisible();
		await expect(page.getByText(/7,0/).first()).toBeVisible();
		await expect(page.getByRole("link", { name: /Fiscalité/i }).first()).toBeVisible();
		await capturePrScreenshot(page, "tax-bracket-observation", "budget-card");
	});
});
