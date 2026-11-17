import { describe, expect, it } from "vitest";
import type { Portfolio } from "./portfolio";
import type { Property } from "./schema";
import { projectProperty, propertySnapshot } from "./realestate/projection";
import { buildRetirementSources, aggregateIncludedRealEstate, addRealEstateEquityToPoints } from "./retraite";

const NOW = new Date(Date.UTC(2026, 0, 1));

function rentalProperty(overrides: Partial<Property> = {}): Property {
	return {
		id: "loc1",
		label: "Locatif",
		detention: "DIRECT",
		regime: "IR_REEL",
		partDetenue: 1,
		dateAcquisition: new Date(Date.UTC(2026, 0, 1)),
		prixAchat: 250_000,
		fraisNotaire: 20_000,
		travaux: 0,
		valeurActuelle: 250_000,
		revaloAnnuelle: 0.02,
		montantEmprunte: 200_000,
		tauxCredit: 0.035,
		dureeMois: 240,
		dateDebutCredit: new Date(Date.UTC(2026, 0, 1)),
		tauxAssurance: 0.003,
		modeAssurance: "CRD",
		assuranceMensuelle: 0,
		assurancePaliers: [],
		loyerMensuelHC: 1_200,
		chargesNonRecupAnnuelles: 1_000,
		taxeFonciere: 1_200,
		vacancePct: 0,
		fraisGestionPct: 0.07,
		tmiAssocie: 0.3,
		partAmortissable: 0.85,
		dureeAmortissement: 30,
		...overrides,
	};
}

function portfolioWithLivret(marketValue: number): Portfolio {
	return {
		assets: [],
		accounts: [
			{
				accountId: "livret-1",
				envelope: "LIVRET",
				positions: [],
				marketValue,
				costBasis: marketValue,
				unrealizedPnL: 0,
				realizedPnL: 0,
				realizedIncome: 0,
				cashInterest: 0,
				cashInterestRecorded: 0,
				cashInterestEstimated: 0,
			},
		],
		totals: {
			marketValue,
			costBasis: marketValue,
			netInvested: marketValue,
			unrealizedPnL: 0,
			realizedPnL: 0,
			realizedIncome: 0,
			totalReturn: 0,
			totalReturnPct: 0,
			fees: 0,
		},
	};
}

describe("buildRetirementSources includeRealEstate", () => {
	const property = rentalProperty();
	const base = {
		portfolio: portfolioWithLivret(10_000),
		dcaConfigs: [],
		properties: [property],
		horizonYears: 10,
		inflationRate: 0.02,
		now: NOW,
	};

	it("E1: includeRealEstate false zeros equity and rent even with locatives", () => {
		const included = buildRetirementSources(base);
		expect(included.scenarios[0].realEstateEquityNominal).toBeGreaterThan(0);
		expect(included.monthlyRealEstateNet).not.toBe(0);

		const excluded = buildRetirementSources({
			...base,
			includeRealEstate: false,
		});
		expect(excluded.monthlyRealEstateNet).toBe(0);
		for (const scenario of excluded.scenarios) {
			expect(scenario.realEstateEquityNominal).toBe(0);
			expect(scenario.realEstateEquityReal).toBe(0);
			expect(scenario.totalNominal).toBe(scenario.totalFinancialNominal);
			expect(scenario.totalReal).toBe(scenario.totalFinancialReal);
			expect(scenario.totalFinancialNominal).toBe(
				included.scenarios.find((s) => s.scenario === scenario.scenario)
					?.totalFinancialNominal,
			);
		}
	});

	it("E2: omitted and true keep current non-RP inclusion", () => {
		const omitted = buildRetirementSources(base);
		const explicit = buildRetirementSources({
			...base,
			includeRealEstate: true,
		});
		const proj = projectProperty(property, {
			horizonYears: 10,
			inflationRate: 0.02,
			now: NOW,
		});
		expect(omitted.monthlyRealEstateNet).toBeCloseTo(
			proj.years[proj.years.length - 1].cashFlowAfterTax / 12,
			4,
		);
		expect(omitted.scenarios[0].realEstateEquityNominal).toBeCloseTo(
			proj.finalEquity,
			4,
		);
		expect(explicit.monthlyRealEstateNet).toBe(omitted.monthlyRealEstateNet);
		expect(explicit.scenarios[0].realEstateEquityNominal).toBe(
			omitted.scenarios[0].realEstateEquityNominal,
		);
		expect(explicit.scenarios[0].totalNominal).toBe(
			explicit.scenarios[0].totalFinancialNominal +
				explicit.scenarios[0].realEstateEquityNominal,
		);
	});

	it("E3: horizon 0 uses snapshot CF when included, 0 when excluded", () => {
		const withHorizon0 = { ...base, horizonYears: 0 };
		const included = buildRetirementSources(withHorizon0);
		const snapshot = propertySnapshot(property, NOW);
		expect(included.monthlyRealEstateNet).toBeCloseTo(
			snapshot.monthlyCashFlowAfterTax,
			4,
		);

		const excluded = buildRetirementSources({
			...withHorizon0,
			includeRealEstate: false,
		});
		expect(excluded.monthlyRealEstateNet).toBe(0);
		expect(excluded.scenarios[0].realEstateEquityNominal).toBe(0);
	});
});

