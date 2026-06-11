"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, THead, TR } from "@/components/ui/table";
import { SortableTH } from "@/components/ui/sortable-th";
import { useSortedRows, type SortDirection } from "@/lib/use-sorted";
import {
  formatDate,
  formatEuro,
  formatFee,
  formatQuantity,
  signClass,
} from "@/lib/utils";
import type { TransactionType } from "@/lib/schema";

const typeVariants: Record<TransactionType, "default" | "success" | "danger" | "warning" | "info"> = {
  ACHAT: "success",
  VENTE: "danger",
  DIVIDENDE: "info",
  INTERET: "info",
  TRANSFERT: "warning",
  DEPOT: "default",
  RETRAIT: "warning",
};

export type TransactionRow = {
  id: string;
  date: Date;
  type: TransactionType;
  compte: string;
  compteLabel: string;
  compteDestinationLabel: string | null;
  actif: string;
  actifLabel: string;
  quantite: number;
  prixUnitaire: number | null;
  montant: number | null;
  frais: number;
  fraisDevise: string;
};

type SortKey =
  | "date"
  | "type"
  | "compte"
  | "actif"
  | "quantite"
  | "prixUnitaire"
  | "montant"
  | "frais";

const defaultDirections: Record<SortKey, SortDirection> = {
  date: "desc",
  type: "asc",
  compte: "asc",
  actif: "asc",
  quantite: "desc",
  prixUnitaire: "desc",
  montant: "desc",
  frais: "desc",
};

export function TransactionsTable({ rows }: { rows: TransactionRow[] }) {
  const accessors = useMemo(
    () => ({
      date: (r: TransactionRow) => r.date,
      type: (r: TransactionRow) => r.type,
      compte: (r: TransactionRow) => r.compteLabel,
      actif: (r: TransactionRow) => r.actifLabel,
      quantite: (r: TransactionRow) => r.quantite,
      prixUnitaire: (r: TransactionRow) => r.prixUnitaire,
      montant: (r: TransactionRow) => r.montant,
      frais: (r: TransactionRow) => r.frais,
    }),
    [],
  );

  const { sorted, sort, toggle } = useSortedRows<TransactionRow, SortKey>(
    rows,
    accessors,
    { key: "date", direction: "desc" },
  );

  const handleSort = (key: SortKey) => toggle(key, defaultDirections[key]);

  return (
    <Table>
      <THead>
        <TR>
          <SortableTH label="Date" columnKey="date" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
          <SortableTH label="Type" columnKey="type" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
          <SortableTH label="Compte" columnKey="compte" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
          <SortableTH label="Actif" columnKey="actif" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
          <SortableTH label="Quantité" columnKey="quantite" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <SortableTH label="Prix unitaire" columnKey="prixUnitaire" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <SortableTH label="Montant" columnKey="montant" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
          <SortableTH label="Frais" columnKey="frais" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
        </TR>
      </THead>
      <TBody>
        {sorted.map((tx) => (
          <TR key={tx.id}>
            <TD className="whitespace-nowrap font-mono text-xs text-zinc-500">
              {formatDate(tx.date)}
            </TD>
            <TD>
              <Badge variant={typeVariants[tx.type]}>{tx.type}</Badge>
            </TD>
            <TD className="text-zinc-600 dark:text-zinc-400">
              {tx.compteLabel}
              {tx.compteDestinationLabel && (
                <span className="text-zinc-400">
                  {" → "}
                  {tx.compteDestinationLabel}
                </span>
              )}
            </TD>
            <TD className="font-medium">{tx.actifLabel}</TD>
            <TD className="text-right font-mono text-xs">
              {formatQuantity(tx.quantite)}
            </TD>
            <TD className="text-right font-mono text-xs">
              {tx.prixUnitaire !== null ? formatEuro(tx.prixUnitaire, true) : "—"}
            </TD>
            <TD className={`text-right font-mono text-xs ${signClass(tx.montant ?? 0)}`}>
              {tx.montant !== null ? formatEuro(tx.montant) : "—"}
            </TD>
            <TD className="text-right font-mono text-xs text-zinc-500">
              {formatFee(tx.frais, tx.fraisDevise)}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
