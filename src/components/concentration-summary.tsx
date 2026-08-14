import type {
  ConcentrationStatus,
  PortfolioConcentration,
} from "@patrimo/core/portfolio-risk";
import { cn, formatPercent } from "@/lib/utils";

const STATUS_LABEL: Record<ConcentrationStatus, string> = {
  diversified: "Diversifié",
  balanced: "Équilibré",
  concentrated: "Concentré",
};

const STATUS_TONE: Record<ConcentrationStatus, string> = {
  diversified:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  balanced:
    "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  concentrated:
    "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
};

export function ConcentrationSummary({
  concentration,
}: {
  concentration: PortfolioConcentration | null;
}) {
  if (!concentration) return null;

  return (
    <div className="mt-4 space-y-1 text-sm">
      <p className="text-zinc-700 dark:text-zinc-300">
        Plus grosse ligne :{" "}
        <span className="font-medium">{concentration.top1Label}</span>
        {" — "}
        <span className="tabular-nums font-semibold">
          {formatPercent(concentration.top1Weight)}
        </span>
      </p>
      <p className="text-xs text-zinc-500">
        Top 3 : {formatPercent(concentration.top3Weight)}
      </p>
      <span
        className={cn(
          "inline-flex rounded-md px-2.5 py-1 text-xs font-semibold",
          STATUS_TONE[concentration.status],
        )}
      >
        {STATUS_LABEL[concentration.status]}
      </span>
    </div>
  );
}
