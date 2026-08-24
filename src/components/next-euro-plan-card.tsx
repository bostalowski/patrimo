import type {
	NextEuroAction,
	NextEuroPlan,
	NextEuroStep,
} from "@patrimo/core/next-euro-plan";
import {
	NEXT_EURO_QUESTION,
	NEXT_EURO_TITLE,
	nextEuroLeadRecommendation,
	nextEuroPoolCaption,
	nextEuroPrimaryStep,
} from "@patrimo/core/next-euro-copy";
import { diversificationKeyLabel } from "@patrimo/core/diversification-labels";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";

const ACTION_LABEL: Record<NextEuroAction, string> = {
	buy: "Acheter",
	hold: "Conserver",
	pause: "Pause",
};

const ACTION_BADGE: Record<
	NextEuroAction,
	"success" | "info" | "warning"
> = {
	buy: "success",
	hold: "info",
	pause: "warning",
};

function stepTitle(
	step: NextEuroStep,
	assetLabel: (id: string) => string,
): string {
	if (step.kind === "emergency_fund") return "Livret (fonds d'urgence)";
	if (step.assetId) return assetLabel(step.assetId);
	if (step.bandKey) return diversificationKeyLabel(step.bandKey);
	return step.envelope ?? "—";
}

function StepRow({
	step,
	assetLabel,
}: {
	step: NextEuroStep;
	assetLabel: (id: string) => string;
}) {
	return (
		<li className="flex flex-wrap items-baseline justify-between gap-2 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800">
			<div className="min-w-0 space-y-0.5">
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant={ACTION_BADGE[step.action]}>
						{ACTION_LABEL[step.action]}
					</Badge>
					<span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
						{stepTitle(step, assetLabel)}
					</span>
					{step.envelope && step.kind !== "emergency_fund" && (
						<span className="text-xs text-zinc-500">{step.envelope}</span>
					)}
				</div>
				<p className="text-xs text-zinc-500">{step.reason}</p>
			</div>
			<span className="shrink-0 text-sm font-medium tabular-nums">
				{step.euros > 0 ? formatEuro(step.euros) : "—"}
			</span>
		</li>
	);
}

export function NextEuroPlanCard({
	plan,
	assetLabels = {},
	variant = "full",
}: {
	plan: NextEuroPlan | null;
	assetLabels?: Record<string, string>;
	/** Dashboard shows top 3 + link; Diversification shows the full list. */
	variant?: "summary" | "full";
}) {
	if (!plan || plan.steps.length === 0) return null;

	const labelOf = (id: string) => assetLabels[id] ?? id;
	const primary = nextEuroPrimaryStep(plan);
	const lead =
		primary &&
		nextEuroLeadRecommendation(primary, stepTitle(primary, labelOf), formatEuro);
	const visible =
		variant === "summary" ? plan.steps.slice(0, 3) : plan.steps;

	return (
		<Card className={variant === "summary" ? "max-w-md" : undefined}>
			<CardHeader>
				<CardTitle>
					{variant === "summary" ? (
						<Link href="/diversification" className="hover:underline">
							{NEXT_EURO_TITLE}
						</Link>
					) : (
						NEXT_EURO_TITLE
					)}
				</CardTitle>
				<p className="text-xs text-zinc-500">{NEXT_EURO_QUESTION}</p>
				{lead && (
					<p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
						{lead}
					</p>
				)}
				<p className="text-xs text-zinc-500">
					{nextEuroPoolCaption(plan.monthlyPool, formatEuro)}
				</p>
			</CardHeader>
			<CardBody className="pt-0">
				<p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
					Détail des étapes
				</p>
				<ol className="list-none">
					{visible.map((step) => (
						<StepRow
							key={`${step.priority}-${step.kind}-${step.assetId ?? ""}-${step.bandKey ?? ""}`}
							step={step}
							assetLabel={labelOf}
						/>
					))}
				</ol>
				{variant === "summary" && plan.steps.length > 3 && (
					<p className="mt-2 text-xs text-zinc-500">
						<Link
							href="/diversification"
							className="underline hover:text-zinc-700 dark:hover:text-zinc-200"
						>
							Voir les {plan.steps.length} étapes
						</Link>
					</p>
				)}
				{variant === "summary" && plan.steps.length <= 3 && (
					<p className="mt-2 text-xs text-zinc-500">
						<Link
							href="/diversification"
							className="underline hover:text-zinc-700 dark:hover:text-zinc-200"
						>
							Détail sur Diversification
						</Link>
					</p>
				)}
			</CardBody>
		</Card>
	);
}
