import type { EmergencyFundHealth } from "@patrimo/core/emergency-fund";
import type { EmergencyFundSurplusRecommendation } from "@patrimo/core/emergency-fund-recommendation";
import { nextEuroEmergencyFundBannerBody } from "@patrimo/core/next-euro-copy";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";

const STATUS_LABEL: Record<NonNullable<EmergencyFundHealth>["status"], string> =
	{
		insufficient: "Insuffisant",
		acceptable: "Acceptable",
		healthy: "Sain",
		over_allocated: "Surdimensionné",
	};

const STATUS_BADGE: Record<
	NonNullable<EmergencyFundHealth>["status"],
	"danger" | "warning" | "success" | "info"
> = {
	insufficient: "danger",
	acceptable: "warning",
	healthy: "success",
	over_allocated: "info",
};

const coverageFormatter = new Intl.NumberFormat("fr-FR", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

export function EmergencyFundCard({
	health,
	surplusRecommendation,
}: {
	health: EmergencyFundHealth | null;
	surplusRecommendation?: EmergencyFundSurplusRecommendation | null;
}) {
	const surplusBody = nextEuroEmergencyFundBannerBody(
		surplusRecommendation,
		formatEuro,
	);

	if (!health && !surplusBody) return null;

	return (
		<Card className="h-full">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle>Fonds d&apos;urgence</CardTitle>
					{health && (
						<Badge variant={STATUS_BADGE[health.status]}>
							{STATUS_LABEL[health.status]}
						</Badge>
					)}
				</div>
				{health && (
					<>
						<CardValue>
							{coverageFormatter.format(health.coverageMonths)} mois
						</CardValue>
						<p className="text-xs text-zinc-500">
							{formatEuro(health.livretBalance)} livrets ·{" "}
							{formatEuro(health.monthlyExpenses)} / mois
						</p>
						{health.status === "over_allocated" && (
							<p className="text-xs text-sky-700 dark:text-sky-300">
								Capital potentiellement immobilisé
							</p>
						)}
					</>
				)}
				{surplusBody && (
					<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/40">
						<p className="text-sm text-amber-950 dark:text-amber-50">
							{surplusBody}
						</p>
					</div>
				)}
			</CardHeader>
		</Card>
	);
}
