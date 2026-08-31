import { describe, expect, it } from "vitest";
import { RetirementProfile } from "./schema";
import {
	PENSION_SCENARIO_TYPES,
	civilAnniversary,
	civilYmd,
	compareCivilYmd,
	isPensionScenarioFilled,
	normalizeRetirementProfile,
	resolveActivePensionScenario,
	serializeRetirementProfileForWrite,
} from "./retirement-profile";

describe("civil date helpers", () => {
	it("compares Y-M-D only (no timezone flip)", () => {
		expect(
			compareCivilYmd(
				new Date("2054-04-01T23:00:00.000Z"),
				new Date("2054-04-01T00:00:00.000Z"),
			),
		).toBe(0);
		expect(
			compareCivilYmd(
				new Date("2054-03-31T00:00:00.000Z"),
				new Date("2054-04-01T00:00:00.000Z"),
			),
		).toBeLessThan(0);
	});

	it("civilAnniversary keeps month/day; clamps invalid day to month end", () => {
		const birth = new Date("1960-01-31T00:00:00.000Z");
		expect(civilYmd(civilAnniversary(birth, 64))).toBe("2024-01-31");
		const leapish = new Date("1960-02-29T00:00:00.000Z");
		expect(civilYmd(civilAnniversary(leapish, 1))).toBe("1961-02-28");
	});
});

describe("isPensionScenarioFilled", () => {
	it("requires valid startDate and defined grossMonthly (>= 0)", () => {
		expect(
			isPensionScenarioFilled({
				startDate: new Date("2050-01-01T00:00:00.000Z"),
				grossMonthly: 0,
			}),
		).toBe(true);
		expect(
			isPensionScenarioFilled({
				startDate: new Date("2050-01-01T00:00:00.000Z"),
				grossMonthly: 2966,
			}),
		).toBe(true);
		expect(
			isPensionScenarioFilled({
				startDate: new Date("2050-01-01T00:00:00.000Z"),
			}),
		).toBe(false);
		expect(isPensionScenarioFilled({ grossMonthly: 2000 })).toBe(false);
		expect(isPensionScenarioFilled({})).toBe(false);
	});
});

describe("RetirementProfile scenarios round-trip", () => {
	it("keeps up to three typed filled scenarios; incomplete slot stays empty", () => {
		expect(PENSION_SCENARIO_TYPES).toEqual([
			"LEGAL_AGE",
			"FULL_RATE",
			"AUTOMATIC_FULL_RATE",
		]);
		const raw = {
			birthDate: "1965-06-15",
			scenarios: {
				LEGAL_AGE: {
					startDate: "2030-06-15",
					grossMonthly: 2966,
				},
				FULL_RATE: {
					startDate: "2054-04-01",
					grossMonthly: 3200,
				},
				AUTOMATIC_FULL_RATE: {
					startDate: "2057-06-15",
					// incomplete: missing gross
				},
			},
			activeScenario: "LEGAL_AGE",
			withdrawalRate: 0.04,
		};
		const parsed = RetirementProfile.parse(raw);
		const normalized = normalizeRetirementProfile(parsed);
		expect(isPensionScenarioFilled(normalized.scenarios?.LEGAL_AGE)).toBe(
			true,
		);
		expect(isPensionScenarioFilled(normalized.scenarios?.FULL_RATE)).toBe(
			true,
		);
		expect(
			isPensionScenarioFilled(normalized.scenarios?.AUTOMATIC_FULL_RATE),
		).toBe(false);
		expect(normalized.activeScenario).toBe("LEGAL_AGE");
		const again = RetirementProfile.parse(
			JSON.parse(JSON.stringify(normalized)),
		);
		expect(civilYmd(again.scenarios!.LEGAL_AGE!.startDate!)).toBe(
			"2030-06-15",
		);
		expect(again.scenarios!.FULL_RATE!.grossMonthly).toBe(3200);
	});
});

describe("normalizeRetirementProfile legacy migration", () => {
	it("with birthDate: LEGAL_AGE filled from flat + activeScenario LEGAL_AGE", () => {
		const normalized = normalizeRetirementProfile(
			RetirementProfile.parse({
				birthDate: "1965-04-01",
				targetRetirementAge: 64,
				estimatedPublicPension: 2966,
			}),
		);
		expect(normalized.activeScenario).toBe("LEGAL_AGE");
		expect(isPensionScenarioFilled(normalized.scenarios?.LEGAL_AGE)).toBe(
			true,
		);
		expect(normalized.scenarios?.LEGAL_AGE?.grossMonthly).toBe(2966);
		expect(civilYmd(normalized.scenarios!.LEGAL_AGE!.startDate!)).toBe(
			"2029-04-01",
		);
	});

	it("without birthDate: amount only, startDate absent, keep targetRetirementAge on read", () => {
		const normalized = normalizeRetirementProfile(
			RetirementProfile.parse({
				targetRetirementAge: 64,
				estimatedPublicPension: 2966,
			}),
		);
		expect(normalized.scenarios?.LEGAL_AGE?.grossMonthly).toBe(2966);
		expect(normalized.scenarios?.LEGAL_AGE?.startDate).toBeUndefined();
		expect(isPensionScenarioFilled(normalized.scenarios?.LEGAL_AGE)).toBe(
			false,
		);
		expect(normalized.targetRetirementAge).toBe(64);
	});

	it("age without estimatedPublicPension: startDate if birthDate else empty; not filled", () => {
		const withBirth = normalizeRetirementProfile(
			RetirementProfile.parse({
				birthDate: "1965-04-01",
				targetRetirementAge: 64,
			}),
		);
		expect(civilYmd(withBirth.scenarios!.LEGAL_AGE!.startDate!)).toBe(
			"2029-04-01",
		);
		expect(withBirth.scenarios?.LEGAL_AGE?.grossMonthly).toBeUndefined();
		expect(isPensionScenarioFilled(withBirth.scenarios?.LEGAL_AGE)).toBe(
			false,
		);

		const noBirth = normalizeRetirementProfile(
			RetirementProfile.parse({ targetRetirementAge: 64 }),
		);
		expect(noBirth.scenarios?.LEGAL_AGE).toBeUndefined();
		expect(isPensionScenarioFilled(noBirth.scenarios?.LEGAL_AGE)).toBe(
			false,
		);
	});

	it("clears activeScenario when it points at an unfilled type", () => {
		const normalized = normalizeRetirementProfile(
			RetirementProfile.parse({
				scenarios: {
					LEGAL_AGE: { grossMonthly: 1000 },
				},
				activeScenario: "LEGAL_AGE",
			}),
		);
		expect(normalized.activeScenario).toBeUndefined();
		expect(resolveActivePensionScenario(normalized)).toBeNull();
	});
});

describe("serializeRetirementProfileForWrite", () => {
	it("omits flat legacy fields after migration", () => {
		const normalized = normalizeRetirementProfile(
			RetirementProfile.parse({
				birthDate: "1965-04-01",
				targetRetirementAge: 64,
				estimatedPublicPension: 2966,
				withdrawalRate: 0.04,
			}),
		);
		const written = serializeRetirementProfileForWrite(normalized);
		expect(written).not.toHaveProperty("targetRetirementAge");
		expect(written).not.toHaveProperty("estimatedPublicPension");
		expect(
			(written.scenarios as { LEGAL_AGE?: { grossMonthly?: number } })
				?.LEGAL_AGE?.grossMonthly,
		).toBe(2966);
		expect(written.activeScenario).toBe("LEGAL_AGE");
	});
});
