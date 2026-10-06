"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IrBracketBand } from "@patrimo/core/ir-bareme";
import type { FoyerFiscalConfig, FoyerIncomeSource, FoyerManualBasis } from "@patrimo/core/schema";
import type { TaxBracketObservation } from "@patrimo/core/tax-bracket";
import { TaxBracketObservationCard } from "@/components/tax-bracket-observation-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils";

const inputClasses =
	"w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

export function FoyerFiscalSection({
	config,
	observation,
	brackets,
	incomeYear,
}: {
	config: FoyerFiscalConfig | null;
	observation: TaxBracketObservation;
	brackets: IrBracketBand[];
	incomeYear: number;
}) {
	const router = useRouter();
	const [incomeSource, setIncomeSource] = useState<FoyerIncomeSource>(
		config?.incomeSource ?? "MANUAL",
	);
	const [manualAmount, setManualAmount] = useState(
		config?.manualAmount !== undefined ? String(config.manualAmount) : "",
	);
	const [manualBasis, setManualBasis] = useState<FoyerManualBasis>(
		config?.manualBasis ?? "NET_IMPOSABLE",
	);
	const [parts, setParts] = useState(config ? String(config.parts) : "1");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	async function save() {
		setError(null);
		setSaving(true);
		const amount = Number(manualAmount.replace(",", "."));
		const partsNumber = Number(parts.replace(",", "."));
		const body =
			incomeSource === "MANUAL"
				? {
						incomeSource,
						manualAmount: amount,
						manualBasis,
						parts: partsNumber,
					}
				: { incomeSource, parts: partsNumber };
		try {
			const response = await fetch("/api/foyer-fiscal", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			});
			if (!response.ok) {
				const payload = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				setError(payload?.error ?? "Enregistrement refusé.");
				return;
			}
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Foyer fiscal (indicatif)</CardTitle>
					<p className="text-xs text-zinc-500">
						Barème des revenus {incomeYear} — observation, pas une déclaration.
					</p>
				</CardHeader>
				<CardBody className="space-y-4">
					<label className="block text-sm">
						<span className="mb-1 block text-zinc-500">Source de revenu</span>
						<select
							className={inputClasses}
							value={incomeSource}
							onChange={(event) =>
								setIncomeSource(event.target.value as FoyerIncomeSource)
							}
						>
							<option value="MANUAL">Saisie manuelle</option>
							<option value="FROM_BUDGET">Depuis le Budget</option>
						</select>
					</label>
					{incomeSource === "MANUAL" && (
						<>
							<label className="block text-sm">
								<span className="mb-1 block text-zinc-500">Montant mensuel</span>
								<input
									className={inputClasses}
									value={manualAmount}
									onChange={(event) => setManualAmount(event.target.value)}
									inputMode="decimal"
								/>
							</label>
							<label className="block text-sm">
								<span className="mb-1 block text-zinc-500">Base</span>
								<select
									className={inputClasses}
									value={manualBasis}
									onChange={(event) =>
										setManualBasis(event.target.value as FoyerManualBasis)
									}
								>
									<option value="NET_IMPOSABLE">Net imposable</option>
									<option value="NET">Net</option>
									<option value="BRUT">Brut</option>
								</select>
							</label>
						</>
					)}
					<label className="block text-sm">
						<span className="mb-1 block text-zinc-500">Parts</span>
						<input
							className={inputClasses}
							value={parts}
							onChange={(event) => setParts(event.target.value)}
							inputMode="decimal"
						/>
					</label>
					{error && <p className="text-sm text-rose-600">{error}</p>}
					<button
						type="button"
						onClick={() => void save()}
						disabled={saving}
						className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
					>
						{saving ? "Enregistrement…" : "Enregistrer"}
					</button>
				</CardBody>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Barème (seuils du cache)</CardTitle>
				</CardHeader>
				<CardBody>
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-zinc-500">
								<th className="py-1">Jusqu&apos;à</th>
								<th className="py-1">Taux</th>
							</tr>
						</thead>
						<tbody>
							{brackets.map((band, index) => (
								<tr key={`${band.rate}-${index}`}>
									<td className="py-1 font-mono tabular-nums">
										{band.upperBound === null ? "Au-delà" : formatEuro(band.upperBound)}
									</td>
									<td className="py-1 font-mono tabular-nums">
										{formatPercent(band.rate)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</CardBody>
			</Card>

			<TaxBracketObservationCard observation={observation} />
		</div>
	);
}
