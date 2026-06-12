"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SortableTH } from "@/components/ui/sortable-th";
import { useSortedRows, type SortDirection } from "@/lib/use-sorted";
import {
  formatEuro,
  formatPercent,
  formatQuantity,
  signClass,
} from "@/lib/utils";
import type { Asset, AssetType, PriceSource } from "@/lib/schema";
import { AssetForm } from "./asset-form";

export type ActifRow = {
  assetId: string;
  label: string;
  type: string;
  quantity: number;
  pru: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnL: number | null;
  unrealizedPnLPct: number | null;
  asset?: Asset;
};

type SortKey =
  | "label"
  | "type"
  | "quantity"
  | "pru"
  | "currentPrice"
  | "marketValue"
  | "unrealizedPnL"
  | "unrealizedPnLPct";

const defaultDirections: Record<SortKey, SortDirection> = {
  label: "asc",
  type: "asc",
  quantity: "desc",
  pru: "desc",
  currentPrice: "desc",
  marketValue: "desc",
  unrealizedPnL: "desc",
  unrealizedPnLPct: "desc",
};

export function ActifsTable({
  rows,
  assetTypes,
  priceSources,
}: {
  rows: ActifRow[];
  assetTypes: readonly AssetType[];
  priceSources: readonly PriceSource[];
}) {
  const accessors = useMemo(
    () => ({
      label: (r: ActifRow) => r.label,
      type: (r: ActifRow) => r.type,
      quantity: (r: ActifRow) => r.quantity,
      pru: (r: ActifRow) => (r.quantity > 0 ? r.pru : null),
      currentPrice: (r: ActifRow) => r.currentPrice,
      marketValue: (r: ActifRow) => r.marketValue,
      unrealizedPnL: (r: ActifRow) => r.unrealizedPnL,
      unrealizedPnLPct: (r: ActifRow) => r.unrealizedPnLPct,
    }),
    [],
  );

  const { sorted, sort, toggle } = useSortedRows<ActifRow, SortKey>(
    rows,
    accessors,
    { key: "marketValue", direction: "desc" },
  );

  const handleSort = (key: SortKey) => toggle(key, defaultDirections[key]);

  return (
    <Table>
      <THead>
        <TR>
          <SortableTH label="Actif" columnKey="label" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
          <SortableTH label="Type" columnKey="type" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
          <SortableTH label="Quantité" columnKey="quantity" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <SortableTH label="PRU" columnKey="pru" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <SortableTH label="Cours actuel" columnKey="currentPrice" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <SortableTH label="Valeur" columnKey="marketValue" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <SortableTH label="P&L latente" columnKey="unrealizedPnL" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <SortableTH label="%" columnKey="unrealizedPnLPct" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <TH className="w-10" />
        </TR>
      </THead>
      <TBody>
        {sorted.map((p) => (
          <TR key={p.assetId}>
            <TD>
              <Link
                href={`/actifs/${encodeURIComponent(p.assetId)}`}
                className="font-medium hover:underline"
              >
                {p.label}
              </Link>
              <div className="text-xs text-zinc-500">{p.assetId}</div>
            </TD>
            <TD>
              <Badge variant="default">{p.type}</Badge>
            </TD>
            <TD className="text-right font-mono text-xs">
              {formatQuantity(p.quantity)}
            </TD>
            <TD className="text-right font-mono text-xs">
              {p.quantity > 0 ? formatEuro(p.pru, true) : "—"}
            </TD>
            <TD className="text-right font-mono text-xs">
              {p.currentPrice !== null ? formatEuro(p.currentPrice, true) : "—"}
            </TD>
            <TD className="text-right font-mono text-sm">
              {p.marketValue !== null ? formatEuro(p.marketValue) : "—"}
            </TD>
            <TD className={`text-right font-mono text-sm ${signClass(p.unrealizedPnL ?? 0)}`}>
              {p.unrealizedPnL !== null ? formatEuro(p.unrealizedPnL) : "—"}
            </TD>
            <TD className={`text-right font-mono text-xs ${signClass(p.unrealizedPnL ?? 0)}`}>
              {p.unrealizedPnLPct !== null ? formatPercent(p.unrealizedPnLPct) : "—"}
            </TD>
            <TD className="text-right">
              {p.asset && (
                <AssetForm
                  assetTypes={assetTypes}
                  priceSources={priceSources}
                  asset={p.asset}
                  trigger="icon"
                />
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
