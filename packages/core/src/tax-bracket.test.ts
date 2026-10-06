import { describe, expect, it } from "vitest";
import { effectiveIrBaremeSeries, IR_BAREME_SEED } from "./ir-bareme";
import {
	computeTauxPrelevementConseille,
	observeTaxBracket,
	type FoyerFiscalConfig,
	type TaxBracketObservationOk,
} from "./tax-bracket";
import type { BudgetLine } from "./schema";
import { FoyerFiscalConfigSchema } from "./schema";

function ok(result: ReturnType<typeof observeTaxBracket>): TaxBracketObservationOk {
	expect(result.status).toBe("ok");
	return result as TaxBracketObservationOk;
}

const seedSeries = () => effectiveIrBaremeSeries();

function revenu(partial: Partial<BudgetLine> & Pick<BudgetLine, "id" | "amount">): BudgetLine {
	return {
		label: partial.label ?? "Salaire",
		kind: "REVENU",
		frequency: partial.frequency ?? "MENSUEL",
		category: partial.category ?? "SALAIRE",
		...partial,
	};
}

describe("observeTaxBracket — MANUAL / NET_IMPOSABLE (N1, N8, N11)", () => {
	const config: FoyerFiscalConfig = {
		incomeSource: "MANUAL",
		manualBasis: "NET_IMPOSABLE",
		manualAmount: 2_500,
		parts: 1,
	};

	it("N1: annual RNI = monthly×12, quotient, TMI 30%, tranche bounds + room", () => {
		const r = ok(observeTaxBracket({ config, baremeSeries: seedSeries() }));
		expect(r.rniAnnuel).toBe(30_000);
		expect(r.quotient).toBe(30_000);
		expect(r.tmi).toBe(0.3);
		expect(r.trancheLower).toBe(29_579);
		expect(r.trancheUpper).toBe(84_577);
		expect(r.roomToNextBracket).toBeCloseTo(84_577 - 30_000, 2);
		expect(r.strongerDisclaimer).toBe(false);
	});

	it("N11: progressive IR ≈ 2103.99 (not 30000×30%); PAS ≈ 7.0% < TMI", () => {
		const r = ok(observeTaxBracket({ config, baremeSeries: seedSeries() }));
		expect(r.irAnnuelIndicatif).toBeCloseTo(2_103.99, 2);
		expect(r.irAnnuelIndicatif).not.toBeCloseTo(9_000, 0);
		expect(r.irMensuelIndicatif).toBeCloseTo(2_103.99 / 12, 2);
		expect(r.tauxPrelevementConseille).toBeCloseTo(2_103.99 / 30_000, 4);
		expect(r.tauxPrelevementConseille!).toBeLessThan(r.tmi);
		expect(r.incomeYear).toBe(2025);
	});

	it("N8: irMensuel = irAnnuel/12 and PAS = IR/assiettePas distinct from TMI", () => {
		const r = ok(observeTaxBracket({ config, baremeSeries: seedSeries() }));
		expect(r.irMensuelIndicatif).toBeCloseTo(r.irAnnuelIndicatif / 12, 6);
		expect(r.assiettePas).toBe(30_000);
		expect(r.tauxPrelevementConseille).toBeCloseTo(
			r.irAnnuelIndicatif / r.assiettePas,
			6,
		);
		expect(r.tauxPrelevementConseille).not.toBe(r.tmi);
	});
});

describe("observeTaxBracket — MANUAL / BRUT (N2)", () => {
	it("applies 10% frais-pro clamp then TMI/tranche on RNI", () => {
		const r = ok(
			observeTaxBracket({
				config: {
					incomeSource: "MANUAL",
					manualBasis: "BRUT",
					manualAmount: 4_000,
					parts: 1,
				},
				baremeSeries: seedSeries(),
			}),
		);
		// 48000 − clamp(4800, 509, 14555) = 43200
		expect(r.rniAnnuel).toBe(43_200);
		expect(r.tmi).toBe(0.3);
		expect(r.assiettePas).toBeCloseTo(48_000 * (1 - 0.22), 2);
		expect(r.strongerDisclaimer).toBe(false);
	});
});

