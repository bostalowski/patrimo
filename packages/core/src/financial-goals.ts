import type { FinancialGoal, RetirementProfile } from "./schema";
import { FinancialGoalType } from "./schema";
import {
	PENSION_BRUT_TO_NET_APPROX,
	computeRetirementHorizon,
} from "./retraite";
import {
	SCENARIO_PRESETS,
	projectInvestment,
	type ContributionStream,
	type ScenarioKey,
} from "./projection";
import type { DcaConfig } from "./schema";
import type { Portfolio } from "./portfolio";
import { deflate, inflate } from "./inflation";

export type FinancialGoalValidationReason =
	| "invalid_type"
	| "missing_target_age"
	| "missing_target_date"
	| "unexpected_target_age"
	| "unexpected_target_date"
	| "invalid_target_age"
	| "invalid_target_amount"
	| "invalid_capitalisation_rate"
	| "duplicate_id"
	| "empty_label"
	| "empty_id";

export type FinancialGoalValidation =
	| { ok: true }
	| { ok: false; reason: FinancialGoalValidationReason };

const RETIREMENT_AGE_MIN = 50;
const RETIREMENT_AGE_MAX = 75;
const TRAJECTORY_BAND = 0.05;
const DEFAULT_INTEREST_ONLY_RATE = 0.03;
const DEFAULT_DRAW_ON_CAPITAL_RATE = 0.04;

export function validateFinancialGoals(
	goals: FinancialGoal[],
): FinancialGoalValidation {
	const seen = new Set<string>();
	for (const goal of goals) {
		if (!goal.id?.trim()) return { ok: false, reason: "empty_id" };
		if (!goal.label?.trim()) return { ok: false, reason: "empty_label" };
		if (!FinancialGoalType.options.includes(goal.type)) {
			return { ok: false, reason: "invalid_type" };
		}
		if (!(goal.targetAmount >= 0) || !Number.isFinite(goal.targetAmount)) {
			return { ok: false, reason: "invalid_target_amount" };
		}
		if (seen.has(goal.id)) return { ok: false, reason: "duplicate_id" };
		seen.add(goal.id);

		if (goal.type === "RETIREMENT_INCOME") {
			if (goal.targetAge === undefined || goal.targetAge === null) {
				return { ok: false, reason: "missing_target_age" };
			}
			if (
				goal.targetAge < RETIREMENT_AGE_MIN ||
				goal.targetAge > RETIREMENT_AGE_MAX
			) {
				return { ok: false, reason: "invalid_target_age" };
			}
			if (goal.targetDate !== undefined && goal.targetDate !== null) {
				return { ok: false, reason: "unexpected_target_date" };
			}
			const rate = goal.capitalisationRate;
			if (
				rate !== undefined &&
				(!(rate > 0) || rate > 0.1 || !Number.isFinite(rate))
			) {
				return { ok: false, reason: "invalid_capitalisation_rate" };
			}
		} else {
			if (!goal.targetDate) {
				return { ok: false, reason: "missing_target_date" };
			}
			if (goal.targetAge !== undefined && goal.targetAge !== null) {
				return { ok: false, reason: "unexpected_target_age" };
			}
		}
	}
	return { ok: true };
}

export function normalizeFinancialGoals(
	goals: FinancialGoal[],
): FinancialGoal[] {
	const result: FinancialGoal[] = [];
	const seen = new Set<string>();
	for (const goal of goals) {
		const parsed = FinancialGoalType.safeParse(goal.type);
		if (!parsed.success) continue;
		if (!goal.id?.trim() || !goal.label?.trim()) continue;
		if (!(goal.targetAmount >= 0) || !Number.isFinite(goal.targetAmount)) {
			continue;
		}
		if (seen.has(goal.id)) continue;

		if (parsed.data === "RETIREMENT_INCOME") {
			if (
				goal.targetAge === undefined ||
				goal.targetAge < RETIREMENT_AGE_MIN ||
				goal.targetAge > RETIREMENT_AGE_MAX
			) {
				continue;
			}
			seen.add(goal.id);
			const drawOnCapital = goal.drawOnCapital === true;
			const capitalisationRate =
				goal.capitalisationRate !== undefined &&
				Number.isFinite(goal.capitalisationRate) &&
				goal.capitalisationRate > 0
					? goal.capitalisationRate
					: defaultCapitalisationRate(drawOnCapital);
			result.push({
				id: goal.id,
				label: goal.label,
				type: "RETIREMENT_INCOME",
				targetAmount: goal.targetAmount,
				targetAge: goal.targetAge,
				inflationIncluded: goal.inflationIncluded !== false,
				drawOnCapital,
				capitalisationRate,
				notes: goal.notes,
			});
		} else {
			if (!goal.targetDate) continue;
			seen.add(goal.id);
			result.push({
				id: goal.id,
				label: goal.label,
				type: "CAPITAL_AT_DATE",
				targetAmount: goal.targetAmount,
				targetDate: goal.targetDate,
				inflationIncluded: goal.inflationIncluded !== false,
				notes: goal.notes,
			});
		}
	}
	return result;
}

