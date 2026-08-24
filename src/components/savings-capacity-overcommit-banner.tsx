import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { SavingsCapacity } from "@patrimo/core/savings-capacity";
import { formatEuro } from "@/lib/utils";

/**
 * Soft warning when planned investment DCA exceeds investable surplus.
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
					Tes plans d&apos;investissement totalisent{" "}
					{formatEuro(capacity.plannedDcaMonthly)} / mois pour une capacité
					investissable de {formatEuro(capacity.investableSurplus)} / mois
					(écart {formatEuro(capacity.gap)}). Aucun plan n&apos;est modifié —
					vois le détail sur le{" "}
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

/**
 * Soft warning when planned LIVRET DCA exceeds the implied emergency catch-up need.
 * Shown on web DCA page alongside the investment over-commit banner when both apply.
 */
export function SavingsCapacityEmergencyOverBanner({
	capacity,
}: {
	capacity: SavingsCapacity | null;
}) {
	if (!capacity || !capacity.emergencyOverContributing) return null;

	return (
		<div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200">
			<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
			<div className="space-y-1">
				<p className="font-medium">
					Dépôt LIVRET au-dessus du besoin de rattrapage
				</p>
				<p className="text-xs leading-relaxed">
					Ton plan LIVRET totalise{" "}
					{formatEuro(capacity.plannedLivretDcaMonthly)} / mois pour un besoin
					de {formatEuro(capacity.monthlyEmergencyReserve)} / mois (surplus{" "}
					{formatEuro(capacity.emergencyOverContribution)}). Aucun plan
					n&apos;est modifié — vois le détail sur le{" "}
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
