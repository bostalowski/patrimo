"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { Asset } from "@/lib/schema";
import { getAssetSourceUrl } from "@/lib/prices/source-url";
import { cn, formatDate, formatEuro } from "@/lib/utils";

type Entry = { date: string; price: number };

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

export function ManualPriceInput({
  asset,
  entries,
}: {
  asset: Asset;
  entries: Entry[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [date, setDate] = useState(today);
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const isLoading = busy || pending;
  const sourceUrl = getAssetSourceUrl(asset);

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
        body: JSON.stringify({ assetId: asset.id, date, price: numericPrice }),
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
        body: JSON.stringify({ assetId: asset.id, date: entry.date }),
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Saisir un prix</CardTitle>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voir la VL
            </a>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        <form
          onSubmit={submit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_140px_auto]"
        >
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className={inputClasses}
          />
          <input
            type="text"
            inputMode="decimal"
            placeholder="VL en €"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClasses}
          />
          <button
            type="submit"
            disabled={isLoading || !price}
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

        {entries.length > 0 && (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {entries.slice(0, 10).map((entry) => (
              <li
                key={entry.date}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span className="font-mono text-xs text-zinc-500">
                  {formatDate(entry.date)}
                </span>
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
      </CardBody>
    </Card>
  );
}
