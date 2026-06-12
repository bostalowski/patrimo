import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";
import { AssetType, PriceSource } from "@/lib/schema";
import { ActifsTable, type ActifRow } from "./actifs-table";
import { AssetForm } from "./asset-form";

export const dynamic = "force-dynamic";

const INCOME_ASSET = "INTERETS";

export default async function ActifsPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const prices = await readPriceMap(workbook.assets);
  const portfolio = buildPortfolio(workbook, prices);

  const assetMap = new Map(workbook.assets.map((a) => [a.id, a]));
  const portfolioIds = new Set(portfolio.assets.map((p) => p.assetId));

  const rows: ActifRow[] = portfolio.assets.map((p) => ({
    assetId: p.assetId,
    label: p.asset?.label ?? p.assetId,
    type: p.asset?.type ?? "—",
    quantity: p.quantity,
    pru: p.pru,
    currentPrice: p.currentPrice,
    marketValue: p.currentPrice !== null ? p.marketValue : null,
    unrealizedPnL: p.currentPrice !== null ? p.unrealizedPnL : null,
    unrealizedPnLPct:
      p.currentPrice !== null && p.costBasis > 0
        ? p.unrealizedPnL / p.costBasis
        : null,
    asset: p.asset,
  }));

  for (const asset of workbook.assets) {
    if (asset.id === INCOME_ASSET) continue;
    if (portfolioIds.has(asset.id)) continue;
    rows.push({
      assetId: asset.id,
      label: asset.label,
      type: asset.type,
      quantity: 0,
      pru: 0,
      currentPrice: prices.get(asset.id) ?? null,
      marketValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPct: null,
      asset,
    });
  }

  for (const row of rows) {
    if (!row.asset) row.asset = assetMap.get(row.assetId);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Actifs</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {portfolio.assets.length} actifs en portefeuille — valorisation totale{" "}
          {formatEuro(portfolio.totals.marketValue)}.
        </p>
      </header>

      <AssetForm
        assetTypes={AssetType.options}
        priceSources={PriceSource.options}
      />

      <Card>
        <CardHeader>
          <CardTitle>Positions consolidées</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <ActifsTable
            rows={rows}
            assetTypes={AssetType.options}
            priceSources={PriceSource.options}
          />
        </CardBody>
      </Card>
    </div>
  );
}
