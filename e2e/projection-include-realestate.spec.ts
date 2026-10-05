import { expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capturePrScreenshot } from "./pr-screenshot";

test.describe("projection include real estate toggle", () => {
	test("checkbox is on by default on /projection", async ({ page, request }) => {
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

		await page.goto("/projection");
		await expect(page.getByRole("heading", { name: "Projection" })).toBeVisible({
			timeout: 15_000,
		});
		const box = page.getByRole("checkbox", { name: /inclure l.immobilier/i });
		await expect(box).toBeVisible();
		await expect(box).toBeChecked();
		await capturePrScreenshot(
			page,
			"feat-projection-include-realestate",
			"projection-include-realestate-default-on",
		);
	});
});
