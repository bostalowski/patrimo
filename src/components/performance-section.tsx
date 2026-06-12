"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PortfolioCurve } from "@/components/charts/portfolio-curve";
import {
  DrawdownBadge,
  ReturnsHeatmap,
} from "@/components/charts/returns-heatmap";
import { PerformanceSummary } from "@/components/performance-summary";
import {
  aggregateHistory,
  buildBenchmarkSeries,
  type HistorySeries,
} from "@/lib/portfolio-history";
import {
  annualReturns,
  maxDrawdown,
  monthlyReturns,
  periodReturns,
  xirr,
} from "@/lib/performance";
import type { AssetPriceHistory } from "@/lib/store";
import { cn, formatEuro, formatPercentCompact, signClass } from "@/lib/utils";

type BenchmarkProp = {
  label: string;
  history: AssetPriceHistory;
};

export function PerformanceSection({
  history,
  benchmark,
}: {
  history: HistorySeries;
  benchmark?: BenchmarkProp;
}) {
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

  const hasBenchmark = !!benchmark && Object.keys(benchmark.history).length > 0;
  const [benchmarkOn, setBenchmarkOn] = useState(false);

  const aggregateSet = selected.size === allIds.length ? undefined : selected;
  const points = useMemo(
    () => aggregateHistory(history, aggregateSet),
    [history, aggregateSet],
  );

  const periods = useMemo(() => periodReturns(points), [points]);
  const annualizedXirr = useMemo(() => xirr(points), [points]);
  const monthly = useMemo(() => monthlyReturns(points), [points]);
  const annual = useMemo(() => annualReturns(points), [points]);
  const drawdown = useMemo(() => maxDrawdown(points), [points]);

  const benchmarkSeries = useMemo(() => {
    if (!benchmarkOn || !benchmark) return null;
    return buildBenchmarkSeries(points, benchmark.history);
  }, [benchmarkOn, benchmark, points]);

  const chartData = useMemo(() => {
    if (!benchmarkSeries) return points;
    return points.map((point, i) => ({
      ...point,
      benchmark: benchmarkSeries[i] ?? null,
    }));
  }, [points, benchmarkSeries]);

  const comparison = useMemo(() => {
    if (!benchmarkSeries || points.length === 0) return null;
    const lastValue = points[points.length - 1]?.value ?? 0;
    let lastBench: number | null = null;
    for (let i = benchmarkSeries.length - 1; i >= 0; i--) {
      const v = benchmarkSeries[i];
      if (typeof v === "number") {
        lastBench = v;
        break;
      }
    }
    if (lastBench === null || lastBench === 0) return null;
    const diff = lastValue - lastBench;
    const diffPct = diff / lastBench;
    return { lastValue, lastBench, diff, diffPct };
  }, [benchmarkSeries, points]);

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
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Performance</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Rendement pondéré dans le temps (TWR) sur {summaryLabel.toLowerCase()}.
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

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Performance par période</CardTitle>
              <p className="text-xs text-zinc-500">
                Neutralise l&apos;effet des apports successifs.
              </p>
            </div>
            <span className="inline-flex items-baseline gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 dark:bg-zinc-900">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                TRI annualisé (XIRR)
              </span>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  annualizedXirr === null ? "" : signClass(annualizedXirr),
                )}
              >
                {annualizedXirr === null
                  ? "—"
                  : formatPercentCompact(annualizedXirr)}
              </span>
            </span>
          </div>
        </CardHeader>
        <CardBody>
          <PerformanceSummary periods={periods} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Évolution du patrimoine</CardTitle>
              <p className="text-xs text-zinc-500">
                Valeur (zone verte) vs capital investi cumulé (pointillé)
                {benchmarkOn && benchmark
                  ? ` vs ${benchmark.label} simulé (indigo)`
                  : ""}
                .
              </p>
            </div>
            {hasBenchmark && benchmark && (
              <BenchmarkToggle
                label={benchmark.label}
                active={benchmarkOn}
                onToggle={() => setBenchmarkOn((v) => !v)}
              />
            )}
          </div>
          {benchmarkOn && benchmark && comparison && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">
                Portefeuille{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {formatEuro(comparison.lastValue)}
                </span>
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {benchmark.label} simulé{" "}
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {formatEuro(comparison.lastBench)}
                </span>
              </span>
              <span className={cn("font-semibold", signClass(comparison.diff))}>
                {comparison.diff >= 0 ? "+" : ""}
                {formatEuro(comparison.diff)} ({comparison.diff >= 0 ? "+" : ""}
                {formatPercentCompact(comparison.diffPct)}) vs {benchmark.label}
              </span>
            </div>
          )}
        </CardHeader>
        <CardBody>
          <PortfolioCurve
            data={chartData}
            benchmarkLabel={
              benchmarkOn && benchmark ? `${benchmark.label} simulé` : undefined
            }
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Performance mensuelle & annuelle</CardTitle>
              <p className="text-xs text-zinc-500">
                Rendement TWR par mois et par année.
              </p>
            </div>
            <DrawdownBadge value={drawdown.value} />
          </div>
        </CardHeader>
        <CardBody>
          <ReturnsHeatmap monthly={monthly} annual={annual} />
        </CardBody>
      </Card>
    </section>
  );
}

function BenchmarkToggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition",
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:border-zinc-700 dark:hover:bg-zinc-900",
      )}
    >
      <span
        className={cn(
          "inline-block size-2 rounded-full",
          active ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-700",
        )}
        aria-hidden="true"
      />
      <span>Comparer à {label}</span>
    </button>
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