export function pensionNetFromProfile(
	profile: Pick<RetirementProfile, "estimatedPublicPension">,
): number {
	return (profile.estimatedPublicPension ?? 0) * PENSION_BRUT_TO_NET_APPROX;
}

export function defaultCapitalisationRate(drawOnCapital: boolean): number {
	return drawOnCapital
		? DEFAULT_DRAW_ON_CAPITAL_RATE
		: DEFAULT_INTEREST_ONLY_RATE;
}

/**
 * Sticky mode-toggle defaults: Non→Oui with rate still 3% ⇒ 4%;
 * Oui→Non with rate still 4% ⇒ 3%; otherwise keep the user rate.
 */
export function rateAfterDrawOnCapitalToggle(params: {
	previousDrawOnCapital: boolean;
	nextDrawOnCapital: boolean;
	currentRate: number;
}): number {
	const { previousDrawOnCapital, nextDrawOnCapital, currentRate } = params;
	if (previousDrawOnCapital === nextDrawOnCapital) return currentRate;
	const previousDefault = defaultCapitalisationRate(previousDrawOnCapital);
	const nextDefault = defaultCapitalisationRate(nextDrawOnCapital);
	if (Math.abs(currentRate - previousDefault) < 1e-12) return nextDefault;
	return currentRate;
}

export function capitalisationRateForGoal(goal: FinancialGoal): number {
	const drawOnCapital = goal.drawOnCapital === true;
	const rate = goal.capitalisationRate;
	if (rate !== undefined && rate > 0 && rate <= 0.1 && Number.isFinite(rate)) {
		return rate;
	}
	return defaultCapitalisationRate(drawOnCapital);
}

function shouldSubtractPublicPension(
	goal: FinancialGoal,
	profile: Partial<
		Pick<RetirementProfile, "estimatedPublicPension" | "targetRetirementAge">
	>,
): boolean {
	if (goal.type !== "RETIREMENT_INCOME") return false;
	const pension = profile.estimatedPublicPension;
	if (pension === undefined || !(pension > 0)) return false;
	if (goal.targetAge === undefined) return false;
	const retirementAge = profile.targetRetirementAge;
	if (retirementAge === undefined) return false;
	return goal.targetAge >= retirementAge;
}

/**
 * Monthly net public pension subtracted from the income goal need, or 0
 * when overlap does not apply (age before retirement, missing pension, or
 * non-income goal).
 */
export function publicPensionNetMonthlyApplied(
	goal: FinancialGoal,
	profile: Partial<
		Pick<RetirementProfile, "estimatedPublicPension" | "targetRetirementAge">
	> = {},
): number {
	if (!shouldSubtractPublicPension(goal, profile)) return 0;
	return pensionNetFromProfile(profile);
}

/** Required capital from targetAmount via formula (no inflate/deflate). */
export function requiredCapitalToday(
	goal: FinancialGoal,
	profile: Partial<
		Pick<RetirementProfile, "estimatedPublicPension" | "targetRetirementAge">
	> = {},
): number {
	if (goal.type === "CAPITAL_AT_DATE") {
		return Math.max(0, goal.targetAmount);
	}
	const annualTarget = goal.targetAmount * 12;
	const pensionMonthly = publicPensionNetMonthlyApplied(goal, profile);
	const annualNeed = Math.max(0, annualTarget - pensionMonthly * 12);
	return annualNeed / capitalisationRateForGoal(goal);
}

export type GoalCapitalNeeds = {
	requiredToday: number;
	requiredAtHorizon: number;
	targetNominalAtHorizon: number | null;
};

