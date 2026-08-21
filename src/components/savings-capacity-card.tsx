import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardHeader,
	CardTitle,
	CardValue,
} from "@/components/ui/card";
import type {
	SavingsCapacity,
	SavingsCapacityStatus,
} from "@patrimo/core/savings-capacity";
import { formatEuro } from "@/lib/utils";

const STATUS_LABEL: Record<SavingsCapacityStatus, string> = {
	comfortable: "À l'aise",
	tight: "Serré",
	over_committed: "Surengagé",
};

const STATUS_BADGE: Record<
	SavingsCapacityStatus,
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

	return (
		<Card className="max-w-md">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle>Capacité d&apos;épargne</CardTitle>
					<Badge variant={STATUS_BADGE[capacity.status]}>
						{STATUS_LABEL[capacity.status]}
					</Badge>
				</div>
				<CardValue>{formatEuro(capacity.investableSurplus)} / mois</CardValue>
				<p className="text-xs text-zinc-500">
					DCA prévu {formatEuro(capacity.plannedDcaMonthly)}
					{capacity.monthlyEmergencyReserve > 0 && (
						<>
							{" "}
							· réserve FU {formatEuro(capacity.monthlyEmergencyReserve)}
						</>
					)}
				</p>
				{capacity.status === "over_committed" && (
					<p className="text-xs text-rose-700 dark:text-rose-300">
						Écart {formatEuro(capacity.gap)} / mois au-dessus de la capacité
					</p>
				)}
			</CardHeader>
		</Card>
	);
}
