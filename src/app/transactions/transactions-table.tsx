"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { SortableTH } from "@/components/ui/sortable-th";
import { useSortedRows, type SortDirection } from "@/lib/use-sorted";
import {
  cn,
  formatDate,
  formatEuro,
  formatFee,
  formatQuantity,
  signClass,
} from "@/lib/utils";
import type { TransactionType } from "@/lib/schema";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import type { Option, TxAccountOption } from "./transaction-form";

type BadgeVariant = "default" | "success" | "danger" | "warning" | "info";

const typeVariants: Record<TransactionType, BadgeVariant> = {
  ACHAT: "success",
  VENTE: "danger",
  DIVIDENDE: "info",
  INTERET: "info",
  TRANSFERT: "warning",
  DEPOT: "default",
  RETRAIT: "warning",
};

const variantActiveClasses: Record<BadgeVariant, string> = {
  default:
    "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100",
  success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  danger:
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200",
};

const ALL_TYPES: TransactionType[] = [
  "ACHAT",
  "VENTE",
  "DIVIDENDE",
  "INTERET",
  "TRANSFERT",
  "DEPOT",
  "RETRAIT",
];

export type TransactionRow = {
  id: string;
  row: number;
  date: Date;
  type: TransactionType;
  compte: string;
  compteLabel: string;
  compteDestination: string | null;
  compteDestinationLabel: string | null;
  actif: string;
  actifLabel: string;
  quantite: number;
  prixUnitaire: number | null;
  montant: number | null;
  devise: string;
  frais: number;
  fraisDevise: string;
  notes: string | null;
};

export type AccountOption = {
  id: string;
  label: string;
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

const chipBaseClasses =
  "inline-flex select-none items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors";

const chipInactiveClasses =
  "border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100";

export function TransactionsTable({
  rows,
  accounts,
  allAccounts,
  allAssets,
}: {
  rows: TransactionRow[];
  accounts: AccountOption[];
  allAccounts: TxAccountOption[];
  allAssets: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedTypes, setSelectedTypes] = useState<Set<TransactionType>>(
    new Set(),
  );
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(
    new Set(),
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingRow, setEditingRow] = useState<TransactionRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<TransactionRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function confirmDelete() {
    if (!deletingRow) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/transactions", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ row: deletingRow.row }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Échec de la suppression");
      }
      setDeletingRow(null);
      refresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleteBusy(false);
    }
  }

  const toggleType = (type: TransactionType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setSelectedTypes(new Set());
    setSelectedAccounts(new Set());
    setDateFrom("");
    setDateTo("");
  };

  const filteredRows = useMemo(() => {
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null;

    return rows.filter((row) => {
      if (selectedTypes.size > 0 && !selectedTypes.has(row.type)) return false;
      if (selectedAccounts.size > 0 && !selectedAccounts.has(row.compte))
        return false;
      if (fromDate && row.date < fromDate) return false;
      if (toDate && row.date > toDate) return false;
      return true;
    });
  }, [rows, selectedTypes, selectedAccounts, dateFrom, dateTo]);

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
    filteredRows,
    accessors,
    { key: "date", direction: "desc" },
  );

  const handleSort = (key: SortKey) => toggle(key, defaultDirections[key]);

  const hasActiveFilters =
    selectedTypes.size > 0 ||
    selectedAccounts.size > 0 ||
    dateFrom !== "" ||
    dateTo !== "";

  return (
    <div className={cn(pending && "pointer-events-none opacity-60")}>
      <div className="space-y-4 border-b border-zinc-200 px-6 pb-4 dark:border-zinc-800">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span className="mt-0.5 shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Types
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ALL_TYPES.map((type) => {
              const active = selectedTypes.has(type);
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  aria-pressed={active}
                  className={cn(
                    chipBaseClasses,
                    active
                      ? variantActiveClasses[typeVariants[type]]
                      : chipInactiveClasses,
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <span className="mt-0.5 shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Comptes
          </span>
          <div className="flex flex-wrap gap-1.5">
            {accounts.map((account) => {
              const active = selectedAccounts.has(account.id);
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => toggleAccount(account.id)}
                  aria-pressed={active}
                  className={cn(
                    chipBaseClasses,
                    active
                      ? variantActiveClasses.default
                      : chipInactiveClasses,
                  )}
                >
                  {account.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Période
          </span>
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span>Du</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span>Au</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-mono text-xs text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
            />
          </label>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {filteredRows.length} / {rows.length} mouvements
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <X className="h-3 w-3" aria-hidden />
                Réinitialiser
              </button>
            )}
          </div>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <SortableTH label="Date" columnKey="date" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
            <SortableTH label="Type" columnKey="type" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
            <SortableTH label="Compte" columnKey="compte" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
            <SortableTH label="Actif" columnKey="actif" activeKey={sort.key} direction={sort.direction} onSort={handleSort} />
            <SortableTH label="Quantité" columnKey="quantite" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
            <SortableTH label="Prix unitaire" columnKey="prixUnitaire" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
            <SortableTH label="Montant (hors frais)" columnKey="montant" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
            <SortableTH label="Frais" columnKey="frais" activeKey={sort.key} direction={sort.direction} onSort={handleSort} align="right" />
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {sorted.length === 0 ? (
            <TR>
              <TD className="px-6 py-8 text-center text-sm text-zinc-500" colSpan={9}>
                Aucune transaction ne correspond aux filtres.
              </TD>
            </TR>
          ) : (
            sorted.map((tx) => (
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
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingRow(tx)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      aria-label="Modifier la transaction"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeletingRow(tx);
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      aria-label="Supprimer la transaction"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      {editingRow && (
        <EditTransactionDialog
          row={editingRow}
          accounts={allAccounts}
          assets={allAssets}
          onClose={() => setEditingRow(null)}
          onSaved={() => {
            setEditingRow(null);
            refresh();
          }}
        />
      )}

      {deletingRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !deleteBusy) setDeletingRow(null);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Supprimer la transaction ?
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {formatDate(deletingRow.date)} · {deletingRow.type} ·{" "}
              {deletingRow.actifLabel} · {deletingRow.compteLabel}. Cette action
              est irréversible et modifie l&apos;Excel source.
            </p>

            {deleteError && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingRow(null)}
                disabled={deleteBusy}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
              >
                {deleteBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
