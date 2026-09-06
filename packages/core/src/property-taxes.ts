import type { Property, PropertyTax, Workbook } from "./schema";

function isFiniteInteger(value: number): boolean {
	return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function isNonNegativeFiniteAmount(value: number): boolean {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function findProperty(properties: Property[], propertyId: string): Property {
	const property = properties.find((candidate) => candidate.id === propertyId);
	if (!property) {
		throw new Error(`Unknown property: ${propertyId}`);
	}
	return property;
}

/**
 * Validate a `PropertyTax` row before it is persisted.
 *
 * Unlike `assertPersistableManualPrice`, a future year is never rejected
 * (D9) — an anticipated tax notice can make a future amount legitimately
 * known ahead of time.
 */
function assertPersistablePropertyTax(
	properties: Property[],
	propertyTax: PropertyTax,
): void {
	findProperty(properties, propertyTax.propertyId);

	if (!isFiniteInteger(propertyTax.year)) {
		throw new Error("Property tax year is invalid");
	}
	if (!isNonNegativeFiniteAmount(propertyTax.amount)) {
		throw new Error("Property tax amount must be a non-negative finite number");
	}
}

/**
 * Normalize raw `Taxe foncière` rows: drop rows referencing an unknown
 * property or an invalid year/amount, and reduce duplicate `(propertyId,
 * year)` keys with last-valid-row-wins semantics (mirrors
 * `normalizeManualPrices`). No blocking Zod refine on the whole array (D8) —
 * a duplicate in a hand-edited workbook must never fail the whole parse.
 */
export function normalizePropertyTaxes(
	propertyTaxes: PropertyTax[],
	properties: Property[],
): PropertyTax[] {
	const knownPropertyIds = new Set(properties.map((property) => property.id));
	const byKey = new Map<string, PropertyTax>();

	for (const entry of propertyTaxes) {
		if (!knownPropertyIds.has(entry.propertyId)) continue;
		if (!isFiniteInteger(entry.year)) continue;
		if (!isNonNegativeFiniteAmount(entry.amount)) continue;

		const key = `${entry.propertyId}|${entry.year}`;
		byKey.set(key, entry);
	}

	return [...byKey.values()];
}

/**
 * Upsert a property tax row for `(propertyId, year)`. Mirrors
 * `upsertManualPrice`: a write for an existing pair replaces the amount
 * rather than being rejected as a duplicate (D8).
 */
export function upsertPropertyTax(
	workbook: Workbook,
	propertyTax: PropertyTax,
): Workbook {
	assertPersistablePropertyTax(workbook.properties, propertyTax);

	const nextPropertyTaxes = (workbook.propertyTaxes ?? []).filter(
		(entry) =>
			!(
				entry.propertyId === propertyTax.propertyId &&
				entry.year === propertyTax.year
			),
	);
	nextPropertyTaxes.push(propertyTax);

	return {
		...workbook,
		propertyTaxes: normalizePropertyTaxes(nextPropertyTaxes, workbook.properties),
	};
}

export function deletePropertyTax(
	workbook: Workbook,
	propertyId: string,
	year: number,
): Workbook {
	return {
		...workbook,
		propertyTaxes: (workbook.propertyTaxes ?? []).filter(
			(entry) => !(entry.propertyId === propertyId && entry.year === year),
		),
	};
}

/** Deletion cascade: mirrors `removeManualPricesForAssets` (Edge 4). */
export function removePropertyTaxesForProperties(
	workbook: Workbook,
	propertyIds: ReadonlySet<string>,
): Workbook {
	if (propertyIds.size === 0) return workbook;
	return {
		...workbook,
		propertyTaxes: (workbook.propertyTaxes ?? []).filter(
			(entry) => !propertyIds.has(entry.propertyId),
		),
	};
}

/**
 * Resolve the taxe foncière amount for one property and one calendar year
 * (D2 / D4 / D9):
 *
 * 1. An exact `(propertyId, year)` entry always wins, including a
 *    future-dated one (D9).
 * 2. Otherwise, carry-forward the entry with the largest year <= the
 *    requested year (D2) — no automatic escalation.
 * 3. Otherwise (no entry at all, or no entry <= the requested year), fall
 *    back to `fallback` (the flat `Property.taxeFonciere` field, D4),
 *    applied year by year rather than property by property (Edge 3).
 */
export function resolvePropertyTaxForYear(
	propertyTaxes: PropertyTax[],
	propertyId: string,
	year: number,
	fallback: number,
): number {
	let exactMatch: PropertyTax | null = null;
	let bestCarryForward: PropertyTax | null = null;

	for (const entry of propertyTaxes) {
		if (entry.propertyId !== propertyId) continue;
		if (entry.year === year) {
			exactMatch = entry;
			continue;
		}
		if (entry.year <= year) {
			if (!bestCarryForward || entry.year >= bestCarryForward.year) {
				bestCarryForward = entry;
			}
		}
	}

	if (exactMatch) return exactMatch.amount;
	if (bestCarryForward) return bestCarryForward.amount;
	return fallback;
}
