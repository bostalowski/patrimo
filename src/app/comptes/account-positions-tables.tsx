import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { AccountAssetPosition } from "@/lib/portfolio";
import {
  formatEuro,
  formatQuantity,
  signClass,
} from "@/lib/utils";
import { UNASSIGNED_CASH_ASSET_ID } from "@patrimo/core/deletion";

function AssetName({ position }: { position: AccountAssetPosition }) {
  const label = position.asset?.label ?? position.assetId;
  if (position.assetId === UNASSIGNED_CASH_ASSET_ID) {
    return <span className="font-medium">{label}</span>;
  }

  return (
    <Link
      href={`/actifs/${encodeURIComponent(position.assetId)}`}
      className="font-medium hover:underline"
    >
      {label}
    </Link>
  );
}

export function ActiveAccountPositionsTable({
  positions,
}: {
  positions: AccountAssetPosition[];
}) {
  return (
    <Table>
      <THead>
        <TR>
          <TH>Actif</TH>
          <TH className="text-right">Quantité</TH>
          <TH className="text-right">PRU</TH>
          <TH className="text-right">Investi</TH>
          <TH className="text-right">Valeur</TH>
          <TH className="text-right">P&amp;L</TH>
        </TR>
      </THead>
      <TBody>
        {positions.map((p) => (
          <TR key={p.assetId}>
            <TD>
              <AssetName position={p} />
            </TD>
            <TD className="text-right font-mono text-xs">
              {formatQuantity(p.quantity)}
            </TD>
            <TD className="text-right font-mono text-xs">
              {formatEuro(p.pru, true)}
            </TD>
            <TD className="text-right font-mono text-xs">
              {formatEuro(p.costBasis)}
            </TD>
            <TD className="text-right font-mono text-xs">
              {p.currentPrice !== null ? formatEuro(p.marketValue) : "—"}
            </TD>
            <TD
              className={`text-right font-mono text-xs ${signClass(p.unrealizedPnL)}`}
            >
              {p.currentPrice !== null ? formatEuro(p.unrealizedPnL) : "—"}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function ClosedAccountPositions({
  positions,
}: {
  positions: AccountAssetPosition[];
}) {
  const total = positions.reduce(
    (s, p) => s + p.realizedPnL + p.realizedIncome,
    0,
  );
  const count = positions.length;
  return (
    <details className="group border-t border-zinc-200 dark:border-zinc-800">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-3 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        <span className="inline-flex items-center gap-1.5">
          <ChevronRight
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden
          />
          {count} position{count > 1 ? "s" : ""} clôturée
          {count > 1 ? "s" : ""}
        </span>
        <span className={`font-mono text-xs ${signClass(total)}`}>
          {total >= 0 ? "+" : ""}
          {formatEuro(total)}
        </span>
      </summary>
      <Table>
        <THead>
          <TR>
            <TH>Actif</TH>
            <TH className="text-right">Plus-value</TH>
            <TH className="text-right">Revenus</TH>
            <TH className="text-right">Total réalisé</TH>
          </TR>
        </THead>
        <TBody>
          {positions.map((p) => {
            const totalReturn = p.realizedPnL + p.realizedIncome;
            return (
              <TR key={p.assetId}>
                <TD>
                  <AssetName position={p} />
                </TD>
                <TD
                  className={`text-right font-mono text-xs ${signClass(p.realizedPnL)}`}
                >
                  {p.realizedPnL >= 0 ? "+" : ""}
                  {formatEuro(p.realizedPnL)}
                </TD>
                <TD className="text-right font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {p.realizedIncome > 0
                    ? `+ ${formatEuro(p.realizedIncome)}`
                    : "—"}
                </TD>
                <TD
                  className={`text-right font-mono text-xs ${signClass(totalReturn)}`}
                >
                  {totalReturn >= 0 ? "+" : ""}
                  {formatEuro(totalReturn)}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </details>
  );
}
