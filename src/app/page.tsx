import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { buildHistorySeries } from "@/lib/portfolio-history";
import {
  readBenchmarks,
  readManualPrices,
  readPriceMap,
  readPrices,
} from "@/lib/store";
import { BENCHMARKS } from "@/lib/benchmarks";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { PerformanceSection } from "@/components/performance-section";
import { SyncButton } from "@/components/sync-button";
import { formatEuro, signClass } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const [priceMap, priceStore, manualStore, benchmarkStore] = await Promise.all([
    readPriceMap(workbook.assets),
    readPrices(),
    readManualPrices(),
    readBenchmarks(),
  ]);
  const portfolio = buildPortfolio(workbook, priceMap);
  const history = buildHistorySeries(workbook, priceStore, manualStore);

  const wpea = BENCHMARKS.find((b) => b.id === "WPEA");
  const benchmark =
    wpea && benchmarkStore[wpea.id]
      ? { label: wpea.label, history: benchmarkStore[wpea.id] }
      : undefined;

  const donut = portfolio.assets
    .filter((p) => p.marketValue > 0)
    .map((p) => ({ name: p.asset?.label ?? p.assetId, value: p.marketValue }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {workbook.transactions.length} transactions • {portfolio.assets.length}{" "}
            actifs en portefeuille.
          </p>
        </div>
        <SyncButton />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Valeur totale</CardTitle>
            <CardValue>{formatEuro(portfolio.totals.marketValue)}</CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Capital investi (net)</CardTitle>
            <CardValue>{formatEuro(portfolio.totals.netInvested)}</CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>P&amp;L latente</CardTitle>
            <CardValue className={signClass(portfolio.totals.unrealizedPnL)}>
              {formatEuro(portfolio.totals.unrealizedPnL)}
            </CardValue>
          </CardHeader>
        </Card>
      </div>

      <PerformanceSection history={history} benchmark={benchmark} />

      <Card>
        <CardHeader>
          <CardTitle>Répartition actuelle</CardTitle>
        </CardHeader>
        <CardBody>
          <AllocationDonut data={donut} />
        </CardBody>
      </Card>
    </div>
  );
}
