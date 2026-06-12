import type { AnnualReturn, MonthlyReturn } from "@/lib/performance";
import { cn, formatPercentCompact } from "@/lib/utils";

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

function cellStyle(value: number | undefined): React.CSSProperties | undefined {
  if (value === undefined) return undefined;
  const intensity = Math.min(Math.abs(value) / 0.1, 1) * 0.55 + 0.08;
  const channel = value >= 0 ? "16, 185, 129" : "244, 63, 94";
  return { backgroundColor: `rgba(${channel}, ${intensity})` };
}

export function ReturnsHeatmap({
  monthly,
  annual,
}: {
  monthly: MonthlyReturn[];
  annual: AnnualReturn[];
}) {
  if (monthly.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
        Pas encore assez d&apos;historique.
      </div>
    );
  }

  const byCell = new Map<string, number>();
  for (const entry of monthly) {
    byCell.set(`${entry.year}-${entry.month}`, entry.value);
  }
  const annualByYear = new Map<number, number>();
  for (const entry of annual) {
    annualByYear.set(entry.year, entry.value);
  }

  const years = [...new Set(monthly.map((entry) => entry.year))].sort(
    (a, b) => b - a,
  );

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-right text-xs">
        <thead>
          <tr className="text-zinc-500 dark:text-zinc-400">
            <th className="px-2 py-1 text-left font-medium">Année</th>
            {MONTH_LABELS.map((label) => (
              <th key={label} className="px-2 py-1 font-medium">
                {label}
              </th>
            ))}
            <th className="px-2 py-1 font-semibold">Année</th>
          </tr>
        </thead>
        <tbody>
          {years.map((year) => {
            const annualValue = annualByYear.get(year);
            return (
              <tr key={year}>
                <td className="px-2 py-1 text-left font-medium text-zinc-700 dark:text-zinc-300">
                  {year}
                </td>
                {MONTH_LABELS.map((label, index) => {
                  const value = byCell.get(`${year}-${index + 1}`);
                  return (
                    <td
                      key={label}
                      style={cellStyle(value)}
                      className="rounded px-2 py-1 tabular-nums text-zinc-800 dark:text-zinc-100"
                    >
                      {value === undefined ? "" : formatPercentCompact(value)}
                    </td>
                  );
                })}
                <td
                  style={cellStyle(annualValue)}
                  className="rounded px-2 py-1 font-semibold tabular-nums text-zinc-900 dark:text-zinc-50"
                >
                  {annualValue === undefined
                    ? ""
                    : formatPercentCompact(annualValue)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DrawdownBadge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-md bg-rose-50 px-3 py-1.5 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
        className,
      )}
    >
      <span className="text-xs font-medium">Max drawdown</span>
      <span className="text-sm font-semibold tabular-nums">
        {formatPercentCompact(value)}
      </span>
    </span>
  );
}
