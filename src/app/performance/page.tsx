import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildHistorySeries } from "@/lib/portfolio-history";
import { readBenchmarks, readManualPrices, readPrices } from "@/lib/store";
import { BENCHMARKS } from "@/lib/benchmarks";
import { PerformanceSection } from "@/components/performance-section";
import { SyncButton } from "@/components/sync-button";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const [priceStore, manualStore, benchmarkStore] = await Promise.all([
    readPrices(),
    readManualPrices(),
    readBenchmarks(),
  ]);
  const history = buildHistorySeries(workbook, priceStore, manualStore);

  const benchmarks = BENCHMARKS.filter((b) => benchmarkStore[b.id]).map((b) => ({
    id: b.id,
    label: b.label,
    history: benchmarkStore[b.id],
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Rendement, risque et comparaison aux indices de référence.
          </p>
        </div>
        <SyncButton />
      </header>

      <PerformanceSection history={history} benchmarks={benchmarks} />
    </div>
  );
}
