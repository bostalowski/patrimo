import type { DiversificationCoherenceResult } from "@patrimo/core/diversification-coherence";
import {
	stockBandDriftBreachKeys,
	THIS_MONTH_DIVERSIFICATION_LINK,
	thisMonthExposureAlertBody,
} from "@patrimo/core/this-month-copy";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";

export function DashboardExposureAlert({
	coherence,
}: {
	coherence: DiversificationCoherenceResult | null;
}) {
	const breachKeys = stockBandDriftBreachKeys(coherence);
	const exposureBody = thisMonthExposureAlertBody(breachKeys);
	if (!exposureBody) return null;

	return (
		<Card className="w-full border-rose-200 dark:border-rose-900/60">
			<CardBody>
				<p className="text-sm text-rose-950 dark:text-rose-50">
					{exposureBody}{" "}
					<Link
						href={THIS_MONTH_DIVERSIFICATION_LINK}
						className="font-medium underline hover:text-rose-800 dark:hover:text-rose-200"
					>
						Voir Diversification
					</Link>
				</p>
			</CardBody>
		</Card>
	);
}
