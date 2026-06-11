"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  CardBody,
  CardHeader,
  CardTitle,
  Card,
} from "@/components/ui/card";
import { PortfolioCurve } from "@/components/charts/portfolio-curve";
import {
  aggregateHistory,
  type HistorySeries,
} from "@/lib/portfolio-history";
import { cn } from "@/lib/utils";

export function PortfolioCurveCard({ history }: { history: HistorySeries }) {
  const allIds = useMemo(
    () => history.perAsset.map((series) => series.assetId),
    [history],
  );

  const [selected, setSelected] = useState<Set<string>>(() => new Set(allIds));
  const [knownIds, setKnownIds] = useState<readonly string[]>(allIds);
  if (knownIds !== allIds) {
    setKnownIds(allIds);
    setSelected(new Set(allIds));
  }

  const aggregateSet = selected.size === allIds.length ? undefined : selected;
  const points = useMemo(
    () => aggregateHistory(history, aggregateSet),
    [history, aggregateSet],
  );

  const summaryLabel = (() => {
    if (selected.size === 0) return "Aucun actif";
    if (selected.size === allIds.length) return "Tous les actifs";
    if (selected.size === 1) {
      const only = history.perAsset.find((s) => selected.has(s.assetId));
      return only?.label ?? "1 actif";
    }
    return `${selected.size} actifs sélectionnés`;
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Évolution du patrimoine</CardTitle>
            <p className="text-xs text-zinc-500">
              Valeur (zone verte) vs capital investi cumulé (pointillé).
            </p>
          </div>
          {history.perAsset.length > 0 && (
            <AssetFilter
              assets={history.perAsset.map((s) => ({
                id: s.assetId,
                label: s.label,
              }))}
              selected={selected}
              onChange={setSelected}
              summaryLabel={summaryLabel}
            />
          )}
        </div>
      </CardHeader>
      <CardBody>
        <PortfolioCurve data={points} />
      </CardBody>
    </Card>
  );
}

type AssetOption = { id: string; label: string };

function AssetFilter({
  assets,
  selected,
  onChange,
  summaryLabel,
}: {
  assets: AssetOption[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  summaryLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selectAll = () => onChange(new Set(assets.map((a) => a.id)));
  const clearAll = () => onChange(new Set());

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50",
          "dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
          open && "border-zinc-300 dark:border-zinc-700",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{summaryLabel}</span>
        <ChevronIcon className={cn("size-3.5 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 text-xs dark:border-zinc-800">
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              Filtrer par actif
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Tout
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="text-zinc-500 hover:underline dark:text-zinc-400"
              >
                Aucun
              </button>
            </div>
          </div>
          <ul className="max-h-72 overflow-y-auto py-1">
            {assets.map((asset) => {
              const checked = selected.has(asset.id);
              return (
                <li key={asset.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(asset.id)}
                      className="size-3.5 accent-emerald-600"
                    />
                    <span className="truncate text-zinc-800 dark:text-zinc-200">
                      {asset.label}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <title>chevron</title>
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