describe("observeTaxBracket — MANUAL / NET (N3)", () => {
	it("annualizes without 10% abatement; stronger disclaimer", () => {
		const r = ok(
			observeTaxBracket({
				config: {
					incomeSource: "MANUAL",
					manualBasis: "NET",
					manualAmount: 4_000,
					parts: 1,
				},
				baremeSeries: seedSeries(),
			}),
		);
		expect(r.rniAnnuel).toBe(48_000);
		expect(r.strongerDisclaimer).toBe(true);
		expect(r.irAnnuelIndicatif).toBeGreaterThan(2_103.99);
	});
});

describe("observeTaxBracket — FROM_BUDGET (N4, E1, E7)", () => {
	it("N4: sums all REVENU lines via monthlyAmount×12 as NET proxy (incl. LOCATIF)", () => {
		const budget: BudgetLine[] = [
			revenu({ id: "s", amount: 2_000, category: "SALAIRE" }),
			revenu({ id: "l", amount: 500, category: "LOCATIF" }),
			{
				id: "d",
				label: "Loyer",
				kind: "DEPENSE",
				amount: 800,
				frequency: "MENSUEL",
				category: "LOGEMENT",
			},
		];
		const r = ok(
			observeTaxBracket({
				config: { incomeSource: "FROM_BUDGET", parts: 1 },
				budget,
				baremeSeries: seedSeries(),
			}),
		);
		expect(r.rniAnnuel).toBe(30_000);
		expect(r.tmi).toBe(0.3);
		expect(r.strongerDisclaimer).toBe(true);
	});

	it("E1: no REVENU / zero annualized → incomplete (no invented TMI/IR/PAS)", () => {
		const result = observeTaxBracket({
			config: { incomeSource: "FROM_BUDGET", parts: 1 },
			budget: [
				{
					id: "d",
					label: "Loyer",
					kind: "DEPENSE",
					amount: 800,
					frequency: "MENSUEL",
					category: "LOGEMENT",
				},
			],
			baremeSeries: seedSeries(),
		});
		expect(result).toEqual({ status: "incomplete", reason: "no_revenu" });
	});

	it("E7: Budget REVENU changes move observation; MANUAL ignores Budget", () => {
		const low = [
			revenu({ id: "s", amount: 2_000, category: "SALAIRE" }),
		];
		const high = [
			revenu({ id: "s", amount: 3_000, category: "SALAIRE" }),
		];
		const fromBudgetLow = ok(
			observeTaxBracket({
				config: { incomeSource: "FROM_BUDGET", parts: 1 },
				budget: low,
				baremeSeries: seedSeries(),
			}),
		);
		const fromBudgetHigh = ok(
			observeTaxBracket({
				config: { incomeSource: "FROM_BUDGET", parts: 1 },
				budget: high,
				baremeSeries: seedSeries(),
			}),
		);
		expect(fromBudgetLow.tmi).toBe(0.11);
		expect(fromBudgetHigh.tmi).toBe(0.3);

		const manual = ok(
			observeTaxBracket({
				config: {
					incomeSource: "MANUAL",
					manualBasis: "NET_IMPOSABLE",
					manualAmount: 2_500,
					parts: 1,
				},
				budget: high,
				baremeSeries: seedSeries(),
			}),
		);
		expect(manual.rniAnnuel).toBe(30_000);
		expect(manual.tmi).toBe(0.3);
	});
});

describe("observeTaxBracket — parts / quotient (N7)", () => {
	it("2 parts vs 1 changes quotient, TMI, IR, PAS; half-part 1.5 accepted at observe", () => {
		const base = {
			incomeSource: "MANUAL" as const,
			manualBasis: "NET_IMPOSABLE" as const,
			manualAmount: 2_500,
		};
		const one = ok(
			observeTaxBracket({
				config: { ...base, parts: 1 },
				baremeSeries: seedSeries(),
			}),
		);
		const two = ok(
			observeTaxBracket({
				config: { ...base, parts: 2 },
				baremeSeries: seedSeries(),
			}),
		);
		expect(two.quotient).toBe(15_000);
		expect(two.tmi).toBe(0.11);
		expect(two.irAnnuelIndicatif).toBeLessThan(one.irAnnuelIndicatif);
		expect(two.tauxPrelevementConseille!).toBeLessThan(one.tauxPrelevementConseille!);

		const half = ok(
			observeTaxBracket({
				config: { ...base, parts: 1.5 },
				baremeSeries: seedSeries(),
			}),
		);
		expect(half.quotient).toBeCloseTo(30_000 / 1.5, 6);
		expect(half.tmi).toBe(0.11);
	});
});

