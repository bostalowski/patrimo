"use client";

import { validateDiversificationTargets } from "@patrimo/core/diversification-targets";
import type { DiversificationTarget } from "@patrimo/core/schema";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { diversificationKeyOptionsForRow } from "@/lib/diversification-key-options";

type DraftRow = {
	id: string;
	key: string;
	minPercent: string;
	maxPercent: string;
};

function toDraft(rows: DiversificationTarget[]): DraftRow[] {
	return rows.map((row, index) => ({
		id: `saved-${index}-${row.key}`,
		key: row.key,
		minPercent: String(Math.round(row.minPct * 1000) / 10),
		maxPercent: String(Math.round(row.maxPct * 1000) / 10),
	}));
}

function fromDraft(rows: DraftRow[]): DiversificationTarget[] {
	return rows.map((row) => ({
		key: row.key.trim(),
		minPct: Number(row.minPercent.replace(",", ".")) / 100,
		maxPct: Number(row.maxPercent.replace(",", ".")) / 100,
	}));
}

const inputClasses =
	"w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

export function DiversificationTargetsEditor({
	initialTargets,
}: {
	initialTargets: DiversificationTarget[];
}) {
	const router = useRouter();
	const [rows, setRows] = useState<DraftRow[]>(() => toDraft(initialTargets));
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

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
				key: "",
				minPercent: "0",
				maxPercent: "0",
			},
		]);
	}

	function removeRow(index: number) {
		setRows((current) => current.filter((_, i) => i !== index));
	}

	async function save() {
		setError(null);
		const targets = fromDraft(rows);
		const validation = validateDiversificationTargets(targets);
		if (!validation.ok) {
			setError(
				validation.reason === "overlapping_keys"
					? "Ces dimensions se chevauchent (pays et sa région)."
					: "Règles invalides — vérifie la dimension et les min/max.",
			);
			return;
		}

		setSaving(true);
		try {
			const response = await fetch("/api/diversification-targets", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ targets }),
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
		<Card>
			<CardHeader>
				<CardTitle>Cibles de diversification</CardTitle>
			</CardHeader>
			<CardBody className="space-y-4">
				{rows.length === 0 && (
					<p className="text-sm text-zinc-500">
						Aucune règle définie. Ajoute un pays, une région ou la crypto.
					</p>
				)}

				{rows.map((row, index) => {
					const otherKeys = rows
						.filter((_, i) => i !== index)
						.map((entry) => entry.key);
					const optionGroups = diversificationKeyOptionsForRow({
						currentKey: row.key,
						otherKeys,
					});

					return (
						<div
							key={row.id}
							className="grid gap-3 rounded-lg border border-zinc-100 p-3 dark:border-zinc-800 sm:grid-cols-[1.2fr_0.6fr_0.6fr_auto]"
						>
							<select
								className={inputClasses}
								value={row.key}
								onChange={(event) =>
									updateRow(index, { key: event.target.value })
								}
								aria-label={`Dimension ${index + 1}`}
							>
								<option value="">Choisir une dimension…</option>
								{optionGroups.map((group) => (
									<optgroup key={group.label} label={group.label}>
										{group.options.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</optgroup>
								))}
							</select>
							<input
								className={inputClasses}
								placeholder="Min %"
								value={row.minPercent}
								onChange={(event) =>
									updateRow(index, { minPercent: event.target.value })
								}
								aria-label={`Min ${index + 1}`}
							/>
							<input
								className={inputClasses}
								placeholder="Max %"
								value={row.maxPercent}
								onChange={(event) =>
									updateRow(index, { maxPercent: event.target.value })
								}
								aria-label={`Max ${index + 1}`}
							/>
							<button
								type="button"
								onClick={() => removeRow(index)}
								className="text-sm text-rose-600 hover:underline"
							>
								Supprimer
							</button>
						</div>
					);
				})}

				{error && (
					<p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
				)}

				<div className="flex flex-wrap gap-3">
					<button
						type="button"
						onClick={addRow}
						className="rounded-lg border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-700"
					>
						Ajouter une règle
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
	);
}
