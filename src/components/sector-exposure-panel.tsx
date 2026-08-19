"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	Card,
	CardBody,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { sectorOptions } from "@/lib/sector-key-options";
import { formatEuro, formatPercent } from "@/lib/utils";
import type { SectorAllocation } from "@patrimo/core/schema";
import {
	aggregateSectorExposure,
	sectorLabel,
	type SectorSlice,
} from "@patrimo/core/sector-exposure";
import {
	isIncompleteSectorDraftSum,
	isValidSectorWeightSum,
	sumSectorDraftWeightPercents,
} from "@patrimo/core/sector-allocation";

const primaryButton =
	"rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const secondaryButton =
	"rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200";

type DraftRow = { sector: string; weightPercent: string };

function emptyDraft(): DraftRow[] {
	return [{ sector: "", weightPercent: "" }];
}

function incompleteSumLabel(draft: DraftRow[]): string | null {
	const sum = sumSectorDraftWeightPercents(
		draft.map((row) => row.weightPercent),
	);
	if (!isIncompleteSectorDraftSum(sum)) return null;
	return `${Math.round(sum * 10) / 10} % renseignés`;
}

function draftWeightRows(
	draft: DraftRow[],
): Array<{ sector: string; weight: number }> {
	return draft
		.filter((row) => row.sector.trim() && row.weightPercent.trim())
		.map((row) => ({
			sector: row.sector.trim(),
			weight: Number(row.weightPercent.replace(",", ".")) / 100,
		}))
		.filter(
			(row) =>
				row.sector && Number.isFinite(row.weight) && row.weight >= 0,
		);
}

function draftFromAllocations(allocations: SectorAllocation[]): DraftRow[] {
	if (allocations.length === 0) return emptyDraft();
	return allocations.map((row) => ({
		sector: row.sector,
		weightPercent: String(Math.round(row.weight * 1000) / 10),
	}));
}

function SliceList({ slices }: { slices: SectorSlice[] }) {
	return (
		<ul className="space-y-1 text-sm">
			{slices.map((slice) => (
				<li
					key={slice.key}
					className="flex items-center justify-between gap-4"
				>
					<span>{sectorLabel(slice.key)}</span>
					<span className="font-mono text-zinc-600 dark:text-zinc-300">
						{formatEuro(slice.marketValue)} · {formatPercent(slice.weight)}
					</span>
				</li>
			))}
		</ul>
	);
}

