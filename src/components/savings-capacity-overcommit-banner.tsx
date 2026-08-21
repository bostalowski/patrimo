import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SavingsCapacity } from "@patrimo/core/savings-capacity";
import { formatEuro } from "@/lib/utils";

/**
 * Soft warning when planned DCA exceeds investable surplus.
 * Shown on DCA / Projection surfaces only (not Dashboard).
 */
export function SavingsCapacityOverCommitBanner({
	capacity,
}: {
	capacity: SavingsCapacity | null;
}) {
	if (!capacity || capacity.status !== "over_committed") return null;

	return (
		<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
			<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
			<div className="space-y-1">
				<p className="font-medium">DCA au-dessus de ta capacité d&apos;épargne</p>
				<p className="text-xs leading-relaxed">
					Tes plans totalisent {formatEuro(capacity.plannedDcaMonthly)} / mois
					pour une capacité investissable de{" "}
					{formatEuro(capacity.investableSurplus)} / mois (écart{" "}
					{formatEuro(capacity.gap)}). Aucun plan n&apos;est modifié — vois le
					détail sur le{" "}
					<Link
						href="/"
						className="font-medium underline underline-offset-2"
					>
						Dashboard
					</Link>
					.
				</p>
			</div>
		</div>
	);
}
