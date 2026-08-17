import { isValidGeographicWeightSum } from "./geographic-allocation";
import type { AssetPosition } from "./portfolio";
import type {
	DcaConfig,
	GeographicAllocation,
	TargetAllocationCategory,
} from "./schema";
import { isValidTargetPctSum } from "./target-allocation";

export type AllocationFindingKind =
	| "category_drift"
	| "flow_misalign"
	| "unmapped_stock"
	| "geo_coverage_gap";

export type AllocationFinding = {
	kind: AllocationFindingKind;
	categoryLabel?: string;
};

export type AllocationCoherenceStatus = "aligned" | "watch" | "misaligned";

export type AllocationCategoryResult = {
	category: string;
	targetPct: number;
	stockPct: number | undefined;
	flowPct: number | null;
};

export type AllocationCoherenceResult = {
	categories: AllocationCategoryResult[];
	findings: AllocationFinding[];
	status: AllocationCoherenceStatus;
	liquidInvested: number;
	annualDcaTotal: number;
};

const DRIFT_THRESHOLD = 0.05;
const UNMAPPED_THRESHOLD = 0.05;
const GEO_COVERAGE_GAP_THRESHOLD = 0.25;

export function annualizeDcaAmount(
	amount: number,
	frequency: DcaConfig["frequency"],
): number {
	if (frequency === "MENSUEL") return amount * 12;
	if (frequency === "TRIMESTRIEL") return amount * 4;
	return amount;
}

export function computeFlowMixByAsset(dca: DcaConfig[]): Map<string, number> {
	const result = new Map<string, number>();
	for (const config of dca) {
		const annual = annualizeDcaAmount(config.amount, config.frequency);
		for (const line of config.lines) {
			const lineAnnual = annual * line.targetPct;
			const perAsset =
				line.assetIds.length > 0 ? lineAnnual / line.assetIds.length : 0;
			for (const assetId of line.assetIds) {
				result.set(assetId, (result.get(assetId) ?? 0) + perAsset);
			}
		}
	}
	return result;
}

export function assessAllocationCoherence(params: {
	targets: TargetAllocationCategory[];
	positions: AssetPosition[];
	dca: DcaConfig[];
	geographicAllocations: GeographicAllocation[];
}): AllocationCoherenceResult | null {
	const { targets, positions, dca, geographicAllocations } = params;

	if (targets.length === 0) return null;

	const targetSum = targets.reduce((s, t) => s + t.targetPct, 0);
	if (!isValidTargetPctSum(targetSum)) return null;

	const liquidPositions = positions.filter((p) => p.marketValue > 0);
	const liquidInvested = liquidPositions.reduce((s, p) => s + p.marketValue, 0);

	const flowByAsset = computeFlowMixByAsset(dca);
	const annualDcaTotal = Array.from(flowByAsset.values()).reduce(
		(s, v) => s + v,
		0,
	);

	const mappedAssetIds = new Set<string>();
	for (const cat of targets) {
		for (const id of cat.assetIds) {
			mappedAssetIds.add(id);
		}
	}

	const findings: AllocationFinding[] = [];
	const categories: AllocationCategoryResult[] = [];

	for (const cat of targets) {
		const catMv = cat.assetIds.reduce((s, id) => {
			const pos = liquidPositions.find((p) => p.assetId === id);
			return s + (pos?.marketValue ?? 0);
		}, 0);

		const stockPct = liquidInvested > 0 ? catMv / liquidInvested : undefined;

		const catFlow = cat.assetIds.reduce(
			(s, id) => s + (flowByAsset.get(id) ?? 0),
			0,
		);
		const flowPct = annualDcaTotal > 0 ? catFlow / annualDcaTotal : null;

		categories.push({
			category: cat.category,
			targetPct: cat.targetPct,
			stockPct,
			flowPct,
		});

		if (
			stockPct !== undefined &&
			Math.abs(stockPct - cat.targetPct) >= DRIFT_THRESHOLD
		) {
			findings.push({ kind: "category_drift", categoryLabel: cat.category });
		}

		if (
			flowPct !== null &&
			Math.abs(flowPct - cat.targetPct) >= DRIFT_THRESHOLD
		) {
			findings.push({ kind: "flow_misalign", categoryLabel: cat.category });
		}
	}

	if (liquidInvested > 0) {
		const unmappedMv = liquidPositions
			.filter((p) => !mappedAssetIds.has(p.assetId))
			.reduce((s, p) => s + p.marketValue, 0);
		if (unmappedMv / liquidInvested >= UNMAPPED_THRESHOLD) {
			findings.push({ kind: "unmapped_stock" });
		}
	}

	const geoAssetIds = new Set(
		geographicAllocations
			.filter((g) => {
				const assetRows = geographicAllocations.filter(
					(r) => r.assetId === g.assetId,
				);
				const sum = assetRows.reduce((s, r) => s + r.weight, 0);
				return isValidGeographicWeightSum(sum);
			})
			.map((g) => g.assetId),
	);
	const coveredMv = liquidPositions
		.filter((p) => geoAssetIds.has(p.assetId))
		.reduce((s, p) => s + p.marketValue, 0);
	if (
		liquidInvested > 0 &&
		(liquidInvested - coveredMv) / liquidInvested >= GEO_COVERAGE_GAP_THRESHOLD
	) {
		findings.push({ kind: "geo_coverage_gap" });
	}

	const hasMisaligned = findings.some(
		(f) =>
			f.kind === "category_drift" ||
			f.kind === "flow_misalign" ||
			f.kind === "unmapped_stock",
	);
	const status: AllocationCoherenceStatus = hasMisaligned
		? "misaligned"
		: findings.length > 0
			? "watch"
			: "aligned";

	return { categories, findings, status, liquidInvested, annualDcaTotal };
}

