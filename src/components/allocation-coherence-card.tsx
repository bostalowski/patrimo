import type {
	DiversificationCoherenceResult,
	DiversificationCoherenceStatus,
	DiversificationFindingKind,
} from "@patrimo/core/diversification-coherence";
import { diversificationKeyLabel } from "@patrimo/core/diversification-labels";
import { isValueInDiversificationBand } from "@patrimo/core/diversification-targets";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<DiversificationCoherenceStatus, string> = {
	aligned: "Aligné",
	misaligned: "Décalé",
};

const STATUS_BADGE: Record<
	DiversificationCoherenceStatus,
	"success" | "danger"
> = {
	aligned: "success",
	misaligned: "danger",
};

const FINDING_LABEL: Record<DiversificationFindingKind, string> = {
	band_drift: "Stock hors bande",
	flow_misalign: "DCA hors bande",
};

const pctFormatter = new Intl.NumberFormat("fr-FR", {
	style: "percent",
	maximumFractionDigits: 0,
});

function fmt(value: number | null | undefined): string {
	if (value === undefined || value === null) return "—";
	return pctFormatter.format(value);
}

function fmtBand(minPct: number, maxPct: number): string {
	if (minPct === maxPct) return fmt(minPct);
	return `${pctFormatter.format(minPct)}–${pctFormatter.format(maxPct)}`;
}

export function AllocationCoherenceCard({
	coherence,
}: {
	coherence: DiversificationCoherenceResult | null;
}) {
	if (!coherence) return null;

	const hasDcaFindings = coherence.findings.some(
		(f) => f.kind === "flow_misalign",
	);

	const seenKeys = new Set<string>();
	const deduped = coherence.findings.filter((f) => {
		const key = `${f.kind}:${f.key}`;
		if (seenKeys.has(key)) return false;
		seenKeys.add(key);
		return true;
	});

	return (
		<Card className="max-w-2xl">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle>Cohérence diversification</CardTitle>
					<Badge variant={STATUS_BADGE[coherence.status]}>
						{STATUS_LABEL[coherence.status]}
					</Badge>
				</div>
				{deduped.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{deduped.map((f) => (
							<Badge key={`${f.kind}:${f.key}`} variant="danger">
								{FINDING_LABEL[f.kind]}
								{f.key ? ` · ${diversificationKeyLabel(f.key)}` : ""}
							</Badge>
						))}
					</div>
				)}
			</CardHeader>
			<CardBody>
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-zinc-100 dark:border-zinc-800">
							<th className="py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
								Dimension
							</th>
							<th className="py-2 pr-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
								Bande
							</th>
							<th className="py-2 pr-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
								Réel
							</th>
							{coherence.annualDcaTotal > 0 && (
								<th className="py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
									DCA
								</th>
							)}
						</tr>
					</thead>
					<tbody>
						{coherence.bands.map((band) => {
							const driftBad = !isValueInDiversificationBand(
								band.stockPct,
								band.minPct,
								band.maxPct,
							);
							const flowBad =
								band.flowPct !== null &&
								!isValueInDiversificationBand(
									band.flowPct,
									band.minPct,
									band.maxPct,
								);
							return (
								<tr
									key={band.key}
									className="border-b border-zinc-50 last:border-0 dark:border-zinc-800/50"
								>
									<td className="py-2 text-zinc-700 dark:text-zinc-300">
										{diversificationKeyLabel(band.key)}
									</td>
									<td className="py-2 pr-2 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
										{fmtBand(band.minPct, band.maxPct)}
									</td>
									<td
										className={`py-2 pr-2 text-right tabular-nums ${
											driftBad
												? "font-semibold text-rose-600 dark:text-rose-400"
												: "text-zinc-700 dark:text-zinc-300"
										}`}
									>
										{fmt(band.stockPct)}
									</td>
									{coherence.annualDcaTotal > 0 && (
										<td
											className={`py-2 text-right tabular-nums ${
												flowBad
													? "font-semibold text-rose-600 dark:text-rose-400"
													: "text-zinc-700 dark:text-zinc-300"
											}`}
										>
											{fmt(band.flowPct)}
										</td>
									)}
								</tr>
							);
						})}
					</tbody>
				</table>
				{hasDcaFindings && (
					<div className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
						<Link href="/investissements" className="hover:underline">
							Gérer les plans DCA →
						</Link>
					</div>
				)}
			</CardBody>
		</Card>
	);
}
