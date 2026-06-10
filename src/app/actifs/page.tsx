import Link from "next/link";
import { loadWorkbook } from "@/lib/excel";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap } from "@/lib/store";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatEuro, formatPercent, formatQuantity, signClass } from "@/lib/utils";

export default async function ActifsPage() {
  const workbook = loadWorkbook();
  const prices = await readPriceMap(workbook.assets);
  const portfolio = buildPortfolio(workbook, prices);

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
          <Table>
            <THead>
              <TR>
                <TH>Actif</TH>
                <TH>Type</TH>
                <TH className="text-right">Quantité</TH>
                <TH className="text-right">PRU</TH>
                <TH className="text-right">Cours actuel</TH>
                <TH className="text-right">Valeur</TH>
                <TH className="text-right">P&amp;L latente</TH>
                <TH className="text-right">%</TH>
              </TR>
            </THead>
            <TBody>
              {portfolio.assets.map((p) => (
                <TR key={p.assetId}>
                  <TD>
                    <Link
                      href={`/actifs/${encodeURIComponent(p.assetId)}`}
                      className="font-medium hover:underline"
                    >
                      {p.asset?.label ?? p.assetId}
                    </Link>
                    <div className="text-xs text-zinc-500">{p.assetId}</div>
                  </TD>
                  <TD>
                    <Badge variant="default">{p.asset?.type ?? "—"}</Badge>
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {formatQuantity(p.quantity)}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {p.quantity > 0 ? formatEuro(p.pru, true) : "—"}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {p.currentPrice !== null
                      ? formatEuro(p.currentPrice, true)
                      : "—"}
                  </TD>
                  <TD className="text-right font-mono text-sm">
                    {p.currentPrice !== null ? formatEuro(p.marketValue) : "—"}
                  </TD>
                  <TD
                    className={`text-right font-mono text-sm ${signClass(p.unrealizedPnL)}`}
                  >
                    {p.currentPrice !== null
                      ? formatEuro(p.unrealizedPnL)
                      : "—"}
                  </TD>
                  <TD className={`text-right font-mono text-xs ${signClass(p.unrealizedPnL)}`}>
                    {p.currentPrice !== null && p.costBasis > 0
                      ? formatPercent(p.unrealizedPnL / p.costBasis)
                      : "—"}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
