"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Asset } from "@/lib/schema";
import { cn, formatDate, formatEuro } from "@/lib/utils";

type Entry = { assetId: string; date: string; price: number };

export function ManualPriceForm({
  assets,
  entries,
}: {
  assets: Asset[];
  entries: Entry[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const numericPrice = Number(price.replace(",", "."));
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Prix invalide");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/prices/manual", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, date, price: numericPrice }),
      });
      if (!res.ok) throw new Error(await res.text());
      setPrice("");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: Entry) {
    setBusy(true);
    try {
      const res = await fetch("/api/prices/manual", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId: entry.assetId, date: entry.date }),
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const isLoading = busy || pending;
  const assetLabels = new Map(assets.map((a) => [a.id, a.label]));

  return (
    <div className="space-y-6">
      <form
        onSubmit={submit}
        className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px_auto]"
      >
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        >
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
        <input
          type="text"
          inputMode="decimal"
          placeholder="VL en €"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={isLoading || !assetId || !price}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Ajouter
        </button>
      </form>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucune VL saisie pour le moment.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {entries.map((entry) => (
            <li
              key={`${entry.assetId}-${entry.date}`}
              className="flex items-center justify-between py-2 text-sm"
            >
              <div>
                <span className="font-medium">
                  {assetLabels.get(entry.assetId) ?? entry.assetId}
                </span>
                <span className="ml-2 text-zinc-500">{formatDate(entry.date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono tabular-nums">
                  {formatEuro(entry.price, true)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(entry)}
                  disabled={isLoading}
                  className="rounded-md p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