describe("aggregateIncludedRealEstate", () => {
	const property = rentalProperty();

	it("N4: RESIDENCE_PRINCIPALE is omitted when include is on", () => {
		const rp = rentalProperty({
			id: "rp",
			regime: "RESIDENCE_PRINCIPALE",
			loyerMensuelHC: 0,
		});
		const result = aggregateIncludedRealEstate({
			properties: [rp],
			horizonYears: 10,
			inflationRate: 0.02,
			now: NOW,
			includeRealEstate: true,
		});
		expect(result.finalEquity).toBe(0);
		expect(result.monthlyNet).toBe(0);
		expect(result.years).toHaveLength(0);
	});

	it("sums locative yearly equity and zeros when include is false", () => {
		const included = aggregateIncludedRealEstate({
			properties: [property],
			horizonYears: 5,
			inflationRate: 0.02,
			now: NOW,
		});
		const proj = projectProperty(property, {
			horizonYears: 5,
			inflationRate: 0.02,
			now: NOW,
		});
		expect(included.finalEquity).toBeCloseTo(proj.finalEquity, 4);
		expect(included.years).toHaveLength(5);
		expect(included.years[0].year).toBe(2026);
		expect(included.years[4].equity).toBeCloseTo(proj.years[4].equity, 4);

		const excluded = aggregateIncludedRealEstate({
			properties: [property],
			horizonYears: 5,
			inflationRate: 0.02,
			now: NOW,
			includeRealEstate: false,
		});
		expect(excluded.finalEquity).toBe(0);
		expect(excluded.monthlyNet).toBe(0);
		expect(excluded.years).toHaveLength(0);
	});
});

describe("addRealEstateEquityToPoints", () => {
	it("adds matching calendar-year equity onto financial points", () => {
		const overlay = addRealEstateEquityToPoints(
			[
				{
					date: "2026-01-01",
					value: 100,
					invested: 100,
					realValue: 90,
				},
				{
					date: "2027-06-01",
					value: 110,
					invested: 100,
					realValue: 95,
				},
			],
			[
				{ year: 2026, equity: 50, realEquity: 40 },
				{ year: 2027, equity: 80, realEquity: 60 },
			],
		);
		expect(overlay[0].value).toBe(150);
		expect(overlay[0].realValue).toBe(130);
		expect(overlay[1].value).toBe(190);
		expect(overlay[1].realValue).toBe(155);
		expect(overlay[1].invested).toBe(100);
	});

	it("uses the last known year for later calendar dates", () => {
		const overlay = addRealEstateEquityToPoints(
			[{ date: "2028-01-01", value: 100, invested: 100, realValue: 90 }],
			[{ year: 2027, equity: 80, realEquity: 60 }],
		);
		expect(overlay[0].value).toBe(180);
	});
});
