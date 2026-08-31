import type {
	PensionScenarioSlot,
	PensionScenarioType,
	PensionScenarios,
	RetirementProfile,
} from "./schema";

export type { PensionScenarioSlot, PensionScenarioType };

export const PENSION_SCENARIO_TYPES: PensionScenarioType[] = [
	"LEGAL_AGE",
	"FULL_RATE",
	"AUTOMATIC_FULL_RATE",
];

/** Indicative brut → net factor (social charges / CSG heuristic). */
export const PENSION_BRUT_TO_NET_APPROX = 0.82;

/** Civil calendar day YYYY-MM-DD from UTC components (no local TZ flip). */
export function civilYmd(date: Date): string {
	const y = date.getUTCFullYear();
	const m = String(date.getUTCMonth() + 1).padStart(2, "0");
	const d = String(date.getUTCDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function asCivilYmd(value: Date | string): string {
	if (typeof value === "string") return value.slice(0, 10);
	return civilYmd(value);
}

/** Compare civil days only: -1 / 0 / 1. */
export function compareCivilYmd(a: Date | string, b: Date | string): number {
	const sa = asCivilYmd(a);
	const sb = asCivilYmd(b);
	if (sa < sb) return -1;
	if (sa > sb) return 1;
	return 0;
}

/**
 * Anniversary at `birthDate + ageYears` (UTC Y-M-D).
 * Invalid day (e.g. 29 Feb → non-leap) → last day of that month.
 */
export function civilAnniversary(birthDate: Date, ageYears: number): Date {
	const y = birthDate.getUTCFullYear() + ageYears;
	const m = birthDate.getUTCMonth();
	const d = birthDate.getUTCDate();
	const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
	return new Date(Date.UTC(y, m, Math.min(d, lastDay)));
}

export function isPensionScenarioFilled(
	slot: PensionScenarioSlot | undefined,
): boolean {
	if (!slot) return false;
	if (slot.startDate === undefined || !(slot.startDate instanceof Date)) {
		return false;
	}
	if (Number.isNaN(slot.startDate.getTime())) return false;
	if (slot.grossMonthly === undefined) return false;
	if (!Number.isFinite(slot.grossMonthly) || slot.grossMonthly < 0) {
		return false;
	}
	return true;
}

function emptyScenarios(): PensionScenarios {
	return {};
}

function cloneScenarios(
	scenarios: PensionScenarios | undefined,
): PensionScenarios {
	if (!scenarios) return emptyScenarios();
	const out: PensionScenarios = {};
	for (const type of PENSION_SCENARIO_TYPES) {
		const slot = scenarios[type];
		if (!slot) continue;
		out[type] = {
			startDate: slot.startDate,
			grossMonthly: slot.grossMonthly,
		};
	}
	return out;
}

function hasAnyScenarioData(scenarios: PensionScenarios): boolean {
	return PENSION_SCENARIO_TYPES.some((t) => {
		const s = scenarios[t];
		return s !== undefined && (s.startDate !== undefined || s.grossMonthly !== undefined);
	});
}

/**
 * Migrate legacy flat fields into scenarios when scenarios are empty,
 * then clear orphan `activeScenario`.
 */
export function normalizeRetirementProfile(
	profile: RetirementProfile,
): RetirementProfile {
	const scenarios = cloneScenarios(profile.scenarios);
	const hadScenarioData = hasAnyScenarioData(scenarios);

	if (!hadScenarioData) {
		const age = profile.targetRetirementAge;
		const gross = profile.estimatedPublicPension;
		const birth = profile.birthDate;

		if (gross !== undefined || age !== undefined) {
			const slot: PensionScenarioSlot = {};
			if (gross !== undefined) slot.grossMonthly = gross;
			if (birth !== undefined && age !== undefined) {
				slot.startDate = civilAnniversary(birth, age);
			}
			if (slot.grossMonthly !== undefined || slot.startDate !== undefined) {
				scenarios.LEGAL_AGE = slot;
			}
		}
	}

	let activeScenario = profile.activeScenario;
	if (activeScenario !== undefined) {
		if (!isPensionScenarioFilled(scenarios[activeScenario])) {
			activeScenario = undefined;
		}
	} else if (
		!hadScenarioData &&
		isPensionScenarioFilled(scenarios.LEGAL_AGE)
	) {
		activeScenario = "LEGAL_AGE";
	}

	return {
		...profile,
		scenarios,
		activeScenario,
	};
}

export function resolveActivePensionScenario(
	profile: RetirementProfile,
): { type: PensionScenarioType; slot: PensionScenarioSlot } | null {
	const type = profile.activeScenario;
	if (!type) return null;
	const slot = profile.scenarios?.[type];
	if (!isPensionScenarioFilled(slot)) return null;
	return { type, slot: slot! };
}

/** Persist shape: scenarios + activeScenario + birthDate (+ withdrawal); omit flats. */
export function serializeRetirementProfileForWrite(
	profile: RetirementProfile,
): Record<string, unknown> {
	const normalized = normalizeRetirementProfile(profile);
	const out: Record<string, unknown> = {
		scenarios: normalized.scenarios ?? {},
	};
	if (normalized.birthDate !== undefined) {
		out.birthDate = civilYmd(normalized.birthDate);
	}
	if (normalized.activeScenario !== undefined) {
		out.activeScenario = normalized.activeScenario;
	}
	if (normalized.withdrawalRate !== undefined) {
		out.withdrawalRate = normalized.withdrawalRate;
	}
	// Serialize scenario dates as Y-M-D strings
	const scenariosOut: Record<string, unknown> = {};
	for (const type of PENSION_SCENARIO_TYPES) {
		const slot = normalized.scenarios?.[type];
		if (!slot) continue;
		const entry: Record<string, unknown> = {};
		if (slot.startDate !== undefined) entry.startDate = civilYmd(slot.startDate);
		if (slot.grossMonthly !== undefined) entry.grossMonthly = slot.grossMonthly;
		scenariosOut[type] = entry;
	}
	out.scenarios = scenariosOut;
	return out;
}

/** Years from `now` to a civil start date (fractional), floor at 0. */
export function yearsUntilCivilDate(
	startDate: Date,
	now: Date = new Date(),
): number {
	const ms =
		Date.UTC(
			startDate.getUTCFullYear(),
			startDate.getUTCMonth(),
			startDate.getUTCDate(),
		) -
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	return Math.max(0, ms / (365.25 * 24 * 3600 * 1000));
}

export type ResolvedActiveRetirement =
	| { ok: false; reason: "no_active_scenario" }
	| {
			ok: true;
			type: PensionScenarioType;
			startDate: Date;
			horizonYears: number;
			grossMonthly: number;
			netMonthly: number;
	  };

/**
 * Horizon + pension for Projection / Retraite surfaces from `activeScenario`.
 * No filled active scenario ⇒ incomplete (no invented horizon).
 */
export function resolveActiveRetirement(
	profile: RetirementProfile,
	now: Date = new Date(),
	brutToNet = PENSION_BRUT_TO_NET_APPROX,
): ResolvedActiveRetirement {
	const normalized = normalizeRetirementProfile(profile);
	const active = resolveActivePensionScenario(normalized);
	if (!active || !active.slot.startDate || active.slot.grossMonthly === undefined) {
		return { ok: false, reason: "no_active_scenario" };
	}
	return {
		ok: true,
		type: active.type,
		startDate: active.slot.startDate,
		horizonYears: yearsUntilCivilDate(active.slot.startDate, now),
		grossMonthly: active.slot.grossMonthly,
		netMonthly: active.slot.grossMonthly * brutToNet,
	};
}

export function filledPensionScenarioOptions(
	profile: RetirementProfile,
): { type: PensionScenarioType; slot: PensionScenarioSlot }[] {
	const normalized = normalizeRetirementProfile(profile);
	const out: { type: PensionScenarioType; slot: PensionScenarioSlot }[] = [];
	for (const type of PENSION_SCENARIO_TYPES) {
		const slot = normalized.scenarios?.[type];
		if (isPensionScenarioFilled(slot)) {
			out.push({ type, slot: slot! });
		}
	}
	return out;
}
