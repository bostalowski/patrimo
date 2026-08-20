import type { GoalsAssessment } from "@patrimo/core/financial-goals";
import Link from "next/link";
import {
	Card,
	CardHeader,
	CardTitle,
	CardValue,
} from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils";

export function GoalsSummaryCard({
	assessment,
}: {
	assessment: GoalsAssessment | null;
}) {
	if (!assessment) return null;

	return (
		<Card className="max-w-md">
			<CardHeader>
				<CardTitle>
					<Link href="/objectifs" className="hover:underline">
						Objectifs
					</Link>
				</CardTitle>
				<CardValue>{formatPercent(assessment.progressOverall)}</CardValue>
				<p className="text-xs text-zinc-500">
					{assessment.goals.length} objectif
					{assessment.goals.length > 1 ? "s" : ""} · tu as{" "}
					{formatEuro(assessment.liquidMarketValue)} sur{" "}
					{formatEuro(assessment.sumRequiredToday)} nécessaires
				</p>
				<p className="text-xs text-zinc-500">
					<Link
						href="/projection"
						className="underline hover:text-zinc-700 dark:hover:text-zinc-200"
					>
						Voir si tu y arrives
					</Link>{" "}
					sous un scénario de rendement.
				</p>
			</CardHeader>
		</Card>
	);
}
