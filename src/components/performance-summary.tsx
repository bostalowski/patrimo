import type { PeriodReturn } from "@/lib/performance";
import { cn, formatPercentCompact, signClass } from "@/lib/utils";

export function PerformanceSummary({ periods }: { periods: PeriodReturn[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-zinc-200 bg-zinc-200 sm:grid-cols-3 lg:grid-cols-5 dark:border-zinc-800 dark:bg-zinc-800">
      {periods.map((period) => (
        <div
          key={period.id}
          className="flex flex-col gap-1 bg-white p-4 dark:bg-zinc-950"
        >
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {period.label}
          </span>
          <span
            className={cn(
              "text-lg font-semibold tabular-nums",
              period.value === null ? "text-zinc-400" : signClass(period.value),
            )}
          >
            {period.value === null ? "—" : formatPercentCompact(period.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
