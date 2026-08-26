import type { NextEuroPlan } from "@patrimo/core/next-euro-plan";
import {
	NEXT_EURO_EF_BANNER_TITLE,
	nextEuroEmergencyFundBannerBody,
} from "@patrimo/core/next-euro-copy";
import {
	THIS_MONTH_DIVERSIFICATION_LINK,
	THIS_MONTH_EXECUTION_LINK,
	THIS_MONTH_TITLE,
	stockBandDriftBreachKeys,
	thisMonthExposureAlertBody,
	thisMonthSavedDcaLead,
} from "@patrimo/core/this-month-copy";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";

export function ThisMonthCard({
	plan,
}: {
	plan: NextEuroPlan | null;
}) {
	if (!plan) return null;

	const efBanner = nextEuroEmergencyFundBannerBody(
		plan.emergencyFundRecommendation,
		formatEuro,
	);
	const breachKeys = stockBandDriftBreachKeys(plan.coherence);
	const exposureBody = thisMonthExposureAlertBody(breachKeys);

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>{THIS_MONTH_TITLE}</CardTitle>
				{efBanner && (
					<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/40">
						<p className="text-xs font-medium text-amber-900 dark:text-amber-100">
							{NEXT_EURO_EF_BANNER_TITLE}
						</p>
						<p className="mt-1 text-sm text-amber-950 dark:text-amber-50">
							{efBanner}
						</p>
					</div>
				)}
				<p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
					{thisMonthSavedDcaLead(plan.monthlyPool, formatEuro)}
				</p>
			</CardHeader>
			<CardBody className="space-y-3 pt-0">
				{exposureBody && (
					<div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900/60 dark:bg-rose-950/40">
						<p className="text-sm text-rose-950 dark:text-rose-50">
							{exposureBody}{" "}
							<Link
								href={THIS_MONTH_DIVERSIFICATION_LINK}
								className="font-medium underline hover:text-rose-800 dark:hover:text-rose-200"
							>
								Voir Diversification
							</Link>
						</p>
					</div>
				)}
				<p className="text-xs">
					<Link
						href={THIS_MONTH_EXECUTION_LINK}
						className="font-medium text-sky-600 underline hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300"
					>
						Voir les ordres (Exécution) →
					</Link>
				</p>
			</CardBody>
		</Card>
	);
}
