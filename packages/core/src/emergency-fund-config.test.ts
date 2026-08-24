import { describe, expect, it } from "vitest";
import {
	DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS,
	DEFAULT_EMERGENCY_FUND_TARGET_MONTHS,
	effectiveEmergencyFundTargetEuro,
	monthlyEmergencyCatchUpReserve,
	normalizeEmergencyFundConfig,
} from "./emergency-fund-config";

describe("normalizeEmergencyFundConfig", () => {
	it("falls back to defaults when values are missing", () => {
		expect(normalizeEmergencyFundConfig(undefined)).toEqual({
			targetMonths: DEFAULT_EMERGENCY_FUND_TARGET_MONTHS,
			catchUpHorizonMonths: DEFAULT_EMERGENCY_FUND_CATCH_UP_HORIZON_MONTHS,
			targetAmountOverride: undefined,
		});
	});

	it("sanitizes invalid values and rounds horizon", () => {
		expect(
			normalizeEmergencyFundConfig({
				targetMonths: -1,
				targetAmountOverride: 0,
				catchUpHorizonMonths: 9.4,
			}),
		).toEqual({
			targetMonths: DEFAULT_EMERGENCY_FUND_TARGET_MONTHS,
			catchUpHorizonMonths: 9,
			targetAmountOverride: undefined,
		});
	});
});

describe("effectiveEmergencyFundTargetEuro", () => {
	it("prefers absolute override", () => {
		expect(
			effectiveEmergencyFundTargetEuro({
				monthlyExpenses: 2_000,
				config: {
					targetMonths: 6,
					targetAmountOverride: 18_000,
					catchUpHorizonMonths: 12,
				},
			}),
		).toBe(18_000);
	});

	it("returns undefined when expenses are non-positive and no override", () => {
		expect(
			effectiveEmergencyFundTargetEuro({
				monthlyExpenses: 0,
				config: { targetMonths: 6, catchUpHorizonMonths: 12 },
			}),
		).toBeUndefined();
	});
});

describe("monthlyEmergencyCatchUpReserve", () => {
	it("returns zero when target is already met", () => {
		expect(
			monthlyEmergencyCatchUpReserve({
				livretBalance: 20_000,
				monthlyExpenses: 2_000,
				config: { targetMonths: 6, catchUpHorizonMonths: 12 },
			}),
		).toBe(0);
	});
});
