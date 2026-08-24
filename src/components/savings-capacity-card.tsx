import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardHeader,
	CardTitle,
	CardValue,
} from "@/components/ui/card";
import type { SavingsCapacity } from "@patrimo/core/savings-capacity";
import {
	SAVINGS_CAPACITY_QUESTION,
	SAVINGS_CAPACITY_STATUS_LABEL,
	SAVINGS_CAPACITY_SURPLUS_CAPTION,
	SAVINGS_CAPACITY_TITLE,
	savingsCapacityLivretRecommendation,
	savingsCapacityRecommendation,
} from "@patrimo/core/savings-capacity-copy";
import { formatEuro } from "@/lib/utils";

const STATUS_BADGE: Record<
	SavingsCapacity["status"],
	"success" | "warning" | "danger"
> = {
	comfortable: "success",
	tight: "warning",
	over_committed: "danger",
};

export function SavingsCapacityCard({
	capacity,
}: {
	capacity: SavingsCapacity | null;
}) {
	if (!capacity) return null;

	const targetLabel =
		capacity.emergencyTargetEuro !== undefined
			? formatEuro(capacity.emergencyTargetEuro)
			: `${capacity.emergencyTargetMonths} mois de dépenses`;

	const recommendation = savingsCapacityRecommendation(capacity, formatEuro);
	const livretReco = savingsCapacityLivretRecommendation(capacity, formatEuro);

	const detailParts = [
		`DCA investi ${formatEuro(capacity.plannedDcaMonthly)}`,
	];
	if (capacity.plannedLivretDcaMonthly > 0) {
		detailParts.push(
			`LIVRET prévu ${formatEuro(capacity.plannedLivretDcaMonthly)}`,
		);
	}
	if (capacity.monthlyEmergencyReserve > 0) {
		detailParts.push(
			`besoin rattrapage ${formatEuro(capacity.monthlyEmergencyReserve)} / mois pour atteindre ${targetLabel}`,
		);
	} else if (
		capacity.plannedLivretDcaMonthly === 0 &&
		capacity.emergencyTargetEuro !== undefined
	) {
		detailParts.push(`cible ${targetLabel}`);
	}

	return (
		<Card className="max-w-md">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle>{SAVINGS_CAPACITY_TITLE}</CardTitle>
					<Badge variant={STATUS_BADGE[capacity.status]}>
						{SAVINGS_CAPACITY_STATUS_LABEL[capacity.status]}
					</Badge>
				</div>
				<p className="text-xs text-zinc-500">{SAVINGS_CAPACITY_QUESTION}</p>
				<CardValue>{formatEuro(capacity.investableSurplus)}</CardValue>
				<p className="text-xs text-zinc-500">{SAVINGS_CAPACITY_SURPLUS_CAPTION}</p>
				<p
					className={
						capacity.status === "over_committed"
							? "text-sm text-rose-700 dark:text-rose-300"
							: capacity.status === "tight"
								? "text-sm text-amber-800 dark:text-amber-200"
								: "text-sm text-zinc-700 dark:text-zinc-300"
					}
				>
					{recommendation}
				</p>
				{livretReco && (
					<p className="text-sm text-amber-700 dark:text-amber-300">
						{livretReco}
					</p>
				)}
				<p className="text-xs text-zinc-500">{detailParts.join(" · ")}</p>
			</CardHeader>
		</Card>
	);
}