function assetSetKey(assetIds: string[]): string {
	return [...assetIds]
		.map((id) => id.trim())
		.filter(Boolean)
		.sort()
		.join(",");
}

export function suggestTargetPlanFromDca(
	dca: DcaConfig[],
): TargetAllocationCategory[] {
	type Candidate = {
		label: string;
		assetIds: string[];
		annualEUR: number;
	};

	const merged = new Map<string, Candidate>();

	for (const config of dca) {
		const annual = annualizeDcaAmount(config.amount, config.frequency);
		if (annual <= 0) continue;
		for (const line of config.lines) {
			const assetIds = line.assetIds.map((id) => id.trim()).filter(Boolean);
			if (assetIds.length === 0 || line.targetPct <= 0) continue;
			const lineAnnual = annual * line.targetPct;
			if (lineAnnual <= 0) continue;
			const key = assetSetKey(assetIds);
			const label = line.label?.trim() || config.label.trim() || key;
			const existing = merged.get(key);
			if (existing) {
				existing.annualEUR += lineAnnual;
			} else {
				merged.set(key, {
					label,
					assetIds: [...new Set(assetIds)],
					annualEUR: lineAnnual,
				});
			}
		}
	}

	const candidates = Array.from(merged.values()).sort(
		(a, b) => b.annualEUR - a.annualEUR,
	);
	const claimed = new Set<string>();
	const claimedCategories: Candidate[] = [];

	for (const candidate of candidates) {
		const remaining = candidate.assetIds.filter((id) => !claimed.has(id));
		if (remaining.length === 0) continue;
		for (const id of remaining) {
			claimed.add(id);
		}
		claimedCategories.push({
			label: candidate.label,
			assetIds: remaining,
			annualEUR: candidate.annualEUR,
		});
	}

	const total = claimedCategories.reduce((s, c) => s + c.annualEUR, 0);
	if (total <= 0) return [];

	const labelsUsed = new Set<string>();
	return claimedCategories.map((c) => {
		let category = c.label;
		if (labelsUsed.has(category)) {
			category = `${category} (${c.assetIds[0]})`;
		}
		labelsUsed.add(category);
		return {
			category,
			targetPct: c.annualEUR / total,
			assetIds: c.assetIds,
		};
	});
}
