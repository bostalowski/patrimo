import { expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capturePrScreenshot } from "./pr-screenshot";

test.describe("transaction form currencies", () => {
  test("Devise and Frais devise offer BTC on a new transaction", async ({
    page,
    request,
  }) => {
    const dir = mkdtempSync(join(tmpdir(), "patrimo-tx-currency-e2e-"));
    const create = await request.post("/api/settings/create", {
      data: { excelPath: join(dir, "portfolio.xlsx") },
    });
    expect(create.ok()).toBeTruthy();

    for (const label of ["Ledger E2E", "Kraken E2E"]) {
      const res = await request.post("/api/accounts", {
        data: { label, type: "BROKER", envelope: "CTO" },
      });
      expect(res.ok()).toBeTruthy();
    }

    await page.goto("/transactions", { waitUntil: "networkidle" });
    const field = (name: string) =>
      page
        .locator("div.flex-col", {
          has: page.locator("span", { hasText: new RegExp(`^${name}$`, "i") }),
        })
        .locator("select")
        .first();
    const open = page.getByRole("button", { name: "Nouvelle transaction" });
    await expect(open).toBeVisible({ timeout: 15_000 });
    await expect(async () => {
      await open.click();
      await expect(field("Devise")).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });

    for (const name of ["Devise", "Frais devise"]) {
      await expect(field(name).locator("option", { hasText: "BTC" })).toHaveCount(1);
    }
    await field("Devise").selectOption("BTC");
    await capturePrScreenshot(page, "fix-transfer-btc-currency", "formulaire-devise-btc");
  });
});
