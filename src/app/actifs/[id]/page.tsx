import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AssetPriceCurve } from "@/components/charts/asset-price-curve";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { getAssetSourceUrl, getSourceLabel } from "@/lib/prices/source-url";
import { readManualPrices, readPriceMap, readPrices } from "@/lib/store";
import {
  formatDate,
  formatEuro,
  formatFee,
  formatPercent,
  formatQuantity,
  signClass,
} from "@/lib/utils";

const typeVariants = {
  ACHAT: "success",
  VENTE: "danger",
  DIVIDENDE: "info",
  INTERET: "info",
  TRANSFERT: "warning",
  DEPOT: "default",
  RETRAIT: "warning",
} as const;

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireExcelConfigured();
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const workbook = loadWorkbook();
  const asset = workbook.assets.find((a) => a.id === decodedId);
  if (!asset) notFound();

  const [priceMap, priceStore, manualStore] = await Promise.all([
    readPriceMap(workbook.assets),
    readPrices(),
    readManualPrices(),
  ]);
  const portfolio = buildPortfolio(workbook, priceMap);
  const position = portfolio.assets.find((p) => p.assetId === decodedId);

  const txs = workbook.transactions
    .filter((t) => t.actif === decodedId)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const history =
    asset.source === "manual" ? manualStore[decodedId] : priceStore[decodedId];
  const curveData = history
    ? Object.entries(history)
        .map(([date, price]) => ({ date, price }))
        .sort((a, b) => (a.date < b.date ? -1 : 1))
    : [];

  const sourceUrl = getAssetSourceUrl(asset);

  return (
    <div className="space-y-6">
      <Link
        href="/actifs"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux actifs
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{asset.label}</h1>
          <Badge variant="default">{asset.type}</Badge>
          <Badge variant="info">{asset.source}</Badge>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline dark:text-sky-400"
            >
              Voir sur {getSourceLabel(asset.source)}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          ID <code>{asset.id}</code>
          {asset.isin && <> • ISIN {asset.isin}</>}
          {asset.ticker && <> • Ticker {asset.ticker}</>}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Quantité</CardTitle>
            <CardValue>{formatQuantity(position?.quantity ?? 0)}</CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>PRU</CardTitle>
            <CardValue>{formatEuro(position?.pru ?? 0, true)}</CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valeur actuelle</CardTitle>
            <CardValue>
              {position?.currentPrice !== null && position
                ? formatEuro(position.marketValue)
                : "—"}
            </CardValue>
            {position?.currentPrice !== null && (
              <p className="text-xs text-zinc-500">
                Cours {formatEuro(position?.currentPrice ?? 0, true)}
              </p>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>P&amp;L latente</CardTitle>
            <CardValue className={signClass(position?.unrealizedPnL ?? 0)}>
              {position?.currentPrice !== null && position
                ? formatEuro(position.unrealizedPnL)
                : "—"}
            </CardValue>
            {position && position.costBasis > 0 && position.currentPrice !== null && (
              <p className={`text-xs ${signClass(position.unrealizedPnL)}`}>
                {formatPercent(position.unrealizedPnL / position.costBasis)}
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cours vs PRU</CardTitle>
        </CardHeader>
        <CardBody>
          <AssetPriceCurve data={curveData} pru={position?.pru ?? 0} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions ({txs.length})</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Type</TH>
                <TH>Compte</TH>
                <TH className="text-right">Quantité</TH>
                <TH className="text-right">Prix</TH>
                <TH className="text-right">Frais</TH>
              </TR>
            </THead>
            <TBody>
              {txs.map((tx, i) => (
                <TR key={i}>
                  <TD className="whitespace-nowrap font-mono text-xs text-zinc-500">
                    {formatDate(tx.date)}
                  </TD>
                  <TD>
                    <Badge variant={typeVariants[tx.type]}>{tx.type}</Badge>
                  </TD>
                  <TD>{tx.compte}</TD>
                  <TD className="text-right font-mono text-xs">
                    {formatQuantity(tx.quantite)}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {tx.prixUnitaire !== null
                      ? formatEuro(tx.prixUnitaire, true)
                      : "—"}
                  </TD>
                  <TD className="text-right font-mono text-xs text-zinc-500">
                    {formatFee(tx.frais, tx.fraisDevise)}
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
