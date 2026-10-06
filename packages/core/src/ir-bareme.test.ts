import { describe, expect, it } from "vitest";
import {
	effectiveIrBaremeSeries,
	FRAIS_PRO_ABATEMENT_RATE,
	FRAIS_PRO_MAX_EURO,
	FRAIS_PRO_MIN_EURO,
	IR_BAREME_SEED,
	mergeIrBaremeSeries,
	resolveLatestIrBareme,
	type IrBaremeTable,
} from "./ir-bareme";

const BAREME_2025: IrBaremeTable = {
	effectiveFrom: "2025-01-01",
	incomeYear: 2025,
	brackets: [
		{ upperBound: 11_600, rate: 0 },
		{ upperBound: 29_579, rate: 0.11 },
		{ upperBound: 84_577, rate: 0.3 },
		{ upperBound: 181_917, rate: 0.41 },
		{ upperBound: null, rate: 0.45 },
	],
};

describe("IR barème series helpers (seed / merge / resolve)", () => {
	it("embeds frais-pro min/max for seed year 2025 (D15)", () => {
		expect(FRAIS_PRO_ABATEMENT_RATE).toBe(0.1);
		expect(FRAIS_PRO_MIN_EURO).toBe(509);
		expect(FRAIS_PRO_MAX_EURO).toBe(14_555);
	});

	it("seed includes revenus-2025 official thresholds (≤11600 / 29579 / 84577 / 181917 / 45%)", () => {
		expect(IR_BAREME_SEED.length).toBeGreaterThanOrEqual(1);
		const latest = resolveLatestIrBareme(IR_BAREME_SEED);
		expect(latest.incomeYear).toBe(2025);
		expect(latest.brackets.map((b) => b.upperBound)).toEqual([
			11_600,
			29_579,
			84_577,
			181_917,
			null,
		]);
		expect(latest.brackets.map((b) => b.rate)).toEqual([0, 0.11, 0.3, 0.41, 0.45]);
	});

	it("resolveLatestIrBareme picks the chronologically latest effectiveFrom (D7)", () => {
		const older: IrBaremeTable = {
			...BAREME_2025,
			effectiveFrom: "2024-01-01",
			incomeYear: 2024,
			brackets: [
				{ upperBound: 10_777, rate: 0 },
				{ upperBound: null, rate: 0.45 },
			],
		};
		const newer: IrBaremeTable = {
			...BAREME_2025,
			effectiveFrom: "2026-01-01",
			incomeYear: 2026,
		};
		const latest = resolveLatestIrBareme([BAREME_2025, newer, older]);
		expect(latest.effectiveFrom).toBe("2026-01-01");
		expect(latest.incomeYear).toBe(2026);
	});

	it("mergeIrBaremeSeries unions by effectiveFrom; incoming wins on conflict", () => {
		const base: IrBaremeTable[] = [BAREME_2025];
		const incoming: IrBaremeTable[] = [
			{
				...BAREME_2025,
				brackets: [
					{ upperBound: 12_000, rate: 0 },
					{ upperBound: null, rate: 0.45 },
				],
			},
			{
				effectiveFrom: "2026-01-01",
				incomeYear: 2026,
				brackets: BAREME_2025.brackets,
			},
		];
		const merged = mergeIrBaremeSeries(base, incoming);
		expect(merged).toHaveLength(2);
		expect(merged.find((t) => t.effectiveFrom === "2025-01-01")?.brackets[0].upperBound).toBe(
			12_000,
		);
		expect(merged.find((t) => t.effectiveFrom === "2026-01-01")?.incomeYear).toBe(2026);
	});

	it("effectiveIrBaremeSeries merges cache over the embedded seed", () => {
		const cache: IrBaremeTable[] = [
			{
				effectiveFrom: "2099-01-01",
				incomeYear: 2099,
				brackets: [
					{ upperBound: 1, rate: 0 },
					{ upperBound: null, rate: 0.99 },
				],
			},
		];
		const effective = effectiveIrBaremeSeries(cache);
		expect(resolveLatestIrBareme(effective).incomeYear).toBe(2099);
		expect(effectiveIrBaremeSeries()).toEqual(IR_BAREME_SEED);
		expect(effectiveIrBaremeSeries([])).toEqual(IR_BAREME_SEED);
	});

	it("resolveLatestIrBareme throws on empty series after skipping junk tables", () => {
		expect(() => resolveLatestIrBareme([])).toThrow(/empty series/);
		expect(() =>
			resolveLatestIrBareme([
				{ effectiveFrom: "", incomeYear: 2025, brackets: BAREME_2025.brackets },
				{ effectiveFrom: "2026-01-01", incomeYear: 2026, brackets: [] },
				{
					effectiveFrom: "2027-01-01",
					incomeYear: 2027,
					brackets: null as unknown as IrBaremeTable["brackets"],
				},
			]),
		).toThrow(/empty series/);
	});

	it("merge skips tables with empty brackets so a later dated empty table cannot win", () => {
		const emptyNewer: IrBaremeTable = {
			effectiveFrom: "2099-01-01",
			incomeYear: 2099,
			brackets: [],
		};
		const merged = mergeIrBaremeSeries([BAREME_2025], [emptyNewer]);
		expect(resolveLatestIrBareme(merged).effectiveFrom).toBe("2025-01-01");
		expect(resolveLatestIrBareme(merged).incomeYear).toBe(2025);
	});
});
