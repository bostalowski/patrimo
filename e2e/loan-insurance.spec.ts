import { expect, test } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capturePrScreenshot } from "./pr-screenshot";

test.describe("loan insurance modes (property form API + Immobilier UI)", () => {
  test("MONTANT_FIXE + Assurance emprunt paliers surface the rule label on Investissements", async ({
    page,
    request,
  }) => {
    // Same pattern as property-tax.spec.ts: drive writes via request.post,
    // assert rendered output with page. Client onClick (Nouveau bien modal,
    // Projection tab switch) is unreliable in this e2e setup — those UI
    // shots stay as committed PNGs under docs/agent/branches/.../ui/; this
    // spec locks the persisted rule label on the Immobilier list (SSR via
    // ?tab=immobilier).
    const dir = mkdtempSync(join(tmpdir(), "patrimo-loan-insurance-e2e-"));
    const excelPath = join(dir, "portfolio.xlsx");

    const create = await request.post("/api/settings/create", {
      data: { excelPath },
    });
    expect(create.ok()).toBeTruthy();

    const propertyRes = await request.post("/api/properties", {
      data: {
        label: "Studio E2E assurance",
        detention: "SCI",
        regime: "IR_REEL",
        partDetenue: 1,
        dateAcquisition: "2022-01-15",
        prixAchat: 180000,
        fraisNotaire: 12000,
        travaux: 0,
        valeurActuelle: 190000,
        revaloAnnuelle: 0.01,
        montantEmprunte: 160000,
        tauxCredit: 0.035,
        dureeMois: 240,
        dateDebutCredit: "2022-02-01",
        tauxAssurance: 0.0034,
        modeAssurance: "MONTANT_FIXE",
        assuranceMensuelle: 42,
        assurancePaliers: [
          { anneeDebut: 1, assuranceMensuelle: 40 },
          { anneeDebut: 10, assuranceMensuelle: 55 },
        ],
        loyerMensuelHC: 850,
        chargesNonRecupAnnuelles: 400,
        taxeFonciere: 900,
        vacancePct: 0.05,
        fraisGestionPct: 0.07,
        tmiAssocie: 0.3,
        partAmortissable: 0.85,
        dureeAmortissement: 30,
      },
    });
    expect(propertyRes.ok()).toBeTruthy();

    await page.goto("/investissements?tab=immobilier");
    await expect(
      page.getByRole("heading", { name: "Investissements" }),
    ).toBeVisible();
    await expect(page.getByText("Studio E2E assurance")).toBeVisible({
      timeout: 15_000,
    });
    // Paliers override the mode label (loanInsuranceRuleLabelFr).
    await expect(
      page.getByText("calendrier de paliers (feuille Assurance emprunt)"),
    ).toBeVisible();
    await capturePrScreenshot(
      page,
      "loan-insurance",
      "investissements-regle-assurance",
    );
  });
});
