"use client";

import { validateFinancialGoals } from "@patrimo/core/financial-goals";
import type { FinancialGoal, FinancialGoalType } from "@patrimo/core/schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

type DraftGoal = {
	id: string;
	label: string;
	type: FinancialGoalType;
	targetAmount: string;
	targetAge: string;
	targetDate: string;
	inflationIncluded: boolean;
	notes: string;
};

function toIsoDateInput(value: Date | string | undefined): string {
	if (!value) return "";
	const date = value instanceof Date ? value : new Date(value);
	if (!Number.isFinite(date.getTime())) return "";
	return date.toISOString().slice(0, 10);
}

function toDraft(goals: FinancialGoal[]): DraftGoal[] {
	return goals.map((goal) => ({
		id: goal.id,
		label: goal.label,
		type: goal.type,
		targetAmount: String(goal.targetAmount),
		targetAge: goal.targetAge !== undefined ? String(goal.targetAge) : "",
		targetDate: toIsoDateInput(goal.targetDate),
		inflationIncluded: goal.inflationIncluded !== false,
		notes: goal.notes ?? "",
	}));
}

function fromDraft(rows: DraftGoal[]): FinancialGoal[] {
	return rows.map((row) => {
		const targetAmount = Number(row.targetAmount.replace(",", "."));
		if (row.type === "RETIREMENT_INCOME") {
			return {
				id: row.id.trim(),
				label: row.label.trim(),
				type: "RETIREMENT_INCOME" as const,
				targetAmount,
				targetAge: row.targetAge
					? Math.round(Number(row.targetAge.replace(",", ".")))
					: undefined,
				inflationIncluded: row.inflationIncluded,
				notes: row.notes.trim() || undefined,
			};
		}
		return {
			id: row.id.trim(),
			label: row.label.trim(),
			type: "CAPITAL_AT_DATE" as const,
			targetAmount,
			targetDate: row.targetDate
				? new Date(`${row.targetDate}T00:00:00.000Z`)
				: undefined,
			inflationIncluded: row.inflationIncluded,
			notes: row.notes.trim() || undefined,
		};
	});
}

const VALIDATION_MESSAGES: Record<string, string> = {
	missing_target_age: "Âge cible requis pour un objectif retraite (50–75).",
	missing_target_date: "Date cible requise pour un objectif capital.",
	unexpected_target_age: "L'âge cible ne s'applique qu'à la retraite.",
	unexpected_target_date: "La date cible ne s'applique qu'au capital.",
	invalid_target_age: "Âge cible invalide (50–75).",
	invalid_target_amount: "Montant cible invalide.",
	duplicate_id: "Identifiants en double.",
	empty_label: "Libellé requis.",
	empty_id: "Identifiant requis.",
	invalid_type: "Type d'objectif invalide.",
};

const inputClasses =
	"w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

