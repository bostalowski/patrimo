"use client";

import type { Asset, TargetAllocationCategory } from "@patrimo/core/schema";
import { validateTargetAllocations } from "@patrimo/core/target-allocation";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

type DraftRow = {
	id: string;
	category: string;
	targetPctPercent: string;
	assetIdsText: string;
};

function toDraft(rows: TargetAllocationCategory[]): DraftRow[] {
	return rows.map((row, index) => ({
		id: `saved-${index}-${row.category}`,
		category: row.category,
		targetPctPercent: String(Math.round(row.targetPct * 1000) / 10),
		assetIdsText: row.assetIds.join(", "),
	}));
}

function fromDraft(rows: DraftRow[]): TargetAllocationCategory[] {
	return rows.map((row) => ({
		category: row.category.trim(),
		targetPct: Number(row.targetPctPercent.replace(",", ".")) / 100,
		assetIds: row.assetIdsText
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean),
	}));
}

const inputClasses =
	"w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

export function AllocationPlanEditor({
	initialTargets,
	suggestion,
	assets,
}: {
	initialTargets: TargetAllocationCategory[];
	suggestion: TargetAllocationCategory[];
	assets: Asset[];
}) {
	const router = useRouter();
	const [rows, setRows] = useState<DraftRow[]>(() =>
		initialTargets.length > 0 ? toDraft(initialTargets) : [],
	);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const showBootstrap = rows.length === 0 && suggestion.length > 0;

	const sumPercent = useMemo(
		() =>
			rows.reduce((total, row) => {
				const value = Number(row.targetPctPercent.replace(",", "."));
				return Number.isFinite(value) ? total + value : total;
			}, 0),
		[rows],
	);

	function applySuggestion() {
		setRows(toDraft(suggestion));
		setError(null);
	}

	function updateRow(index: number, patch: Partial<DraftRow>) {
		setRows((current) =>
			current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
		);
	}

	function addRow() {
		setRows((current) => [
			...current,
			{
				id: `draft-${Date.now()}-${current.length}`,
				category: "",
				targetPctPercent: "0",
				assetIdsText: "",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, i) => i !== index));
	}

	async function save() {
		setError(null);
		const categories = fromDraft(rows);
		const validation = validateTargetAllocations(categories, assets);
		if (!validation.ok) {
			setError(
				validation.reason === "sum_not_one"
					? "La somme des pourcentages doit être égale à 100 %."
					: "Plan invalide — vérifie les catégories et les actifs.",
			);
			return;
		}

		setSaving(true);
		try {
			const response = await fetch("/api/target-allocation", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ categories }),
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				setError(payload?.error ?? "Enregistrement impossible.");
				return;
			}
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-4">
			{showBootstrap && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Sparkles className="h-4 w-4 text-emerald-500" />
							Proposer depuis DCA
						</CardTitle>
					</CardHeader>
					<CardBody className="flex flex-wrap items-center justify-between gap-4">
						<p className="text-sm text-zinc-500">
							Suggestion :{" "}
							{suggestion
								.map(
									(row) =>
										`${row.category} ${Math.round(row.targetPct * 100)}%`,
								)
								.join(" · ")}
						</p>
						<button
							type="button"
							onClick={applySuggestion}
							className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
						>
							Appliquer la suggestion
						</button>
					</CardBody>
				</Card>
			)}

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between gap-3">
						<CardTitle>Allocation cible</CardTitle>
						<p className="text-xs text-zinc-500">Somme {sumPercent} %</p>
					</div>
				</CardHeader>
				<CardBody className="space-y-4">
					{rows.length === 0 && !showBootstrap && (
						<p className="text-sm text-zinc-500">
							Aucune catégorie. Ajoute une ligne ou configure un plan DCA pour
							obtenir une suggestion.
						</p>
					)}

					{rows.map((row, index) => (
						<div
							key={row.id}
							className="grid gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800 sm:grid-cols-[1.2fr_0.6fr_1.4fr_auto]"
						>
							<input
								className={inputClasses}
								placeholder="Catégorie"
								value={row.category}
								onChange={(event) =>
									updateRow(index, { category: event.target.value })
								}
								aria-label={`Catégorie ${index + 1}`}
							/>
							<input
								className={inputClasses}
								placeholder="%"
								value={row.targetPctPercent}
								onChange={(event) =>
									updateRow(index, { targetPctPercent: event.target.value })
								}
								aria-label={`Pourcentage ${index + 1}`}
							/>
							<input
								className={inputClasses}
								placeholder="Actifs (virgules)"
								value={row.assetIdsText}
								onChange={(event) =>
									updateRow(index, { assetIdsText: event.target.value })
								}
								aria-label={`Actifs ${index + 1}`}
							/>
							<button
								type="button"
								onClick={() => removeRow(index)}
								className="text-sm text-rose-600 hover:underline"
							>
								Supprimer
							</button>
						</div>
					))}

					{error && (
						<p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
					)}

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={addRow}
							className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
						>
							Ajouter une catégorie
						</button>
						<button
							type="button"
							onClick={save}
							disabled={saving}
							className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
						>
							{saving ? "Enregistrement…" : "Enregistrer"}
						</button>
					</div>
				</CardBody>
			</Card>
		</div>
	);
}