describe("observeTaxBracket — zero IR (N9)", () => {
	it("IR 0 → PAS 0 and irMensuel 0 (configured, not error)", () => {
		const r = ok(
			observeTaxBracket({
				config: {
					incomeSource: "MANUAL",
					manualBasis: "NET_IMPOSABLE",
					manualAmount: 500,
					parts: 1,
				},
				baremeSeries: seedSeries(),
			}),
		);
		expect(r.rniAnnuel).toBe(6_000);
		expect(r.tmi).toBe(0);
		expect(r.irAnnuelIndicatif).toBe(0);
		expect(r.irMensuelIndicatif).toBe(0);
		expect(r.tauxPrelevementConseille).toBe(0);
	});
});

describe("observeTaxBracket — edges E5 E6 E8", () => {
	it("E5: quotient exactly on bracket upper bound → TMI of the band that bound closes", () => {
		// 29579/12 ≈ 2464.9167 → use RNI = 29579 exactly via monthly = 29579/12
		const r = ok(
			observeTaxBracket({
				config: {
					incomeSource: "MANUAL",
					manualBasis: "NET_IMPOSABLE",
					manualAmount: 29_579 / 12,
					parts: 1,
				},
				baremeSeries: seedSeries(),
			}),
		);
		expect(r.quotient).toBeCloseTo(29_579, 6);
		expect(r.tmi).toBe(0.11);
		expect(r.trancheUpper).toBe(29_579);
	});

	it("E6: top 45% band → roomToNextBracket null", () => {
		const r = ok(
			observeTaxBracket({
				config: {
					incomeSource: "MANUAL",
					manualBasis: "NET_IMPOSABLE",
					manualAmount: 200_000,
					parts: 1,
				},
				baremeSeries: seedSeries(),
			}),
		);
		expect(r.tmi).toBe(0.45);
		expect(r.trancheUpper).toBeNull();
		expect(r.roomToNextBracket).toBeNull();
	});

	it("E8: assiettePas 0 with IR > 0 → tauxPrelevementConseille null (no div/0)", () => {
		expect(computeTauxPrelevementConseille(100, 0)).toBeNull();
		expect(computeTauxPrelevementConseille(0, 0)).toBe(0);
		expect(computeTauxPrelevementConseille(100, 1_000)).toBeCloseTo(0.1, 6);
	});
});

describe("FoyerFiscalConfigSchema validation (E2, E3)", () => {
	it("E2: MANUAL with missing or ≤0 manualAmount is rejected", () => {
		expect(
			FoyerFiscalConfigSchema.safeParse({
				incomeSource: "MANUAL",
				manualBasis: "NET_IMPOSABLE",
				manualAmount: 0,
				parts: 1,
			}).success,
		).toBe(false);
		expect(
			FoyerFiscalConfigSchema.safeParse({
				incomeSource: "MANUAL",
				manualBasis: "NET_IMPOSABLE",
				parts: 1,
			}).success,
		).toBe(false);
	});

	it("E3: parts missing, ≤0, non-finite, or not multiple of 0.5 is rejected", () => {
		const base = {
			incomeSource: "MANUAL" as const,
			manualBasis: "NET_IMPOSABLE" as const,
			manualAmount: 2_500,
		};
		expect(FoyerFiscalConfigSchema.safeParse({ ...base, parts: 0 }).success).toBe(
			false,
		);
		expect(FoyerFiscalConfigSchema.safeParse({ ...base, parts: -1 }).success).toBe(
			false,
		);
		expect(FoyerFiscalConfigSchema.safeParse({ ...base, parts: 1.25 }).success).toBe(
			false,
		);
		expect(FoyerFiscalConfigSchema.safeParse({ ...base }).success).toBe(false);
		expect(
			FoyerFiscalConfigSchema.safeParse({ ...base, parts: 1.5 }).success,
		).toBe(true);
		expect(
			FoyerFiscalConfigSchema.safeParse({
				incomeSource: "FROM_BUDGET",
				parts: 2,
			}).success,
		).toBe(true);
	});
});

describe("IR_BAREME_SEED available for observation offline", () => {
	it("observation works with seed only (no cache)", () => {
		expect(IR_BAREME_SEED.length).toBeGreaterThanOrEqual(1);
		const r = ok(
			observeTaxBracket({
				config: {
					incomeSource: "MANUAL",
					manualBasis: "NET_IMPOSABLE",
					manualAmount: 2_500,
					parts: 1,
				},
			}),
		);
		expect(r.incomeYear).toBe(2025);
	});
});