/**
 * Resolve capital need in today's euros vs horizon euros from
 * `inflationIncluded` and the goal horizon.
 */
export function resolveGoalCapitalNeeds(params: {
	goal: FinancialGoal;
	profile?: Partial<
		Pick<RetirementProfile, "estimatedPublicPension" | "targetRetirementAge">
	>;
	horizonYears: number | null;
	inflationRate: number;
}): GoalCapitalNeeds {
	const fromTarget = requiredCapitalToday(params.goal, params.profile ?? {});
	const included = params.goal.inflationIncluded !== false;
	const years = params.horizonYears;

	if (years === null || years <= 0) {
		return {
			requiredToday: fromTarget,
			requiredAtHorizon: fromTarget,
			targetNominalAtHorizon: null,
		};
	}

	if (included) {
		return {
			requiredToday: fromTarget,
			requiredAtHorizon: inflate(fromTarget, years, params.inflationRate),
			targetNominalAtHorizon: inflate(
				params.goal.targetAmount,
				years,
				params.inflationRate,
			),
		};
	}

	return {
		requiredToday: deflate(fromTarget, years, params.inflationRate),
		requiredAtHorizon: fromTarget,
		targetNominalAtHorizon: params.goal.targetAmount,
	};
}

export type TrajectoryStatus = "ahead" | "on_track" | "behind";

export function trajectoryStatus(
	projectedReal: number,
	requiredAtHorizon: number,
): TrajectoryStatus {
	if (requiredAtHorizon <= 0) return "ahead";
	const ratio = projectedReal / requiredAtHorizon;
	if (ratio >= 1 + TRAJECTORY_BAND) return "ahead";
	if (ratio >= 1 - TRAJECTORY_BAND) return "on_track";
	return "behind";
}

export type GoalHorizon = {
	horizonYears: number;
	horizonDate: Date;
	expired: boolean;
};

export function computeGoalHorizon(
	goal: FinancialGoal,
	profile: Pick<RetirementProfile, "birthDate">,
	now: Date = new Date(),
): GoalHorizon | null {
	if (goal.type === "RETIREMENT_INCOME") {
		if (!profile.birthDate || goal.targetAge === undefined) return null;
		const { horizonYears, retirementDate } = computeRetirementHorizon(
			profile.birthDate,
			goal.targetAge,
			now,
		);
		return {
			horizonYears,
			horizonDate: retirementDate,
			expired: horizonYears <= 0,
		};
	}
	if (!goal.targetDate) return null;
	const ms = goal.targetDate.getTime() - now.getTime();
	const horizonYears = ms / (365.25 * 24 * 3600 * 1000);
	return {
		horizonYears: Math.max(0, horizonYears),
		horizonDate: goal.targetDate,
		expired: horizonYears <= 0,
	};
}

function contributionsFromDca(configs: DcaConfig[]): ContributionStream[] {
	return configs.map((config) => ({
		amount: config.amount,
		frequency: config.frequency,
		paymentMonth: config.paymentMonth,
	}));
}

export type GoalAssessment = {
	goal: FinancialGoal;
	/** Capital needed in today's euros (comparable to liquid MV). */
	requiredToday: number;
	/**
	 * Net public pension (€/month) subtracted from the income need when
	 * overlap applies; 0 otherwise (for assessment copy).
	 */
	pensionNetMonthlyApplied: number;
	progressCurrent: number;
	horizonYears: number | null;
	horizonDate: string | null;
	expired: boolean;
	incomplete: boolean;
	projectedReal: number | null;
	/** Capital needed in horizon euros (Projection Besoin). */
	requiredAtHorizon: number;
	/** Target amount in horizon euros (null when horizon unknown). */
	targetNominalAtHorizon: number | null;
	/** @deprecated Alias of requiredAtHorizon when horizon known. */
	requiredNominalAtHorizon: number | null;
	status: TrajectoryStatus | null;
	scenario: ScenarioKey;
	inflationRate: number;
};

export type GoalsAssessment = {
	goals: GoalAssessment[];
	sumRequiredToday: number;
	liquidMarketValue: number;
	progressOverall: number;
	projectedCapacity: number | null;
	sumRequiredAtHorizons: number;
	oversubscribed: boolean;
	scenario: ScenarioKey;
	incompleteProfile: boolean;
};

