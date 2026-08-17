import type { Asset, TargetAllocationCategory, Workbook } from "./schema";

export const TARGET_PCT_SUM_TOLERANCE = 1e-3;

/** Excel may store 70 (percent points) or 0.7 (percentage format). */
export function targetPctFromExcel(
	raw: number,
	allRawValues: readonly number[],
): number {
	const storedAsPercentPoints = allRawValues.some(
		(v) => v > 1 + TARGET_PCT_SUM_TOLERANCE,
	);
	return storedAsPercentPoints ? raw / 100 : raw;
}

export function isValidTargetPctSum(sum: number): boolean {
	return Math.abs(sum - 1) <= TARGET_PCT_SUM_TOLERANCE;
}

export type TargetAllocationValidation =
	| { ok: true }
	| { ok: false; reason: string };

export function validateTargetAllocations(
	targets: TargetAllocationCategory[],
	assets: Asset[],
): TargetAllocationValidation {
	if (targets.length === 0) {
		return { ok: false, reason: "empty" };
	}

	const known = new Set(assets.map((a) => a.id));
	const labels = new Set<string>();
	const seenAssets = new Set<string>();
	let sum = 0;

	for (const entry of targets) {
		const category = entry.category.trim();
		if (!category) {
			return { ok: false, reason: "empty_category" };
		}
		if (labels.has(category)) {
			return { ok: false, reason: "duplicate_category" };
		}
		labels.add(category);

		if (
			typeof entry.targetPct !== "number" ||
			!Number.isFinite(entry.targetPct) ||
			entry.targetPct <= 0
		) {
			return { ok: false, reason: "invalid_target_pct" };
		}
		sum += entry.targetPct;

		if (entry.assetIds.length === 0) {
			return { ok: false, reason: "empty_assets" };
		}
		for (const rawId of entry.assetIds) {
			const id = rawId.trim();
			if (!id || !known.has(id)) {
				return { ok: false, reason: "unknown_asset" };
			}
			if (seenAssets.has(id)) {
				return { ok: false, reason: "duplicate_asset" };
			}
			seenAssets.add(id);
		}
	}

	if (!isValidTargetPctSum(sum)) {
		return { ok: false, reason: "sum_not_one" };
	}
	return { ok: true };
}

export function normalizeTargetAllocations(
	raw: TargetAllocationCategory[],
	assets: Asset[],
): TargetAllocationCategory[] {
	const knownAssetIds = new Set(assets.map((a) => a.id));
	const seen = new Set<string>();
	const assignedAssets = new Set<string>();

	const normalized: TargetAllocationCategory[] = [];

	for (const entry of raw) {
		const category = entry.category.trim();
		if (!category) continue;
		if (seen.has(category)) continue;
		seen.add(category);

		const assetIds = entry.assetIds
			.map((id) => id.trim())
			.filter(
				(id) =>
					id.length > 0 && knownAssetIds.has(id) && !assignedAssets.has(id),
			);

		for (const id of assetIds) {
			assignedAssets.add(id);
		}

		if (
			typeof entry.targetPct !== "number" ||
			!Number.isFinite(entry.targetPct) ||
			entry.targetPct <= 0
		) {
			continue;
		}

		normalized.push({ category, targetPct: entry.targetPct, assetIds });
	}

	return normalized;
}

export function removeTargetAllocationEntriesForAssets(
	workbook: Workbook,
	assetIds: ReadonlySet<string>,
): Workbook {
	if (assetIds.size === 0) return workbook;
	return {
		...workbook,
		targetAllocations: (workbook.targetAllocations ?? []).map((entry) => ({
			...entry,
			assetIds: entry.assetIds.filter((id) => !assetIds.has(id)),
		})),
	};
}
