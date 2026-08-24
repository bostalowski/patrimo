import { describe, expect, it } from "vitest";
import {
	computeEmergencyFundSurplusRecommendation,
	emergencyFundSurplusRecommendationCopy,
} from "./emergency-fund-recommendation";

const formatEuro = (n: number) => `${n} €`;

describe("computeEmergencyFundSurplusRecommendation", () => {
	it("returns null when target euro is undefined", () => {
		expect(
			computeEmergencyFundSurplusRecommendation({
				revenusMensuels: 5_000,
				depensesMensuelles: 0,
				livretBalance: 1_000,
				plannedLivretDcaMonthly: 0,
				plannedInvestmentDcaMonthly: 500,
			}),
		).toBeNull();
	});

	it("recommends oneshot when gap fits in available cash after investment DCA", () => {
		// rawSavings = 3000, investment = 500 → available = 2500; gap = 2000
		const result = computeEmergencyFundSurplusRecommendation({
			revenusMensuels: 5_000,
			depensesMensuelles: 2_000,
			livretBalance: 10_000,
			plannedLivretDcaMonthly: 0,
			plannedInvestmentDcaMonthly: 500,
			emergencyFundConfig: { targetMonths: 6, catchUpHorizonMonths: 12 },
		});
		expect(result).toMatchObject({
			mode: "oneshot",
			gapEuro: 2_000,
			targetEuro: 12_000,
			availableCashMonthly: 2_500,
			amountToAdd: 2_000,
		});
	});

	it("uses monthly path when gap exceeds available cash", () => {
		// target 12k, livret 1k → gap 11k; available = 2500 < 11k
		// monthlyNeed = 11000/12 ≈ 916.67; à ajouter = 916.67 (no livret dca)
		const result = computeEmergencyFundSurplusRecommendation({
			revenusMensuels: 5_000,
			depensesMensuelles: 2_000,
			livretBalance: 1_000,
			plannedLivretDcaMonthly: 0,
			plannedInvestmentDcaMonthly: 500,
			emergencyFundConfig: { targetMonths: 6, catchUpHorizonMonths: 12 },
		});
		expect(result).toMatchObject({
			mode: "monthly",
			gapEuro: 11_000,
			availableCashMonthly: 2_500,
			monthlyNeed: 916.67,
			amountToAdd: 916.67,
		});
	});

	it("deducts planned LIVRET DCA from monthly à ajouter", () => {
		const result = computeEmergencyFundSurplusRecommendation({
			revenusMensuels: 5_000,
			depensesMensuelles: 2_000,
			livretBalance: 1_000,
			plannedLivretDcaMonthly: 400,
			plannedInvestmentDcaMonthly: 500,
			emergencyFundConfig: { targetMonths: 6, catchUpHorizonMonths: 12 },
		});
		expect(result).toMatchObject({
			mode: "monthly",
			monthlyNeed: 916.67,
			plannedLivretDcaMonthly: 400,
			amountToAdd: 516.67,
		});
	});

	it("returns none when LIVRET DCA already covers monthly need", () => {
		const result = computeEmergencyFundSurplusRecommendation({
			revenusMensuels: 5_000,
			depensesMensuelles: 2_000,
			livretBalance: 1_000,
			plannedLivretDcaMonthly: 1_000,
			plannedInvestmentDcaMonthly: 500,
			emergencyFundConfig: { targetMonths: 6, catchUpHorizonMonths: 12 },
		});
		expect(result).toMatchObject({
			mode: "none",
			amountToAdd: 0,
			monthlyNeed: 916.67,
		});
	});

	it("returns none when gap is already closed", () => {
		const result = computeEmergencyFundSurplusRecommendation({
			revenusMensuels: 5_000,
			depensesMensuelles: 2_000,
			livretBalance: 15_000,
			plannedLivretDcaMonthly: 200,
			plannedInvestmentDcaMonthly: 500,
			emergencyFundConfig: { targetMonths: 6, catchUpHorizonMonths: 12 },
		});
		expect(result).toMatchObject({
			mode: "none",
			gapEuro: 0,
			amountToAdd: 0,
		});
	});

	it("never reduces investment DCA when computing available cash", () => {
		const result = computeEmergencyFundSurplusRecommendation({
			revenusMensuels: 3_000,
			depensesMensuelles: 2_000,
			livretBalance: 0,
			plannedLivretDcaMonthly: 0,
			plannedInvestmentDcaMonthly: 800,
			emergencyFundConfig: {
				targetAmountOverride: 10_000,
				targetMonths: 6,
				catchUpHorizonMonths: 10,
			},
		});
		// available = max(0, 1000 − 800) = 200; gap 10k → monthly
		expect(result!.availableCashMonthly).toBe(200);
		expect(result!.plannedInvestmentDcaMonthly).toBe(800);
		expect(result!.amountToAdd).toBe(200);
		expect(result!.mode).toBe("monthly");
	});

	it("uses absolute target override", () => {
		const result = computeEmergencyFundSurplusRecommendation({
			revenusMensuels: 4_000,
			depensesMensuelles: 1_000,
			livretBalance: 2_000,
			plannedLivretDcaMonthly: 0,
			plannedInvestmentDcaMonthly: 0,
			emergencyFundConfig: {
				targetAmountOverride: 5_000,
				targetMonths: 6,
				catchUpHorizonMonths: 12,
			},
		});
		expect(result).toMatchObject({
			mode: "oneshot",
			targetEuro: 5_000,
			gapEuro: 3_000,
			amountToAdd: 3_000,
		});
	});

	it("caps monthly à ajouter by available cash", () => {
		const result = computeEmergencyFundSurplusRecommendation({
			revenusMensuels: 2_200,
			depensesMensuelles: 2_000,
			livretBalance: 0,
			plannedLivretDcaMonthly: 0,
			plannedInvestmentDcaMonthly: 0,
			emergencyFundConfig: {
				targetAmountOverride: 12_000,
				targetMonths: 6,
				catchUpHorizonMonths: 12,
			},
		});
		// available = 200; monthlyNeed = 1000; capped to 200
		expect(result).toMatchObject({
			mode: "monthly",
			monthlyNeed: 1_000,
			availableCashMonthly: 200,
			amountToAdd: 200,
		});
	});
});

