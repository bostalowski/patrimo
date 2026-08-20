import { expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.describe("workbook critical path", () => {
  test("create workbook, add account, dashboard loads", async ({ page, request }) => {
    const dir = mkdtempSync(join(tmpdir(), "patrimo-wb-"));
    const excelPath = join(dir, "portfolio.xlsx");

    const create = await request.post("/api/settings/create", {
      data: { excelPath },
    });
    expect(create.ok()).toBeTruthy();
    const created = await create.json();
    expect(created.valid).toBe(true);

    const account = await request.post("/api/accounts", {
      data: {
        label: "CTO E2E",
        type: "BROKER",
        envelope: "CTO",
      },
    });
    expect(account.ok()).toBeTruthy();
    const accountBody = await account.json();
    expect(accountBody.ok).toBe(true);
    expect(accountBody.id).toBeTruthy();

    await page.goto("/");
    await expect(page).not.toHaveURL(/reglages/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({
      timeout: 15_000,
    });

    await page.goto("/comptes");
    await expect(page.getByRole("heading", { name: "Comptes" })).toBeVisible();
    await expect(page.getByText("CTO E2E")).toBeVisible({ timeout: 15_000 });
  });

  test("settings page is reachable without workbook", async ({ page }) => {
    await page.goto("/reglages");
    await expect(page.getByRole("heading", { name: /réglages/i })).toBeVisible();
  });
});
