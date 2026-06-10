"use client";

import { formatEuro, formatPercent } from "@/lib/utils";

type Row = {
  category: string;
  current: number;
  target: number;
  currentPct: number;
  targetPct: number;
  diffEur: number;
};

export function AllocationVsTarget({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucune cible d&apos;allocation configurée.
      </p>
    );
  }

  const maxPct = Math.max(
    ...rows.flatMap((r) => [r.currentPct, r.targetPct, 0.01]),
  );

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const overweight = row.diffEur > 0;
        return (
          <div key={row.category} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{row.category}</span>
              <span className="font-mono text-xs text-zinc-500">
                {formatPercent(row.currentPct)} / cible {formatPercent(row.targetPct)}
                {row.diffEur !== 0 && (
                  <span
                    className={
                      overweight
                        ? "ml-2 text-amber-600 dark:text-amber-400"
                        : "ml-2 text-sky-600 dark:text-sky-400"
                    }
                  >
                    {overweight ? "+" : ""}
                    {formatEuro(row.diffEur)}
                  </span>
                )}
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/80"
                style={{ width: `${(row.currentPct / maxPct) * 100}%` }}
              />
              <div
                className="absolute inset-y-0 w-px bg-zinc-400"
                style={{ left: `${(row.targetPct / maxPct) * 100}%` }}
                title={`Cible ${formatPercent(row.targetPct)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
