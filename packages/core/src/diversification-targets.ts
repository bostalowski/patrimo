import {
	isGeographicRegionKey,
	isIsoCountryKey,
	normalizeGeographicRegionKey,
	regionForCountry,
} from "./geographic-exposure";
import type { DiversificationTarget } from "./schema";

export const DIVERSIFICATION_CRYPTO_KEY = "CRYPTO";
export const DIVERSIFICATION_BAND_TOLERANCE = 1e-3;

export type DiversificationTargetValidation =
	| { ok: true }
	| { ok: false; reason: string };

export function normalizeDiversificationKey(key: string): string {
	const trimmed = key.trim().toUpperCase();
	if (trimmed === DIVERSIFICATION_CRYPTO_KEY) return DIVERSIFICATION_CRYPTO_KEY;
	return normalizeGeographicRegionKey(trimmed);
}

export function isValidDiversificationKey(key: string): boolean {
	const normalized = normalizeDiversificationKey(key);
	if (normalized === DIVERSIFICATION_CRYPTO_KEY) return true;
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
