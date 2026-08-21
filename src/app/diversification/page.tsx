import { Layers } from "lucide-react";
import { DiversificationTargetsEditor } from "@/app/diversification/diversification-targets-editor";
import { AllocationCoherenceCard } from "@/components/allocation-coherence-card";
import { GeographicExposurePanel } from "@/components/geographic-exposure-panel";
import { NextEuroPlanCard } from "@/components/next-euro-plan-card";
import { SectorExposurePanel } from "@/components/sector-exposure-panel";
import { summarizeBudget } from "@/lib/budget";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap } from "@/lib/store";
import {
	aggregatePortfolioDiversificationBreakdown,
	assessDiversificationCoherence,
} from "@patrimo/core/diversification-coherence";
import { buildNextEuroPlan } from "@patrimo/core/next-euro-plan";
import { portfolioByEnvelope } from "@patrimo/core/portfolio";
import { aggregatePortfolioSectorBreakdown } from "@patrimo/core/sector-exposure";

export const dynamic = "force-dynamic";

export default async function DiversificationPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const priceMap = await readPriceMap(workbook.assets);
  const portfolio = buildPortfolio(workbook, priceMap);
  const positions = portfolio.assets.map((position) => ({
    assetId: position.assetId,
    marketValue: position.marketValue,
  }));
  const breakdown = aggregatePortfolioDiversificationBreakdown(
    positions,
    workbook.geographicAllocations ?? [],
    workbook.assets,
  );
  const sectorBreakdown = aggregatePortfolioSectorBreakdown(
    positions,
    workbook.sectorAllocations ?? [],
  );
  const coherence = assessDiversificationCoherence({
    targets: workbook.diversificationTargets,
    positions: portfolio.assets,
    dca: workbook.dca,
    geographicAllocations: workbook.geographicAllocations,
    sectorAllocations: workbook.sectorAllocations ?? [],
    assets: workbook.assets,
  });
  const { depensesMensuelles } = summarizeBudget(workbook.budget);
  const nextEuroPlan = buildNextEuroPlan({
    targets: workbook.diversificationTargets ?? [],
    positions: portfolio.assets,
    dca: workbook.dca,
    geographicAllocations: workbook.geographicAllocations ?? [],
    sectorAllocations: workbook.sectorAllocations ?? [],
    assets: workbook.assets,
    accounts: portfolio.accounts,
    monthlyExpenses: depensesMensuelles,
    portfolioByEnvelope: portfolioByEnvelope(portfolio.accounts),
  });
  const assetLabels = Object.fromEntries(
    workbook.assets.map((a) => [a.id, a.label]),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Layers className="h-6 w-6" />
          Diversification
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cibles min–max et répartition actuelle du portefeuille liquide (géo,
          secteurs et crypto).
        </p>
      </header>

      <DiversificationTargetsEditor
        initialTargets={workbook.diversificationTargets ?? []}
      />

      <AllocationCoherenceCard coherence={coherence} />

      <NextEuroPlanCard
        plan={nextEuroPlan}
        variant="full"
        assetLabels={assetLabels}
      />

      {breakdown && (
        <GeographicExposurePanel
          title="Répartition géographique"
          countries={breakdown.countries}
          regions={breakdown.regions}
          crypto={breakdown.crypto}
          showMap={false}
        />
      )}

      {sectorBreakdown && (
        <SectorExposurePanel
          title="Répartition sectorielle"
          sectors={sectorBreakdown.sectors}
        />
      )}
    </div>
  );
}