function newId(): string {
	return `goal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function GoalsEditor({ initialGoals }: { initialGoals: FinancialGoal[] }) {
	const router = useRouter();
	const [rows, setRows] = useState<DraftGoal[]>(() => toDraft(initialGoals));
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	function updateRow(index: number, patch: Partial<DraftGoal>) {
		setRows((current) =>
			current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
		);
	}

	function addRow(type: FinancialGoalType) {
		setRows((current) => [
			...current,
			{
				id: newId(),
				label: type === "RETIREMENT_INCOME" ? "Retraite" : "Capital",
				type,
				targetAmount: type === "RETIREMENT_INCOME" ? "3000" : "100000",
				targetAge: type === "RETIREMENT_INCOME" ? "60" : "",
				targetDate:
					type === "CAPITAL_AT_DATE"
						? `${new Date().getUTCFullYear() + 10}-01-01`
						: "",
				inflationIncluded: true,
				notes: "",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, i) => i !== index));
	}

	async function save() {
		setError(null);
		const goals = fromDraft(rows);
		const validation = validateFinancialGoals(goals);
		if (!validation.ok) {
			setError(
				VALIDATION_MESSAGES[validation.reason] ??
					"Objectifs invalides — vérifie les champs.",
			);
			return;
		}

		setSaving(true);
		try {
			const response = await fetch("/api/goals", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ goals }),
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				setError(
					VALIDATION_MESSAGES[payload?.error ?? ""] ??
						payload?.error ??
						"Enregistrement impossible.",
				);
				return;
			}
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Mes objectifs</CardTitle>
			</CardHeader>
			<CardBody className="space-y-4">
				{rows.length === 0 && (
					<p className="text-sm text-zinc-500">
						Aucun objectif. Ajoute un revenu de retraite ou un capital à une
						date. Coche « Inflation comprise » si le montant est en euros
						d&apos;aujourd&apos;hui (défaut) ; décoche s&apos;il est déjà en
						euros de l&apos;horizon.
					</p>
				)}

				{rows.map((row, index) => (
					<div
						key={row.id}
						className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
					>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
								{row.type === "RETIREMENT_INCOME"
									? "Revenu de retraite"
									: "Capital à une date"}
							</span>
							<button
								type="button"
								onClick={() => removeRow(index)}
								className="text-xs text-rose-600 hover:underline dark:text-rose-400"
							>
								Supprimer
							</button>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="space-y-1 text-xs text-zinc-500">
								Libellé
								<input
									className={inputClasses}
									value={row.label}
									onChange={(e) =>
										updateRow(index, { label: e.target.value })
									}
								/>
							</label>
							<label className="space-y-1 text-xs text-zinc-500">
								{row.type === "RETIREMENT_INCOME"
									? "Revenu mensuel souhaité à la retraite"
									: "Capital souhaité"}
								<input
									className={inputClasses}
									inputMode="decimal"
									value={row.targetAmount}
									onChange={(e) =>
										updateRow(index, { targetAmount: e.target.value })
									}
								/>
								<span className="block font-normal text-zinc-400">
									{row.inflationIncluded
										? row.type === "RETIREMENT_INCOME"
											? "Équivalent de ce que ce montant permet d'acheter aujourd'hui (inflation des Réglages)."
											: "Équivalent de ce que ce capital permet d'acheter aujourd'hui (inflation des Réglages)."
										: row.type === "RETIREMENT_INCOME"
											? "Montant déjà exprimé en euros de l'horizon (pas de ré-inflation)."
											: "Capital déjà exprimé en euros de l'horizon (pas de ré-inflation)."}
								</span>
							</label>
							{row.type === "RETIREMENT_INCOME" ? (
								<label className="space-y-1 text-xs text-zinc-500">
									Âge cible
									<input
										className={inputClasses}
										inputMode="numeric"
										value={row.targetAge}
										onChange={(e) =>
											updateRow(index, { targetAge: e.target.value })
										}
									/>
								</label>
							) : (
								<label className="space-y-1 text-xs text-zinc-500">
									Date cible
									<input
										type="date"
										className={inputClasses}
										value={row.targetDate}
										onChange={(e) =>
											updateRow(index, { targetDate: e.target.value })
										}
									/>
								</label>
							)}
							<label className="flex items-center gap-2 text-xs text-zinc-500 sm:col-span-2">
								<input
									type="checkbox"
									className="size-4 rounded border-zinc-300"
									checked={row.inflationIncluded}
									onChange={(e) =>
										updateRow(index, {
											inflationIncluded: e.target.checked,
										})
									}
								/>
								<span>
									<span className="font-medium text-zinc-700 dark:text-zinc-200">
										Inflation comprise
									</span>
									<span className="ml-1 font-normal text-zinc-400">
										— montant en euros d&apos;aujourd&apos;hui ; décoche si
										c&apos;est déjà en euros de l&apos;horizon
									</span>
								</span>
							</label>
							<label className="space-y-1 text-xs text-zinc-500 sm:col-span-2">
								Notes
								<input
									className={inputClasses}
									value={row.notes}
									onChange={(e) =>
										updateRow(index, { notes: e.target.value })
									}
								/>
							</label>
						</div>
					</div>
				))}

				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={() => addRow("RETIREMENT_INCOME")}
						className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
					>
						+ Retraite (revenu)
					</button>
					<button
						type="button"
						onClick={() => addRow("CAPITAL_AT_DATE")}
						className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
					>
						+ Capital à une date
					</button>
					<button
						type="button"
						onClick={save}
						disabled={saving}
						className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
					>
						{saving ? "Enregistrement…" : "Enregistrer"}
					</button>
				</div>

				{error && (
					<p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
				)}
			</CardBody>
		</Card>
	);
}
