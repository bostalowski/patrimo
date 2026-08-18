import { Globe } from "lucide-react";
import { DiversificationTargetsEditor } from "@/app/geographie/diversification-targets-editor";
import { GeographicExposurePanel } from "@/components/geographic-exposure-panel";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap } from "@/lib/store";
import { aggregateGeographicExposure } from "@patrimo/core/geographic-exposure";

export const dynamic = "force-dynamic";

export default async function GeographyPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const priceMap = await readPriceMap(workbook.assets);
  const portfolio = buildPortfolio(workbook, priceMap);
  const exposure = aggregateGeographicExposure(
    portfolio.assets.map((position) => ({
      assetId: position.assetId,
      marketValue: position.marketValue,
    })),
    workbook.geographicAllocations ?? [],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Globe className="h-6 w-6" />
          Géographie
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Répartition géographique des actifs couverts (pondérée par valeur de
          marché).
        </p>
      </header>

      <DiversificationTargetsEditor
        initialTargets={workbook.diversificationTargets ?? []}
      />

      <GeographicExposurePanel
        title="Répartition géographique"
        countries={exposure.countries}
        regions={exposure.regions}
      />
    </div>
  );
}
