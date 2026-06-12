import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap, readDcaConfigs } from "@/lib/store";
import type { DcaConfig } from "@/lib/schema";
import { DcaPlanner } from "./dca-planner";

export const dynamic = "force-dynamic";

const DEFAULT_PEA_CONFIG: DcaConfig = {
  id: "pea",
  label: "PEA — DCA mensuel",
  envelope: "PEA",
  monthlyAmount: 500,
  lines: [
    { label: "Mondes", assetIds: ["WPEA"], targetPct: 0.75 },
    { label: "Émergents", assetIds: ["PLEM"], targetPct: 0.25 },
  ],
};

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

export default async function DcaPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const [priceMap, configs] = await Promise.all([
    readPriceMap(workbook.assets),
    readDcaConfigs(),
  ]);
  const portfolio = buildPortfolio(workbook, priceMap);
  const portfolioByEnvelope = buildPortfolioByEnvelope(portfolio.accounts);

  const peaSeed =
    workbook.assets.some((a) => a.id === "WPEA") &&
    workbook.assets.some((a) => a.id === "PLEM")
      ? DEFAULT_PEA_CONFIG
      : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">DCA Planner</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Saisis un montant mensuel, l&apos;app calcule comment le répartir pour
          rester proche de ta cible (rebalance sans vente).
        </p>
      </header>

      <DcaPlanner
        configs={configs}
        portfolioByEnvelope={portfolioByEnvelope}
        assets={workbook.assets}
        seedConfig={peaSeed}
      />
    </div>
  );
}