describe("emergencyFundSurplusRecommendationCopy", () => {
	it("returns null for none / missing", () => {
		expect(emergencyFundSurplusRecommendationCopy(null, formatEuro)).toBeNull();
		expect(
			emergencyFundSurplusRecommendationCopy(
				{
					mode: "none",
					gapEuro: 0,
					targetEuro: 12_000,
					livretBalance: 12_000,
					availableCashMonthly: 2_000,
					rawSavings: 2_000,
					plannedInvestmentDcaMonthly: 0,
					plannedLivretDcaMonthly: 0,
					catchUpHorizonMonths: 12,
					monthlyNeed: 0,
					amountToAdd: 0,
				},
				formatEuro,
			),
		).toBeNull();
	});

	it("formats oneshot copy with gap and target", () => {
		const copy = emergencyFundSurplusRecommendationCopy(
			{
				mode: "oneshot",
				gapEuro: 2_000,
				targetEuro: 12_000,
				livretBalance: 10_000,
				availableCashMonthly: 2_500,
				rawSavings: 3_000,
				plannedInvestmentDcaMonthly: 500,
				plannedLivretDcaMonthly: 0,
				catchUpHorizonMonths: 12,
				monthlyNeed: 166.67,
				amountToAdd: 2_000,
			},
			formatEuro,
		);
		expect(copy).toMatch(/dépose 2000 €/);
		expect(copy).toMatch(/Hors enveloppe DCA/);
	});

	it("formats monthly copy with need, prévu, and à ajouter", () => {
		const copy = emergencyFundSurplusRecommendationCopy(
			{
				mode: "monthly",
				gapEuro: 11_000,
				targetEuro: 12_000,
				livretBalance: 1_000,
				availableCashMonthly: 2_500,
				rawSavings: 3_000,
				plannedInvestmentDcaMonthly: 500,
				plannedLivretDcaMonthly: 400,
				catchUpHorizonMonths: 12,
				monthlyNeed: 916.67,
				amountToAdd: 516.67,
			},
			formatEuro,
		);
		expect(copy).toMatch(/ajoute 516\.67 € \/ mois/);
		expect(copy).toMatch(/déjà prévu LIVRET 400 €/);
		expect(copy).toMatch(/Hors enveloppe DCA/);
	});
});
