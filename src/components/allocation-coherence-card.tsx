import type {
	DiversificationCoherenceResult,
	DiversificationCoherenceStatus,
	DiversificationFinding,
	DiversificationFindingKind,
} from "@patrimo/core/diversification-coherence";
import { diversificationKeyLabel } from "@patrimo/core/diversification-labels";
import {
	assessDiversificationBandTone,
	diversificationBandSignedDelta,
	type DiversificationBandTone,
} from "@patrimo/core/diversification-targets";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<DiversificationCoherenceStatus, string> = {
	aligned: "Aligné",
	watch: "À surveiller",
	misaligned: "Décalé",
};

const STATUS_BADGE: Record<
	DiversificationCoherenceStatus,
	"success" | "warning" | "danger"
> = {
	aligned: "success",
	watch: "warning",
	misaligned: "danger",
};

const FINDING_LABEL: Record<
	DiversificationFindingKind,
	Record<"watch" | "breach", string>
> = {
	band_drift: {
		watch: "Stock à surveiller",
		breach: "Stock hors bande",
	},
	flow_misalign: {
		watch: "DCA à surveiller",
		breach: "DCA hors bande",
	},
};

const TONE_TEXT: Record<DiversificationBandTone, string> = {
	ok: "text-zinc-700 dark:text-zinc-300",
	watch: "font-semibold text-amber-700 dark:text-amber-400",
	breach: "font-semibold text-rose-600 dark:text-rose-400",
};

const pctFormatter = new Intl.NumberFormat("fr-FR", {
	style: "percent",
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

const ppFormatter = new Intl.NumberFormat("fr-FR", {
	signDisplay: "exceptZero",
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

function fmt(value: number | null | undefined): string {
	if (value === undefined || value === null) return "—";
	return pctFormatter.format(value);
}

function fmtBand(minPct: number, maxPct: number): string {
	if (minPct === maxPct) return fmt(minPct);
	return `${pctFormatter.format(minPct)}–${pctFormatter.format(maxPct)}`;
}

function fmtDelta(delta: number): string | null {
	if (delta === 0) return null;
	return `${ppFormatter.format(delta * 100)} pp`;
}

function findingLabel(f: DiversificationFinding): string {
	return FINDING_LABEL[f.kind][f.tone];
}

function ValueCell({
	value,
	minPct,
	maxPct,
}: {
	value: number | null;
	minPct: number;
	maxPct: number;
}) {
	if (value === null) {
		return <span className="text-zinc-700 dark:text-zinc-300">—</span>;
	}
	const tone = assessDiversificationBandTone(value, minPct, maxPct);
	const delta = diversificationBandSignedDelta(value, minPct, maxPct);
	const deltaLabel = fmtDelta(delta);
	return (
		<span className={`inline-flex flex-col items-end leading-tight ${TONE_TEXT[tone]}`}>
			<span>{fmt(value)}</span>
			{deltaLabel && (
				<span className="text-[11px] font-medium opacity-90">{deltaLabel}</span>
			)}
		</span>
	);
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
							<Badge
								key={`${f.kind}:${f.key}`}
								variant={f.tone === "watch" ? "warning" : "danger"}
							>
								{findingLabel(f)}
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
						{coherence.bands.map((band) => (
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
								<td className="py-2 pr-2 text-right tabular-nums">
									<ValueCell
										value={band.stockPct}
										minPct={band.minPct}
										maxPct={band.maxPct}
									/>
								</td>
								{coherence.annualDcaTotal > 0 && (
									<td className="py-2 text-right tabular-nums">
										<ValueCell
											value={band.flowPct}
											minPct={band.minPct}
											maxPct={band.maxPct}
										/>
									</td>
								)}
							</tr>
						))}
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
