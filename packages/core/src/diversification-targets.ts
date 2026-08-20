import {
	isGeographicRegionKey,
	isIsoCountryKey,
	normalizeGeographicRegionKey,
	regionForCountry,
} from "./geographic-exposure";
import { isSectorKey, normalizeSectorKey } from "./sector-exposure";
import type { DiversificationTarget } from "./schema";

export const DIVERSIFICATION_CRYPTO_KEY = "CRYPTO";
export const DIVERSIFICATION_BAND_TOLERANCE = 1e-3;
/** Soft drift window outside the band (2 percentage points). */
export const DIVERSIFICATION_BAND_WATCH = 0.02;

export type DiversificationBandTone = "ok" | "watch" | "breach";

export type DiversificationTargetValidation =
	| { ok: true }
	| { ok: false; reason: string };

export function normalizeDiversificationKey(key: string): string {
	const trimmed = key.trim().toUpperCase();
	if (trimmed === DIVERSIFICATION_CRYPTO_KEY) return DIVERSIFICATION_CRYPTO_KEY;
	if (isSectorKey(trimmed)) return normalizeSectorKey(trimmed);
	return normalizeGeographicRegionKey(trimmed);
}

export function isValidDiversificationKey(key: string): boolean {
	const normalized = normalizeDiversificationKey(key);
	if (normalized === DIVERSIFICATION_CRYPTO_KEY) return true;
	if (isSectorKey(normalized)) return true;
	if (isGeographicRegionKey(normalized)) return true;
	return isIsoCountryKey(normalized);
}

function isCountryKey(key: string): boolean {
	return isIsoCountryKey(key) && !isGeographicRegionKey(key);
}

function isRegionKey(key: string): boolean {
	return isGeographicRegionKey(key);
}

export function diversificationKeysOverlap(a: string, b: string): boolean {
	const left = normalizeDiversificationKey(a);
	const right = normalizeDiversificationKey(b);
	if (left === right) return true;
	if (
		left === DIVERSIFICATION_CRYPTO_KEY ||
		right === DIVERSIFICATION_CRYPTO_KEY
	) {
		return false;
	}
	if (isCountryKey(left) && isRegionKey(right)) {
		return regionForCountry(left) === right;
	}
	if (isRegionKey(left) && isCountryKey(right)) {
		return regionForCountry(right) === left;
	}
	return false;
}

export function isDiversificationKeySelectable(
	candidate: string,
	selectedKeys: readonly string[],
	editingKey?: string,
): boolean {
	if (!isValidDiversificationKey(candidate)) return false;
	const normalized = normalizeDiversificationKey(candidate);
	if (
		editingKey?.trim() &&
		normalizeDiversificationKey(editingKey) === normalized
	) {
		return true;
	}
	for (const existing of selectedKeys) {
		if (!existing.trim()) continue;
		if (normalizeDiversificationKey(existing) === normalized) return false;
		if (diversificationKeysOverlap(candidate, existing)) return false;
	}
	return true;
}

function isValidBand(minPct: number, maxPct: number): boolean {
	return (
		typeof minPct === "number" &&
		typeof maxPct === "number" &&
		Number.isFinite(minPct) &&
		Number.isFinite(maxPct) &&
		minPct >= 0 &&
		maxPct <= 1 &&
		minPct <= maxPct
	);
}

export function validateDiversificationTargets(
	targets: DiversificationTarget[],
): DiversificationTargetValidation {
	const seen: string[] = [];

	for (const target of targets) {
		if (!isValidDiversificationKey(target.key)) {
			return { ok: false, reason: "invalid_key" };
		}
		if (!isValidBand(target.minPct, target.maxPct)) {
			return { ok: false, reason: "invalid_band" };
		}

		const key = normalizeDiversificationKey(target.key);
		if (seen.includes(key)) {
			return { ok: false, reason: "duplicate_key" };
		}
		for (const previous of seen) {
			if (diversificationKeysOverlap(previous, key)) {
				return { ok: false, reason: "overlapping_keys" };
			}
		}
		seen.push(key);
	}

	return { ok: true };
}

export function isValueInDiversificationBand(
	value: number,
	minPct: number,
	maxPct: number,
): boolean {
	return (
		value >= minPct - DIVERSIFICATION_BAND_TOLERANCE &&
		value <= maxPct + DIVERSIFICATION_BAND_TOLERANCE
	);
}

/**
 * Signed distance to the nearest band edge (fraction of portfolio).
 * 0 when in-band (incl. tolerance); negative when below min; positive when above max.
 */
export function diversificationBandSignedDelta(
	value: number,
	minPct: number,
	maxPct: number,
): number {
	if (isValueInDiversificationBand(value, minPct, maxPct)) return 0;
	if (value < minPct) return value - minPct;
	return value - maxPct;
}

export function assessDiversificationBandTone(
	value: number,
	minPct: number,
	maxPct: number,
): DiversificationBandTone {
	if (isValueInDiversificationBand(value, minPct, maxPct)) return "ok";
	const absDelta = Math.abs(
		diversificationBandSignedDelta(value, minPct, maxPct),
	);
	if (absDelta <= DIVERSIFICATION_BAND_WATCH) return "watch";
	return "breach";
}

export function worseDiversificationBandTone(
	a: DiversificationBandTone,
	b: DiversificationBandTone,
): DiversificationBandTone {
	const rank: Record<DiversificationBandTone, number> = {
		ok: 0,
		watch: 1,
		breach: 2,
	};
	return rank[a] >= rank[b] ? a : b;
}

/** Excel may store 70 (percent points) or 0.7 (percentage format). */
export function diversificationPctFromExcel(
	raw: number,
	allRawValues: readonly number[],
): number {
	const storedAsPercentPoints = allRawValues.some(
		(value) => value > 1 + DIVERSIFICATION_BAND_TOLERANCE,
	);
	return storedAsPercentPoints ? raw / 100 : raw;
}

export function normalizeDiversificationTargets(
	raw: DiversificationTarget[],
): DiversificationTarget[] {
	const normalized: DiversificationTarget[] = [];

	for (const entry of raw) {
		if (!isValidDiversificationKey(entry.key)) continue;
		if (!isValidBand(entry.minPct, entry.maxPct)) continue;

		const key = normalizeDiversificationKey(entry.key);
		const overlapsExisting = normalized.some(
			(existing) =>
				existing.key === key || diversificationKeysOverlap(existing.key, key),
		);
		if (overlapsExisting) continue;

		normalized.push({ key, minPct: entry.minPct, maxPct: entry.maxPct });
	}

	return normalized;
}
