import type {
	AllocationCoherenceResult,
	AllocationCoherenceStatus,
	AllocationFindingKind,
} from "@patrimo/core/allocation-coherence";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<AllocationCoherenceStatus, string> = {
	aligned: "Aligné",
	watch: "À surveiller",
	misaligned: "Décalé",
};

const STATUS_BADGE: Record<
	AllocationCoherenceStatus,
	"success" | "warning" | "danger"
> = {
	aligned: "success",
	watch: "warning",
	misaligned: "danger",
};

const FINDING_LABEL: Record<AllocationFindingKind, string> = {
	category_drift: "Stock décalé",
	flow_misalign: "DCA décalé",
	unmapped_stock: "Actifs non ciblés",
	geo_coverage_gap: "Géo incomplète",
};

const pctFormatter = new Intl.NumberFormat("fr-FR", {
	style: "percent",
	maximumFractionDigits: 0,
});

function fmt(value: number | null | undefined): string {
	if (value === undefined || value === null) return "—";
	return pctFormatter.format(value);
}

function findingVariant(kind: AllocationFindingKind): "danger" | "warning" {
	return kind === "geo_coverage_gap" ? "warning" : "danger";
}

export function AllocationCoherenceCard({
	coherence,
}: {
	coherence: AllocationCoherenceResult | null;
}) {
	if (!coherence) return null;

	const hasDcaFindings = coherence.findings.some(
		(f) => f.kind === "flow_misalign",
	);
	const hasGeoFindings = coherence.findings.some(
		(f) => f.kind === "geo_coverage_gap",
	);

	const seenKeys = new Set<string>();
	const deduped = coherence.findings.filter((f) => {
		const key = `${f.kind}:${f.categoryLabel ?? ""}`;
		if (seenKeys.has(key)) return false;
		seenKeys.add(key);
		return true;
	});

	return (
		<Card className="max-w-2xl">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle>Cohérence d&apos;allocation</CardTitle>
					<div className="flex items-center gap-2">
						<Link
							href="/investissements"
							className="text-xs font-medium text-zinc-500 hover:underline dark:text-zinc-400"
						>
							Modifier
						</Link>
						<Badge variant={STATUS_BADGE[coherence.status]}>
							{STATUS_LABEL[coherence.status]}
						</Badge>
					</div>
				</div>
				{deduped.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{deduped.map((f) => (
							<Badge
								key={`${f.kind}:${f.categoryLabel ?? ""}`}
								variant={findingVariant(f.kind)}
							>
								{FINDING_LABEL[f.kind]}
								{f.categoryLabel ? ` · ${f.categoryLabel}` : ""}
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
								Catégorie
							</th>
							<th className="py-2 pr-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
								Cible
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
						{coherence.categories.map((cat) => {
							const driftBad =
								cat.stockPct !== undefined &&
								Math.abs(cat.stockPct - cat.targetPct) >= 0.05;
							const flowBad =
								cat.flowPct !== null &&
								Math.abs(cat.flowPct - cat.targetPct) >= 0.05;
							return (
								<tr
									key={cat.category}
									className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0"
								>
									<td className="py-2 text-zinc-700 dark:text-zinc-300">
										{cat.category}
									</td>
									<td className="py-2 pr-2 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
										{fmt(cat.targetPct)}
									</td>
									<td
										className={`py-2 pr-2 text-right tabular-nums ${
											driftBad
												? "font-semibold text-rose-600 dark:text-rose-400"
												: "text-zinc-700 dark:text-zinc-300"
										}`}
									>
										{fmt(cat.stockPct)}
									</td>
									{coherence.annualDcaTotal > 0 && (
										<td
											className={`py-2 text-right tabular-nums ${
												flowBad
													? "font-semibold text-rose-600 dark:text-rose-400"
													: "text-zinc-700 dark:text-zinc-300"
											}`}
										>
											{fmt(cat.flowPct)}
										</td>
									)}
								</tr>
							);
						})}
					</tbody>
				</table>
				<div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400 dark:text-zinc-500">
					{hasDcaFindings && (
						<Link href="/investissements" className="hover:underline">
							Gérer les plans DCA →
						</Link>
					)}
					{hasGeoFindings && (
						<Link href="/geographie" className="hover:underline">
							Compléter la géographie →
						</Link>
					)}
				</div>
			</CardBody>
		</Card>
	);
}
