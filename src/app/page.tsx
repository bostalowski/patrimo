import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { loadWorkbook } from "@/lib/excel";
import { getInflationRate, getSyncIntervalMinutes } from "@/lib/config";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { computeNetWorth } from "@patrimo/core/portfolio";
import { aggregateHistory, buildHistorySeries } from "@/lib/portfolio-history";
import { realCostBasis } from "@/lib/inflation";
import {
  readBenchmarks,
  readManualPrices,
  readPriceMap,
  readPrices,
  readSyncMeta,
} from "@/lib/store";
import { BENCHMARKS } from "@/lib/benchmarks";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { PerformanceSection } from "@/components/performance-section";
import { SyncButton } from "@/components/sync-button";
import { formatEuro, formatPercent, signClass } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const [priceMap, priceStore, manualStore, benchmarkStore, syncMeta] =
    await Promise.all([
      readPriceMap(workbook.assets),
      readPrices(),
      readManualPrices(),
      readBenchmarks(),
      readSyncMeta(),
    ]);
  const portfolio = buildPortfolio(workbook, priceMap);
  const history = buildHistorySeries(workbook, priceStore, manualStore);

  const { realEstateEquity, netWorth } = computeNetWorth(portfolio, workbook.properties);

  const inflationRate = getInflationRate();
  const today = new Date().toISOString().slice(0, 10);
  const realInvested = realCostBasis(
    aggregateHistory(history),
    today,
    inflationRate,
  );
  const realUnrealizedPnL = portfolio.totals.marketValue - realInvested;

  const benchmarks = BENCHMARKS.filter((b) => benchmarkStore[b.id]).map((b) => ({
    id: b.id,
    label: b.label,
    history: benchmarkStore[b.id],
  }));

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
        <SyncButton
          lastSync={syncMeta.lastSync}
          intervalMinutes={getSyncIntervalMinutes()}
        />
      </header>

      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${realEstateEquity > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
      >
        <Card>
          <CardHeader>
            <CardTitle>
              {realEstateEquity > 0 ? "Patrimoine net total" : "Valeur totale"}
            </CardTitle>
            <CardValue>{formatEuro(netWorth)}</CardValue>
            {realEstateEquity > 0 && (
              <p className="text-xs text-zinc-500">
                Dont {formatEuro(portfolio.totals.marketValue)} placements +{" "}
                {formatEuro(realEstateEquity)} immobilier
              </p>
            )}
          </CardHeader>
        </Card>
        {realEstateEquity > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Immobilier (équité)</CardTitle>
              <CardValue>{formatEuro(realEstateEquity)}</CardValue>
            </CardHeader>
          </Card>
        )}
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
        <Card>
          <CardHeader>
            <CardTitle>Plus-value réelle (€ d&apos;aujourd&apos;hui)</CardTitle>
            <CardValue className={signClass(realUnrealizedPnL)}>
              {formatEuro(realUnrealizedPnL)}
            </CardValue>
            <p className="text-xs text-zinc-500">
              Coût réévalué {formatEuro(realInvested)} • inflation{" "}
              {formatPercent(inflationRate)}
            </p>
          </CardHeader>
        </Card>
      </div>

      <PerformanceSection history={history} benchmarks={benchmarks} />

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
