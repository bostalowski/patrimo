"use client";

import { useMemo } from "react";
import {
	computeGoalHorizon,
	resolveGoalCapitalNeeds,
	trajectoryStatus,
	type TrajectoryStatus,
} from "@patrimo/core/financial-goals";
import type { FinancialGoal, RetirementProfile } from "@patrimo/core/schema";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardBody,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatEuro } from "@/lib/utils";

export type SerializedGoal = {
	id: string;
	label: string;
	type: FinancialGoal["type"];
	targetAmount: number;
	targetAge?: number;
	targetDate?: string;
	inflationIncluded?: boolean;
	drawOnCapital?: boolean;
	capitalisationRate?: number;
	notes?: string;
};

export type SerializedRetirementProfile = {
	birthDate?: string;
	targetRetirementAge: number;
	estimatedPublicPension?: number;
};

export type GoalsAlignmentInput = {
	goals: SerializedGoal[];
	profile: SerializedRetirementProfile;
};

/** Project liquid capacity to a horizon using the live Projection parameters. */
export type ProjectCapacityFn = (horizonYears: number) => number;

const STATUS_LABEL: Record<TrajectoryStatus, string> = {
	ahead: "Aligné (+)",
	on_track: "Aligné",
	behind: "Sous la cible",
};

const STATUS_BADGE: Record<
	TrajectoryStatus,
	"success" | "info" | "danger"
> = {
	ahead: "success",
	on_track: "info",
	behind: "danger",
};

function hydrateGoals(goals: SerializedGoal[]): FinancialGoal[] {
	return goals.map((goal) => {
		if (goal.type === "RETIREMENT_INCOME") {
			return {
				id: goal.id,
				label: goal.label,
				type: "RETIREMENT_INCOME",
				targetAmount: goal.targetAmount,
				targetAge: goal.targetAge,
				inflationIncluded: goal.inflationIncluded !== false,
				drawOnCapital: goal.drawOnCapital === true,
				capitalisationRate: goal.capitalisationRate,
				notes: goal.notes,
			};
		}
		return {
			id: goal.id,
			label: goal.label,
			type: "CAPITAL_AT_DATE",
			targetAmount: goal.targetAmount,
			targetDate: goal.targetDate
				? new Date(goal.targetDate)
				: undefined,
			inflationIncluded: goal.inflationIncluded !== false,
			drawOnCapital: false,
			notes: goal.notes,
		};
	});
}

function hydrateProfile(
	profile: SerializedRetirementProfile,
): RetirementProfile {
	return {
		birthDate: profile.birthDate
			? new Date(profile.birthDate)
			: undefined,
		targetRetirementAge: profile.targetRetirementAge,
		estimatedPublicPension: profile.estimatedPublicPension,
	};
}

type GoalAlignmentRow = {
	id: string;
	label: string;
	requiredToday: number;
	requiredAtHorizon: number;
	projectedReal: number | null;
	status: TrajectoryStatus | null;
	incomplete: boolean;
	horizonYears: number | null;
};

export function GoalsAlignmentPanel({
	input,
	projectRealCapacity,
	inflationRate,
	now = new Date(),
}: {
	input: GoalsAlignmentInput;
	projectRealCapacity: ProjectCapacityFn;
	inflationRate: number;
	now?: Date;
}) {
	const rows = useMemo((): GoalAlignmentRow[] => {
		const profile = hydrateProfile(input.profile);
		const incompleteProfile = !profile.birthDate;

		return hydrateGoals(input.goals).map((goal) => {
			const needsBirthDate = goal.type === "RETIREMENT_INCOME";
			const incomplete = needsBirthDate && incompleteProfile;
			const horizon = computeGoalHorizon(goal, profile, now);
			const needs = resolveGoalCapitalNeeds({
				goal,
				profile,
				horizonYears:
					!incomplete && horizon ? horizon.horizonYears : null,
				inflationRate,
			});
			const { requiredToday, requiredAtHorizon } = needs;

			if (incomplete || !horizon) {
				return {
					id: goal.id,
					label: goal.label,
					requiredToday,
					requiredAtHorizon,
					projectedReal: null,
					status: null,
					incomplete: true,
					horizonYears: null,
				};
			}

			if (horizon.expired) {
				const projectedReal = projectRealCapacity(0);
				return {
					id: goal.id,
					label: goal.label,
					requiredToday,
					requiredAtHorizon,
					projectedReal,
					status:
						projectedReal >= requiredToday ? "ahead" : "behind",
					incomplete: false,
					horizonYears: 0,
				};
			}

			const projectedReal = projectRealCapacity(horizon.horizonYears);
			return {
				id: goal.id,
				label: goal.label,
				requiredToday,
				requiredAtHorizon,
				projectedReal,
				status: trajectoryStatus(projectedReal, requiredToday),
				incomplete: false,
				horizonYears: horizon.horizonYears,
			};
		});
	}, [input, projectRealCapacity, inflationRate, now]);

	if (rows.length === 0) return null;

	const sumRequired = rows.reduce((s, r) => s + r.requiredToday, 0);
	const maxHorizon = Math.max(
		0,
		...rows.map((r) => r.horizonYears ?? 0),
	);
	const capacityAtMax =
		maxHorizon > 0 || rows.some((r) => !r.incomplete)
			? projectRealCapacity(maxHorizon)
			: null;
	const oversubscribed =
		capacityAtMax !== null &&
		sumRequired > 0 &&
		capacityAtMax < sumRequired;

	return (
		<Card>
			<CardHeader>
				<div className="flex flex-wrap items-start justify-between gap-2">
					<div>
						<CardTitle>Alignement des objectifs</CardTitle>
						<p className="text-xs text-zinc-500 dark:text-zinc-400">
							Lecture seule : mêmes taux, versements et inflation
							que la projection ci-dessus.{" "}
							<Link
								href="/objectifs"
								className="underline hover:text-zinc-700 dark:hover:text-zinc-200"
							>
								Objectifs
							</Link>
						</p>
					</div>
					{oversubscribed && (
						<Badge variant="danger">Sursouscription</Badge>
					)}
				</div>
			</CardHeader>
			<CardBody>
				<ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
					{rows.map((row) => (
						<li
							key={row.id}
							className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
						>
							<div className="min-w-0">
								<p className="truncate text-sm font-medium">
									{row.label}
								</p>
								<p className="text-xs text-zinc-500">
									Besoin {formatEuro(row.requiredAtHorizon)}
									{row.projectedReal !== null && (
										<>
											{" "}
											· projeté ~
											{formatEuro(row.projectedReal)}
											{row.horizonYears !== null &&
												row.horizonYears > 0 && (
													<>
														{" "}
														à {Math.round(row.horizonYears)}{" "}
														an(s)
													</>
												)}
										</>
									)}
									{row.incomplete && <> · profil incomplet</>}
								</p>
							</div>
							{row.status && (
								<Badge variant={STATUS_BADGE[row.status]}>
									{STATUS_LABEL[row.status]}
								</Badge>
							)}
						</li>
					))}
				</ul>
			</CardBody>
		</Card>
	);
}
