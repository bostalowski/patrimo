import type { GoalsAssessment } from "@patrimo/core/financial-goals";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardBody,
	CardHeader,
	CardTitle,
	CardValue,
} from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils";

function ProgressBar({ progress }: { progress: number }) {
	const pct = Math.max(0, Math.min(1, progress));

	return (
		<div
			className="h-3.5 overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800"
			aria-hidden
		>
			<div
				className="h-full rounded-sm bg-sky-600 dark:bg-sky-500"
				style={{ width: `${pct * 100}%` }}
			/>
		</div>
	);
}

function GoalCard({
	assessment,
	liquidMarketValue,
}: {
	assessment: GoalsAssessment["goals"][number];
	liquidMarketValue: number;
}) {
	const { goal } = assessment;

	const modeLabel =
		goal.type === "RETIREMENT_INCOME"
			? goal.drawOnCapital
				? "vivre sur le capital"
				: "intérêts seuls"
			: null;
	const ratePct =
		goal.type === "RETIREMENT_INCOME" && goal.capitalisationRate
			? Math.round(goal.capitalisationRate * 10000) / 100
			: null;
	const pensionNote =
		goal.type === "RETIREMENT_INCOME" &&
		assessment.pensionNetMonthlyApplied > 0
			? ` · retraite publique nette estimée ${formatEuro(assessment.pensionNetMonthlyApplied)}/mois déjà déduite`
			: "";
	const needLine =
		goal.type === "RETIREMENT_INCOME"
			? `Il te faut ${formatEuro(assessment.requiredToday)} de placements pour viser ${formatEuro(goal.targetAmount)}/mois à ${goal.targetAge} ans (${modeLabel}${ratePct !== null ? ` @ ${ratePct} %` : ""})${pensionNote}`
			: `Il te faut ${formatEuro(assessment.requiredToday)} de placements pour viser ${formatEuro(goal.targetAmount)} au ${
					goal.targetDate
						? new Date(goal.targetDate).toLocaleDateString("fr-FR")
						: "—"
				}`;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle>{goal.label}</CardTitle>
						<p className="text-xs text-zinc-500">{needLine}</p>
					</div>
					{assessment.incomplete && (
						<Badge variant="warning">Profil incomplet</Badge>
					)}
					{assessment.expired && !assessment.incomplete && (
						<Badge variant="warning">Horizon dépassé</Badge>
					)}
				</div>
				<CardValue>{formatPercent(assessment.progressCurrent)}</CardValue>
				<p className="text-xs text-zinc-500">
					Tu en as {formatEuro(liquidMarketValue)}
					{assessment.targetNominalAtHorizon !== null && (
						<>
							{" "}
							· cible ~{formatEuro(assessment.targetNominalAtHorizon)}
							{" "}
							en euros de l&apos;horizon
							{assessment.goal.inflationIncluded !== false
								? " (inflation comprise)"
								: " (sans ré-inflation)"}
						</>
					)}
				</p>
			</CardHeader>
			<CardBody>
				<ProgressBar progress={assessment.progressCurrent} />
				{assessment.incomplete && (
					<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
						Renseigne ta date de naissance dans{" "}
						<Link href="/investissements" className="underline">
							Investissements → Retraite
						</Link>{" "}
						pour caler l&apos;horizon.
					</p>
				)}
			</CardBody>
		</Card>
	);
}

export function GoalsAssessmentPanel({
	assessment,
}: {
	assessment: GoalsAssessment | null;
}) {
	if (!assessment) return null;

	const showCumul = assessment.goals.length > 1;

	return (
		<div className="space-y-4">
			{showCumul && (
				<Card>
					<CardHeader>
						<div>
							<CardTitle>Cumul des objectifs</CardTitle>
							<p className="text-xs text-zinc-500">
								Les objectifs partagent le même patrimoine liquide.
							</p>
						</div>
						<CardValue>{formatPercent(assessment.progressOverall)}</CardValue>
						<p className="text-xs text-zinc-500">
							Il te faut {formatEuro(assessment.sumRequiredToday)} · tu en as{" "}
							{formatEuro(assessment.liquidMarketValue)}
						</p>
					</CardHeader>
					<CardBody>
						<ProgressBar progress={assessment.progressOverall} />
						{assessment.incompleteProfile && (
							<p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
								Profil retraite incomplet : certains horizons ne peuvent pas
								être calculés.
							</p>
						)}
					</CardBody>
				</Card>
			)}

			<div
				className={
					assessment.goals.length > 1
						? "grid gap-4 md:grid-cols-2"
						: "grid gap-4"
				}
			>
				{assessment.goals.map((goal) => (
					<GoalCard
						key={goal.goal.id}
						assessment={goal}
						liquidMarketValue={assessment.liquidMarketValue}
					/>
				))}
			</div>

			<p className="text-sm text-zinc-500 dark:text-zinc-400">
				Pour savoir si tu y arrives sous un scénario de rendement, ouvre{" "}
				<Link
					href="/projection"
					className="underline hover:text-zinc-700 dark:hover:text-zinc-200"
				>
					Projection
				</Link>
				.
			</p>
		</div>
	);
}
