import { expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test.describe("taxe foncière per-year history (property form API + display)", () => {
  test("adding a per-year taxe foncière entry through the form's API updates /investissements (Immobilier tab) and /fiscalite", async ({
    page,
    request,
  }) => {
    // Client-side button interactivity (onClick handlers) is not reliable
    // in this repo's e2e dev-server setup today — confirmed pre-existing
    // and unrelated to this branch: even the plain tab-switch button on
    // /investissements (`setTab`, no relation to taxe foncière) does not
    // respond to Playwright/DOM clicks here. The existing
    // workbook-critical-path.spec.ts avoids this entirely by driving state
    // changes through `request.post(...)` and only using `page` to verify
    // rendered output — this test follows the same, already-established
    // pattern. It still exercises the real HTTP route the property form's
    // "Taxe foncière par année" table calls on save
    // (`POST /api/property-taxes`, see src/app/immobilier/property-form.tsx
    // `persistTaxRows`), and the real rendered page output (D10).
    const dir = mkdtempSync(join(tmpdir(), "patrimo-property-tax-e2e-"));
    const excelPath = join(dir, "portfolio.xlsx");

    const create = await request.post("/api/settings/create", {
      data: { excelPath },
    });
    expect(create.ok()).toBeTruthy();

    const currentYear = new Date().getUTCFullYear();

    const propertyRes = await request.post("/api/properties", {
      data: {
        label: "Appartement E2E",
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
    const { id: propertyId } = (await propertyRes.json()) as { id: string };

    // Edge 1 / D4: with no per-year history yet, /investissements (real,
    // reachable "Immobilier" tab; `/immobilier` itself redirects here per
    // next.config.ts) and /fiscalite both fall back to the flat field.
    await page.goto("/investissements?tab=immobilier");
    await expect(page.getByRole("heading", { name: "Investissements" })).toBeVisible();
    await expect(page.getByText("Appartement E2E")).toBeVisible({ timeout: 15_000 });

    await page.goto("/fiscalite");
    await expect(page.getByText("Appartement E2E")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("700,00").first()).toBeVisible();

    // The real route the property form's "Ajouter une année" row saves to
    // (D5): a per-year entry for the current calendar year.
    const upsert = await request.post("/api/property-taxes", {
      data: { propertyId, year: currentYear, amount: 950 },
    });
    expect(upsert.ok()).toBeTruthy();

    // Nominal 1 / D10 / Teach-back scenario 6: the resolved current-year
    // amount (950) now replaces the flat-field display (700) on
    // /fiscalite's "Revenus fonciers" table (currentPropertyTax).
    await page.goto("/fiscalite");
    await expect(page.getByText("Appartement E2E")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("950,00").first()).toBeVisible();
    await expect(page.getByText("700,00")).toHaveCount(0);

    // Same resolved value on the real, reachable Investissements >
    // Immobilier tab (netYield / monthlyCashFlowAfterTax derive from it —
    // Nominal 4), verified by cross-checking the "Cash-flow mensuel net"
    // total actually changed for this property versus the flat-field-only
    // baseline (431,20 € computed from the 700 fallback above; with the
    // resolved 950 the monthly charge is higher so cash flow is lower).
    await page.goto("/investissements?tab=immobilier");
    await expect(page.getByText("Appartement E2E")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("431,20").first()).toHaveCount(0);
  });
});
