import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap, readDcaConfigs, readRetirementProfile } from "@/lib/store";
import type { DcaConfig } from "@/lib/schema";
import { InvestissementsClient } from "./investissements-client";

export const dynamic = "force-dynamic";

function buildPortfolioByEnvelope(
  accounts: ReturnType<typeof buildPortfolio>["accounts"],
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const account of accounts) {
    const envelope = account.envelope;
    const bucket = result[envelope] ?? {};
    for (const position of account.positions) {
      bucket[position.assetId] =
        (bucket[position.assetId] ?? 0) + position.marketValue;
    }
    result[envelope] = bucket;
  }
  return result;
}

const DEFAULT_PEA_CONFIG: DcaConfig = {
  id: "pea",
  label: "PEA — DCA mensuel",
  envelope: "PEA",
  amount: 500,
  frequency: "MENSUEL",
  lines: [
    { label: "Mondes", assetIds: ["WPEA"], targetPct: 0.75 },
    { label: "Émergents", assetIds: ["PLEM"], targetPct: 0.25 },
  ],
};

export default async function InvestissementsPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();

  const [priceMap, configs, profile] = await Promise.all([
    readPriceMap(workbook.assets),
    readDcaConfigs(),
    readRetirementProfile(),
  ]);
  const portfolio = buildPortfolio(workbook, priceMap);
  const portfolioByEnvelope = buildPortfolioByEnvelope(portfolio.accounts);

  const peaSeed =
    workbook.assets.some((a) => a.id === "WPEA") &&
    workbook.assets.some((a) => a.id === "PLEM")
      ? DEFAULT_PEA_CONFIG
      : null;

  const priceMapRecord: Record<string, number> = Object.fromEntries(priceMap);

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Investissements
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Configure tes plans DCA, exécute tes ordres avec le calculateur live,
          gère ton profil retraite et tes biens immobiliers.
        </p>
      </header>

      <InvestissementsClient
        configs={configs}
        portfolioByEnvelope={portfolioByEnvelope}
        assets={workbook.assets}
        seedConfig={peaSeed}
        priceMap={priceMapRecord}
        initialProfile={{
          birthDate: profile.birthDate?.toISOString().slice(0, 10),
          targetRetirementAge: profile.targetRetirementAge,
          estimatedPublicPension: profile.estimatedPublicPension,
        }}
        properties={workbook.properties.map((p) => ({
          ...p,
          dateAcquisition: p.dateAcquisition?.toISOString(),
          dateDebutCredit: p.dateDebutCredit?.toISOString(),
        }))}
      />
    </div>
  );
}
