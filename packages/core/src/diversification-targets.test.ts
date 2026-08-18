import { describe, expect, it } from "vitest";
import type { DiversificationTarget } from "./schema";
import { validateDiversificationTargets } from "./diversification-targets";

function band(
	key: string,
	minPct: number,
	maxPct: number,
): DiversificationTarget {
	return { key, minPct, maxPct };
}

describe("validateDiversificationTargets", () => {
	it("accepts an empty collection", () => {
		expect(validateDiversificationTargets([])).toEqual({ ok: true });
	});

	it("accepts US plus EUROPE (country and non-parent region)", () => {
		const result = validateDiversificationTargets([
			band("US", 0.6, 0.7),
			band("EUROPE", 0.1, 0.2),
		]);
		expect(result).toEqual({ ok: true });
	});

	it("accepts two country keys that do not share a region (US and FR)", () => {
		const result = validateDiversificationTargets([
			band("US", 0.5, 0.7),
			band("FR", 0.1, 0.2),
		]);
		expect(result).toEqual({ ok: true });
	});

	it("accepts minPct equal to maxPct", () => {
		expect(validateDiversificationTargets([band("CRYPTO", 0.05, 0.05)])).toEqual(
			{ ok: true },
		);
	});

	it("accepts a plan whose minPct values sum above 1", () => {
		const result = validateDiversificationTargets([
			band("US", 0.6, 0.8),
			band("EUROPE", 0.5, 0.7),
		]);
		expect(result).toEqual({ ok: true });
	});

	it("rejects overlapping US and NORTH_AMERICA", () => {
		const result = validateDiversificationTargets([
			band("US", 0.6, 0.7),
			band("NORTH_AMERICA", 0.1, 0.2),
		]);
		expect(result).toEqual({ ok: false, reason: "overlapping_keys" });
	});

	it("rejects overlapping FR and EUROPE", () => {
		const result = validateDiversificationTargets([
			band("FR", 0.1, 0.2),
			band("EUROPE", 0.1, 0.2),
		]);
		expect(result).toEqual({ ok: false, reason: "overlapping_keys" });
	});

	it("rejects duplicate keys after normalization (us / US)", () => {
		const result = validateDiversificationTargets([
			band("us", 0.2, 0.3),
			band("US", 0.2, 0.3),
		]);
		expect(result).toEqual({ ok: false, reason: "duplicate_key" });
	});

	it("rejects an unknown key", () => {
		const result = validateDiversificationTargets([band("TECH", 0.1, 0.2)]);
		expect(result).toEqual({ ok: false, reason: "invalid_key" });
	});

	it("rejects minPct greater than maxPct", () => {
		const result = validateDiversificationTargets([band("US", 0.7, 0.6)]);
		expect(result).toEqual({ ok: false, reason: "invalid_band" });
	});

	it("rejects a band outside [0, 1]", () => {
		expect(validateDiversificationTargets([band("US", -0.1, 0.2)])).toEqual({
			ok: false,
			reason: "invalid_band",
		});
		expect(validateDiversificationTargets([band("US", 0.1, 1.2)])).toEqual({
			ok: false,
			reason: "invalid_band",
		});
	});

	it("CRYPTO does not overlap a geographic key", () => {
		const result = validateDiversificationTargets([
			band("CRYPTO", 0, 0.05),
			band("US", 0.6, 0.7),
		]);
		expect(result).toEqual({ ok: true });
	});

	it("normalizes EMERGING to OTHER and treats it as overlapping OTHER", () => {
		const result = validateDiversificationTargets([
			band("EMERGING", 0.05, 0.1),
			band("OTHER", 0.05, 0.1),
		]);
		expect(result.ok).toBe(false);
		expect(result.ok === false && result.reason).toMatch(
			/overlapping_keys|duplicate_key/,
		);
	});
});
