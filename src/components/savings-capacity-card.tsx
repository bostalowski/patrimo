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

	const targetLabel =
		capacity.emergencyTargetEuro !== undefined
			? formatEuro(capacity.emergencyTargetEuro)
			: `${capacity.emergencyTargetMonths} mois de dépenses`;

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
					DCA investissement {formatEuro(capacity.plannedDcaMonthly)}
					{capacity.plannedLivretDcaMonthly > 0 && (
						<>
							{" "}
							· LIVRET prévu {formatEuro(capacity.plannedLivretDcaMonthly)}
						</>
					)}
					{capacity.monthlyEmergencyReserve > 0 && (
						<>
							{" "}
							· besoin rattrapage {formatEuro(capacity.monthlyEmergencyReserve)}{" "}
							/ mois pour atteindre {targetLabel}
						</>
					)}
					{capacity.monthlyEmergencyReserve === 0 &&
						capacity.plannedLivretDcaMonthly === 0 &&
						capacity.emergencyTargetEuro !== undefined && (
							<> · cible {targetLabel}</>
						)}
				</p>
				{capacity.emergencyOverContributing && (
					<p className="text-xs text-amber-700 dark:text-amber-300">
						LIVRET au-dessus du besoin : +
						{formatEuro(capacity.emergencyOverContribution)} / mois
					</p>
				)}
				{capacity.status === "over_committed" && (
					<p className="text-xs text-rose-700 dark:text-rose-300">
						Écart {formatEuro(capacity.gap)} / mois au-dessus de la capacité
					</p>
				)}
			</CardHeader>
		</Card>
	);
}
