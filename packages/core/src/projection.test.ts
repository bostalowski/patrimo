import { describe, expect, it } from "vitest";
import {
	type EnvelopesWithOverflowResult,
	type InvestmentProjection,
	projectEnvelopesWithOverflow,
	projectInvestment,
} from "./projection";
import type { Envelope } from "./schema";

const START = new Date(Date.UTC(2026, 0, 15));

function resultOf(
	projections: EnvelopesWithOverflowResult["projections"],
	envelope: Envelope,
): InvestmentProjection {
	const row = projections.find((p) => p.envelope === envelope);
	if (!row) {
		throw new Error(`missing projection for ${envelope}`);
	}
	return row.result;
}

describe("projectInvestment", () => {
	it("clips contributions at plafond and sets plafondReachedMonth", () => {
		const result = projectInvestment({
			startBalance: 149_000,
			monthlyContribution: 500,
			annualRate: 0,
			years: 1,
			start: START,
			plafond: 150_000,
		});
		expect(result.plafondReachedMonth).toBe(2);
		expect(result.totalContributed).toBe(150_000);
		expect(result.finalValue).toBe(150_000);
	});
});

describe("projectEnvelopesWithOverflow", () => {
	it("routes mid-horizon PEA surplus to CTO and raises CTO final value", () => {
		const baseline = projectInvestment({
			startBalance: 0,
			monthlyContribution: 0,
			annualRate: 0,
			years: 2,
			start: START,
		});
		const { projections, overflows } = projectEnvelopesWithOverflow({
			envelopes: [
				{
					envelope: "PEA",
					startBalance: 149_000,
					monthlyContribution: 500,
					annualRate: 0,
					plafond: 150_000,
				},
				{
					envelope: "CTO",
					startBalance: 0,
					monthlyContribution: 0,
					annualRate: 0,
				},
			],
			years: 2,
			start: START,
		});

		const pea = resultOf(projections, "PEA");
		const cto = resultOf(projections, "CTO");

		expect(pea.plafondReachedMonth).toBe(2);
		expect(pea.totalContributed).toBe(150_000);
		expect(cto.finalValue).toBeGreaterThan(baseline.finalValue);
		// Month 1: PEA takes 500 (room 1000). Month 2: PEA takes 500 (hits plafond).
		// Months 3–24: 500/mo → CTO = 22 * 500
		expect(cto.totalContributed).toBe(11_000);
		expect(overflows).toHaveLength(1);
		expect(overflows[0]).toMatchObject({
			source: "PEA",
			target: "CTO",
			firstOverflowMonth: 3,
			monthlySurplus: 500,
			totalOverflow: 11_000,
		});
	});

	it("routes partial first-month surplus when plafond room is smaller than due", () => {
		const { projections, overflows } = projectEnvelopesWithOverflow({
			envelopes: [
				{
					envelope: "PEA",
					startBalance: 149_700,
					monthlyContribution: 500,
					annualRate: 0,
					plafond: 150_000,
				},
				{
					envelope: "CTO",
					startBalance: 0,
					monthlyContribution: 0,
					annualRate: 0,
				},
			],
			years: 1,
			start: START,
		});

		const pea = resultOf(projections, "PEA");
		const cto = resultOf(projections, "CTO");

		expect(pea.plafondReachedMonth).toBe(1);
		expect(pea.totalContributed).toBe(150_000);
		// Month 1: PEA 300 + overflow 200; months 2–12: 500 → CTO
		expect(cto.totalContributed).toBe(200 + 11 * 500);
		expect(overflows[0]?.firstOverflowMonth).toBe(1);
		expect(overflows[0]?.monthlySurplus).toBe(500);
		expect(overflows[0]?.totalOverflow).toBe(200 + 11 * 500);
	});

	it("includes TRIMESTRIEL / ANNUEL extra streams in the clip → overflow path", () => {
		const { projections, overflows } = projectEnvelopesWithOverflow({
			envelopes: [
				{
					envelope: "PEA",
					startBalance: 149_500,
					contributions: [
						{ amount: 200, frequency: "MENSUEL" },
						{ amount: 600, frequency: "TRIMESTRIEL", paymentMonth: 1 },
						{ amount: 1_200, frequency: "ANNUEL", paymentMonth: 1 },
					],
					annualRate: 0,
					plafond: 150_000,
				},
				{
					envelope: "CTO",
					startBalance: 0,
					monthlyContribution: 0,
					annualRate: 0,
				},
			],
			years: 1,
			start: START,
		});

		const pea = resultOf(projections, "PEA");
		const cto = resultOf(projections, "CTO");

		expect(pea.totalContributed).toBe(150_000);
		expect(cto.totalContributed).toBeGreaterThan(0);
		expect(overflows[0]?.source).toBe("PEA");
		expect(overflows[0]?.target).toBe("CTO");
		// Variable streams → monthly surplus not constant
		expect(overflows[0]?.monthlySurplus).toBeNull();
	});

	it("drops remaining surplus when fallback is also at plafond (single hop)", () => {
		const { projections, overflows } = projectEnvelopesWithOverflow({
			envelopes: [
				{
					envelope: "PEA",
					startBalance: 150_000,
					monthlyContribution: 500,
					annualRate: 0,
					plafond: 150_000,
				},
				{
					envelope: "LIVRET",
					startBalance: 22_950,
					monthlyContribution: 0,
					annualRate: 0,
					plafond: 22_950,
				},
			],
			years: 1,
			start: START,
			overflowEnvelope: "LIVRET",
		});

		const pea = resultOf(projections, "PEA");
		const livret = resultOf(projections, "LIVRET");

		expect(pea.totalContributed).toBe(150_000);
		expect(livret.totalContributed).toBe(22_950);
		expect(overflows).toHaveLength(0);
	});

	it("does not redirect when source === overflow envelope", () => {
		const alone = projectInvestment({
			startBalance: 149_000,
			monthlyContribution: 500,
			annualRate: 0,
			years: 1,
			start: START,
			plafond: 150_000,
		});
		const { projections, overflows } = projectEnvelopesWithOverflow({
			envelopes: [
				{
					envelope: "CTO",
					startBalance: 149_000,
					monthlyContribution: 500,
					annualRate: 0,
					plafond: 150_000,
				},
			],
			years: 1,
			start: START,
			overflowEnvelope: "CTO",
		});

		const cto = resultOf(projections, "CTO");
		expect(overflows).toHaveLength(0);
		expect(cto.totalContributed).toBe(alone.totalContributed);
		expect(cto.finalValue).toBe(alone.finalValue);
	});

	it("auto-adds missing overflow envelope with default rate", () => {
		const { projections, overflows } = projectEnvelopesWithOverflow({
			envelopes: [
				{
					envelope: "PEA",
					startBalance: 150_000,
					monthlyContribution: 100,
					annualRate: 0,
					plafond: 150_000,
				},
			],
			years: 1,
			start: START,
		});

		expect(projections.map((p) => p.envelope).sort()).toEqual(["CTO", "PEA"]);
		expect(overflows[0]?.target).toBe("CTO");
		expect(resultOf(projections, "CTO").totalContributed).toBe(1_200);
	});
});
