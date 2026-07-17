"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Asset, AssetType, PriceSource } from "@/lib/schema";

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

type Props = {
  assetTypes: readonly AssetType[];
  priceSources: readonly PriceSource[];
  asset?: Asset;
  trigger?: "primary" | "icon";
};

export function AssetForm({ assetTypes, priceSources, asset, trigger = "primary" }: Props) {
  const router = useRouter();
  const isEdit = Boolean(asset);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState(asset?.label ?? "");
  const [type, setType] = useState<AssetType>(asset?.type ?? assetTypes[0]);
  const [source, setSource] = useState<PriceSource>(asset?.source ?? priceSources[0]);
  const [isin, setIsin] = useState(asset?.isin ?? "");
  const [ticker, setTicker] = useState(asset?.ticker ?? "");
  const [param, setParam] = useState(asset?.param ?? "");
  const [currency, setCurrency] = useState(asset?.currency ?? "EUR");
  const [ter, setTer] = useState(asset?.ter != null ? String(asset.ter * 100) : "");

  const isLoading = busy || pending;

  function reset() {
    setLabel(asset?.label ?? "");
    setType(asset?.type ?? assetTypes[0]);
    setSource(asset?.source ?? priceSources[0]);
    setIsin(asset?.isin ?? "");
    setTicker(asset?.ticker ?? "");
    setParam(asset?.param ?? "");
    setCurrency(asset?.currency ?? "EUR");
    setTer(asset?.ter != null ? String(asset.ter * 100) : "");
    setError(null);
  }

  function close() {
    setOpen(false);
    setError(null);
    if (!isEdit) reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Le libellé est requis.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/assets", {
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: asset!.id } : {}),
          label: trimmedLabel,
          type,
          source,
          isin: isin.trim() || undefined,
          ticker: ticker.trim() || undefined,
          param: param.trim() || undefined,
          currency: currency.trim() || "EUR",
          ter: ter.trim() ? Number(ter.replace(",", ".")) / 100 : undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        id?: string;
      } | null;
      if (!res.ok) {
        throw new Error(body?.error ?? (isEdit ? "Échec de la mise à jour" : "Échec de la création"));
      }

      const assetId = isEdit ? asset!.id : body?.id;
      if (source !== "manual" && assetId) {
        await fetch(`/api/prices/sync?assetId=${encodeURIComponent(assetId)}`, {
          method: "POST",
        }).catch(() => null);
      }

      close();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    if (trigger === "icon") {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Éditer l'actif"
          title="Éditer"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      );
    }
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Nouvel actif
        </button>
      </div>
    );
  }

  const card = (
    <Card className={trigger === "icon" ? "w-full max-w-3xl" : undefined}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{isEdit ? `Éditer ${asset?.label}` : "Nouvel actif"}</CardTitle>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Libellé" className="sm:col-span-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="iShares MSCI World"
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssetType)}
                className={inputClasses}
              >
                {assetTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Source prix">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as PriceSource)}
                className={inputClasses}
              >
                {priceSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Devise">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={inputClasses}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="ISIN">
              <input
                type="text"
                value={isin}
                onChange={(e) => setIsin(e.target.value)}
                placeholder="Optionnel"
                className={inputClasses}
              />
            </Field>

            <Field label="Ticker">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="Optionnel"
                className={inputClasses}
              />
            </Field>

            <Field label="Param source">
              <input
                type="text"
                value={param}
                onChange={(e) => setParam(e.target.value)}
                placeholder="ID coingecko, ticker Yahoo, slug Investir…"
                className={inputClasses}
              />
            </Field>

            <Field label="TER (%)">
              <input
                type="text"
                inputMode="decimal"
                value={ter}
                onChange={(e) => setTer(e.target.value)}
                placeholder="0.20"
                className={inputClasses}
              />
            </Field>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isLoading}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEdit ? "Mettre à jour" : "Ajouter à l’Excel"}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );

  if (trigger === "icon") {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-10">
        <button
          type="button"
          aria-label="Fermer"
          onClick={close}
          className="absolute inset-0 cursor-default bg-zinc-950/50"
        />
        <div className="relative z-10 w-full max-w-3xl">{card}</div>
      </div>
    );
  }

  return card;
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 text-xs", className)}>
      <span className="font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  );
}
