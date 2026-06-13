"use client";

import { useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TransactionFields,
  validateTxValue,
  type Option,
  type TxAccountOption,
  type TxFormValue,
} from "./transaction-form";
import type { TransactionRow } from "./transactions-table";

function numberToInput(value: number | null): string {
  return value === null ? "" : String(value);
}

function rowToTxValue(row: TransactionRow): TxFormValue {
  return {
    date: row.date.toISOString().slice(0, 10),
    type: row.type,
    compte: row.compte,
    compteDestination: row.compteDestination ?? "",
    actif: row.actif,
    quantite: numberToInput(row.quantite),
    prixUnitaire: numberToInput(row.prixUnitaire),
    devise: row.devise,
    frais: numberToInput(row.frais),
    fraisDevise: row.fraisDevise,
    notes: row.notes ?? "",
  };
}

export function EditTransactionDialog({
  row,
  accounts,
  assets,
  onClose,
  onSaved,
}: {
  row: TransactionRow;
  accounts: TxAccountOption[];
  assets: Option[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState<TxFormValue>(() => rowToTxValue(row));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(next: Partial<TxFormValue>) {
    setValue((prev) => ({ ...prev, ...next }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const result = validateTxValue(value);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ row: row.row, transaction: result.payload }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Échec de la modification");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Modifier la transaction
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-6">
          <TransactionFields
            value={value}
            onChange={patch}
            accounts={accounts}
            assets={assets}
          />

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50",
              )}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
