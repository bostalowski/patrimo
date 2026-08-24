import type { EmergencyFundConfig } from "./schema";

export const DEFAULT_EMERGENCY_FUND_TARGET_MONTHS = 6;
export const DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS = 12;

type EmergencyFundConfigInput = Partial<EmergencyFundConfig> | undefined;

function sanitizePositiveNumber(value: unknown): number | undefined {
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		return undefined;
	}
	return value;
}

export function normalizeEmergencyFundConfig(
	input: EmergencyFundConfigInput,
): EmergencyFundConfig {
	const targetMonths =
		sanitizePositiveNumber(input?.targetMonths) ??
		DEFAULT_EMERGENCY_FUND_TARGET_MONTHS;
	const catchUpHorizonMonths = Math.max(
		1,
		Math.round(
			sanitizePositiveNumber(input?.catchUpHorizonMonths) ??
				DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS,
		),
	);
	const targetAmountOverride = sanitizePositiveNumber(input?.targetAmountOverride);

	return {
		targetMonths,
		catchUpHorizonMonths,
		targetAmountOverride,
	};
}

export function effectiveEmergencyFundTargetEuro(args: {
	monthlyExpenses: number;
	config?: EmergencyFundConfig;
}): number | undefined {
	const config = normalizeEmergencyFundConfig(args.config);
	if (config.targetAmountOverride !== undefined) return config.targetAmountOverride;
	if (!(args.monthlyExpenses > 0)) return undefined;
	return config.targetMonths * args.monthlyExpenses;
}

export function monthlyEmergencyCatchUpReserve(args: {
	livretBalance: number;
	monthlyExpenses: number;
	config?: EmergencyFundConfig;
}): number {
	const config = normalizeEmergencyFundConfig(args.config);
	const effectiveTarget = effectiveEmergencyFundTargetEuro({
		monthlyExpenses: args.monthlyExpenses,
		config,
	});
	if (effectiveTarget === undefined) return 0;
	return Math.max(0, effectiveTarget - args.livretBalance) / config.catchUpHorizonMonths;
}