function ExposureBody({
	sectors,
	unmapped,
}: {
	sectors: SectorSlice[];
	unmapped?: { marketValue: number; weight: number } | null;
}) {
	if (sectors.length === 0 && !unmapped) {
		return (
			<p className="text-sm text-zinc-500">
				Aucune répartition sectorielle disponible.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			{sectors.length > 0 && <SliceList slices={sectors} />}
			{unmapped && (
				<ul className="space-y-1 text-sm">
					<li className="flex items-center justify-between gap-4">
						<span>Non renseigné</span>
						<span className="font-mono text-zinc-600 dark:text-zinc-300">
							{formatEuro(unmapped.marketValue)} ·{" "}
							{formatPercent(unmapped.weight)}
						</span>
					</li>
				</ul>
			)}
		</div>
	);
}

export function SectorExposurePanel({
	title,
	sectors,
	unmapped,
}: {
	title: string;
	sectors: SectorSlice[];
	unmapped?: { marketValue: number; weight: number } | null;
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardBody>
				<ExposureBody sectors={sectors} unmapped={unmapped} />
			</CardBody>
		</Card>
	);
}

export function AssetSectorSection({
	assetId,
	assetLabel,
	hasIsin = false,
	allocations,
	marketValue = 0,
	sectors,
}: {
	assetId: string;
	assetLabel: string;
	hasIsin?: boolean;
	allocations: SectorAllocation[];
	marketValue?: number;
	sectors: SectorSlice[];
}) {
	const router = useRouter();
	const [draft, setDraft] = useState(() => draftFromAllocations(allocations));
	const [error, setError] = useState<string | null>(null);
	const [info, setInfo] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const [localAllocations, setLocalAllocations] =
		useState<SectorAllocation[]>(allocations);

	const draftWeights = draftWeightRows(draft);
	const draftExposure =
		draftWeights.length > 0 &&
		isValidSectorWeightSum(
			draftWeights.reduce((total, row) => total + row.weight, 0),
		)
			? aggregateSectorExposure(
					[{ assetId, marketValue: marketValue > 0 ? marketValue : 1 }],
					draftWeights.map((row) => ({
						assetId,
						sector: row.sector,
						weight: row.weight,
						source: "manual" as const,
					})),
				).sectors
			: null;
	const shownSectors = draftExposure ?? sectors;

	function applyAllocations(next: SectorAllocation[]) {
		setLocalAllocations(next);
		setDraft(draftFromAllocations(next));
	}

	async function saveManual() {
		setPending(true);
		setError(null);
		setInfo(null);
		try {
			const weights = draftWeightRows(draft);
			const response = await fetch("/api/sectors", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					assetId,
					source: "manual",
					weights,
				}),
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(body?.error ?? "Enregistrement impossible");
			}
			applyAllocations(
				weights.map((row) => ({
					assetId,
					sector: row.sector,
					weight: row.weight,
					source: "manual" as const,
				})),
			);
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur");
		} finally {
			setPending(false);
		}
	}

	async function syncJustEtf(restore = false) {
		setPending(true);
		setError(null);
		setInfo(null);
		try {
			const response = await fetch("/api/sectors/sync", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ assetId, restore }),
			});
			const body = (await response.json().catch(() => null)) as {
				error?: string;
				skippedManual?: boolean;
				allocations?: SectorAllocation[];
			} | null;
			if (!response.ok) {
				throw new Error(body?.error ?? "Sync JustETF impossible");
			}
			if (body?.skippedManual) {
				setInfo(
					"Répartition manuelle conservée. Utilise « Rétablir depuis JustETF » pour écraser.",
				);
				return;
			}
			if (body?.allocations) {
				applyAllocations(body.allocations);
			}
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Erreur");
		} finally {
			setPending(false);
		}
	}

	const keyOptions = sectorOptions();
	const sumLabel = incompleteSumLabel(draft);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Exposition sectorielle</CardTitle>
			</CardHeader>
			<CardBody className="space-y-4">
				{shownSectors.length > 0 ? (
					<SliceList slices={shownSectors} />
				) : (
					<p className="text-sm text-zinc-500">
						Aucune exposition sectorielle renseignée pour {assetLabel}.
					</p>
				)}
				{hasIsin && (
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className={primaryButton}
							disabled={pending}
							onClick={() => void syncJustEtf(false)}
						>
							{localAllocations.length === 0
								? "Récupérer depuis JustETF"
								: "Sync JustETF"}
						</button>
						{localAllocations.length > 0 && (
							<button
								type="button"
								className={secondaryButton}
								disabled={pending}
								onClick={() => void syncJustEtf(true)}
							>
								Rétablir depuis JustETF
							</button>
						)}
					</div>
				)}
				<div className="space-y-3">
					<p className="text-sm font-medium">Saisie manuelle (secteur + %)</p>
					{draft.map((row, index) => (
						<div key={index} className="flex gap-2">
							<select
								aria-label={`Secteur ${index + 1}`}
								className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
								value={row.sector}
								onChange={(event) => {
									const next = [...draft];
									next[index] = { ...row, sector: event.target.value };
									setDraft(next);
								}}
							>
								<option value="">Choisir…</option>
								{keyOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
							<input
								className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
								placeholder="35"
								value={row.weightPercent}
								onChange={(event) => {
									const next = [...draft];
									next[index] = { ...row, weightPercent: event.target.value };
									setDraft(next);
								}}
							/>
						</div>
					))}
					{sumLabel && (
						<p className="text-sm text-zinc-500 dark:text-zinc-400">{sumLabel}</p>
					)}
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							className={secondaryButton}
							onClick={() =>
								setDraft([...draft, { sector: "", weightPercent: "" }])
							}
						>
							Ajouter une ligne
						</button>
						<button
							type="button"
							className={primaryButton}
							disabled={pending}
							onClick={() => void saveManual()}
						>
							Enregistrer
						</button>
					</div>
					{info && (
						<p className="text-sm text-zinc-600 dark:text-zinc-300">{info}</p>
					)}
					{error && <p className="text-sm text-red-600">{error}</p>}
				</div>
			</CardBody>
		</Card>
	);
}
