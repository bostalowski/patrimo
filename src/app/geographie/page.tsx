import { Layers } from "lucide-react";
import { DiversificationTargetsEditor } from "@/app/geographie/diversification-targets-editor";
import { AllocationCoherenceCard } from "@/components/allocation-coherence-card";
import { GeographicExposurePanel } from "@/components/geographic-exposure-panel";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap } from "@/lib/store";
import {
	aggregatePortfolioDiversificationBreakdown,
	assessDiversificationCoherence,
} from "@patrimo/core/diversification-coherence";

export const dynamic = "force-dynamic";

export default async function GeographyPage() {
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
  const coherence = assessDiversificationCoherence({
    targets: workbook.diversificationTargets,
    positions: portfolio.assets,
    dca: workbook.dca,
    geographicAllocations: workbook.geographicAllocations,
    assets: workbook.assets,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Layers className="h-6 w-6" />
          Diversification
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cibles min–max et répartition actuelle du portefeuille liquide (géo,
          crypto et non renseigné).
        </p>
      </header>

      <DiversificationTargetsEditor
        initialTargets={workbook.diversificationTargets ?? []}
      />

      <AllocationCoherenceCard coherence={coherence} />

      {breakdown && (
        <GeographicExposurePanel
          title="Répartition actuelle"
          countries={breakdown.countries}
          regions={breakdown.regions}
          crypto={breakdown.crypto}
          unmapped={breakdown.unmapped}
          showMap={false}
        />
      )}
    </div>
  );
}