export function assessFinancialGoals(params: {
	goals: FinancialGoal[];
	portfolio: Portfolio;
	dcaConfigs: DcaConfig[];
	profile: RetirementProfile;
	inflationRate: number;
	scenario?: ScenarioKey;
	now?: Date;
}): GoalsAssessment | null {
	const goals = params.goals;
	if (goals.length === 0) return null;

	const now = params.now ?? new Date();
	const scenarioKey = params.scenario ?? "modere";
	const preset =
		SCENARIO_PRESETS.find((p) => p.key === scenarioKey) ?? SCENARIO_PRESETS[1];
	const liquidMarketValue = params.portfolio.totals.marketValue;
	const contributions = contributionsFromDca(params.dcaConfigs);
	const incompleteProfile = !params.profile.birthDate;

	const assessed: GoalAssessment[] = [];
	let sumRequiredToday = 0;
	let sumRequiredAtHorizons = 0;
	let maxHorizonYears = 0;

	for (const goal of goals) {
		const horizon = computeGoalHorizon(goal, params.profile, now);
		const needsBirthDate = goal.type === "RETIREMENT_INCOME";
		const incomplete = needsBirthDate && incompleteProfile;

		const needs = resolveGoalCapitalNeeds({
			goal,
			profile: params.profile,
			horizonYears:
				!incomplete && horizon ? horizon.horizonYears : null,
			inflationRate: params.inflationRate,
		});
		const requiredToday = needs.requiredToday;
		sumRequiredToday += requiredToday;
		const progressCurrent =
			requiredToday <= 0
				? 1
				: Math.min(1, liquidMarketValue / requiredToday);

		let projectedReal: number | null = null;
		let status: TrajectoryStatus | null = null;
		let horizonYears: number | null = null;
		let horizonDate: string | null = null;
		let expired = false;
		const targetNominalAtHorizon = needs.targetNominalAtHorizon;
		const requiredAtHorizon = needs.requiredAtHorizon;
		const requiredNominalAtHorizon =
			targetNominalAtHorizon === null ? null : requiredAtHorizon;

		if (!incomplete && horizon) {
			horizonYears = horizon.horizonYears;
			horizonDate = horizon.horizonDate.toISOString();
			expired = horizon.expired;
			maxHorizonYears = Math.max(maxHorizonYears, horizon.horizonYears);

			if (expired) {
				projectedReal = liquidMarketValue;
				status =
					liquidMarketValue >= requiredToday
						? "ahead"
						: "behind";
			} else {
				const projection = projectInvestment({
					startBalance: liquidMarketValue,
					contributions,
					annualRate: preset.rate,
					years: horizon.horizonYears,
					inflationRate: params.inflationRate,
					start: now,
				});
				projectedReal = projection.finalRealValue;
				status = trajectoryStatus(projectedReal, requiredToday);
			}
		}

		sumRequiredAtHorizons += requiredToday;
		assessed.push({
			goal,
			requiredToday,
			pensionNetMonthlyApplied: publicPensionNetMonthlyApplied(
				goal,
				params.profile,
			),
			progressCurrent,
			horizonYears,
			horizonDate,
			expired,
			incomplete,
			projectedReal,
			requiredAtHorizon,
			targetNominalAtHorizon,
			requiredNominalAtHorizon,
			status,
			scenario: preset.key,
			inflationRate: params.inflationRate,
		});
	}

	let projectedCapacity: number | null = null;
	if (maxHorizonYears > 0 || assessed.some((g) => !g.incomplete)) {
		const projection = projectInvestment({
			startBalance: liquidMarketValue,
			contributions,
			annualRate: preset.rate,
			years: maxHorizonYears,
			inflationRate: params.inflationRate,
			start: now,
		});
		projectedCapacity =
			maxHorizonYears <= 0
				? liquidMarketValue
				: projection.finalRealValue;
	}

	const oversubscribed =
		projectedCapacity !== null &&
		sumRequiredAtHorizons > 0 &&
		projectedCapacity < sumRequiredAtHorizons;

	const progressOverall =
		sumRequiredToday <= 0
			? 1
			: Math.min(1, liquidMarketValue / sumRequiredToday);

	return {
		goals: assessed,
		sumRequiredToday,
		liquidMarketValue,
		progressOverall,
		projectedCapacity,
		sumRequiredAtHorizons,
		oversubscribed,
		scenario: preset.key,
		incompleteProfile,
	};
}
