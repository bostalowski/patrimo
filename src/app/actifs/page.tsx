import { loadWorkbook } from "@/lib/excel";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";
import { ActifsTable, type ActifRow } from "./actifs-table";

export default async function ActifsPage() {
  const workbook = loadWorkbook();
  const prices = await readPriceMap(workbook.assets);
  const portfolio = buildPortfolio(workbook, prices);

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
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Actifs</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {portfolio.assets.length} actifs en portefeuille — valorisation totale{" "}
          {formatEuro(portfolio.totals.marketValue)}.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Positions consolidées</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <ActifsTable rows={rows} />
        </CardBody>
      </Card>
    </div>
  );
}
