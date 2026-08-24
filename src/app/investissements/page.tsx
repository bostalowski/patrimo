import { portfolioByEnvelope } from "@patrimo/core/portfolio";
import { buildMonthlyDcaTilt } from "@patrimo/core/monthly-dca-tilt";
import { computeSavingsCapacity } from "@patrimo/core/savings-capacity";
import { sumLivretMarketValue } from "@patrimo/core/emergency-fund";
import { SavingsCapacityOverCommitBanner, SavingsCapacityEmergencyOverBanner } from "@/components/savings-capacity-overcommit-banner";
import { summarizeBudget } from "@/lib/budget";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import type { DcaConfig } from "@/lib/schema";
import {
	readDcaConfigs,
	readPriceMap,
	readRetirementProfile,
} from "@/lib/store";
import { InvestissementsClient } from "./investissements-client";

export const dynamic = "force-dynamic";

const DEFAULT_PEA_CONFIG: DcaConfig = {
	id: "pea",
	label: "PEA — DCA mensuel",
	envelope: "PEA",
	amount: 500,
	frequency: "MENSUEL",
	lines: [
		{ label: "Mondes", assetIds: ["WPEA"], targetPct: 0.75 },
		{ label: "Émergents", assetIds: ["PLEM"], targetPct: 0.25 },
	],
};

export default async function InvestissementsPage() {
	requireExcelConfigured();
	const workbook = loadWorkbook();

	const [priceMap, configs, profile] = await Promise.all([
		readPriceMap(workbook.assets),
		readDcaConfigs(),
		readRetirementProfile(),
	]);
	const portfolio = buildPortfolio(workbook, priceMap);
	const envelopeBreakdown = portfolioByEnvelope(portfolio.accounts);
	const livretBalance = sumLivretMarketValue(portfolio.accounts);
	const { revenusMensuels, depensesMensuelles } = summarizeBudget(
		workbook.budget,
	);
	const savingsCapacity = computeSavingsCapacity({
		revenusMensuels,
		depensesMensuelles,
		livretBalance,
		dca: configs,
		emergencyFundConfig: workbook.emergencyFundConfig,
	});

	const monthlyTilt = buildMonthlyDcaTilt({
		targets: workbook.diversificationTargets ?? [],
		positions: portfolio.assets,
		dca: configs,
		geographicAllocations: workbook.geographicAllocations ?? [],
		sectorAllocations: workbook.sectorAllocations ?? [],
		assets: workbook.assets,
		portfolioByEnvelope: envelopeBreakdown,
	});

	const peaSeed =
		workbook.assets.some((a) => a.id === "WPEA") &&
		workbook.assets.some((a) => a.id === "PLEM")
			? DEFAULT_PEA_CONFIG
			: null;

	const priceMapRecord: Record<string, number> = Object.fromEntries(priceMap);

	return (
		<div className="space-y-8">
			<header className="space-y-1.5">
				<h1 className="text-2xl font-semibold tracking-tight">
					Investissements
				</h1>
				<p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
					Configure tes plans DCA, exécute tes ordres, gère ton profil retraite
					et tes biens immobiliers.
				</p>
			</header>

			<SavingsCapacityOverCommitBanner capacity={savingsCapacity} />
			<SavingsCapacityEmergencyOverBanner capacity={savingsCapacity} />

			<InvestissementsClient
				configs={configs}
				portfolioByEnvelope={envelopeBreakdown}
				assets={workbook.assets}
				seedConfig={peaSeed}
				priceMap={priceMapRecord}
				monthlyTilt={monthlyTilt}
				initialProfile={{
					birthDate: profile.birthDate?.toISOString().slice(0, 10),
					targetRetirementAge: profile.targetRetirementAge,
					estimatedPublicPension: profile.estimatedPublicPension,
				}}
				properties={workbook.properties.map((p) => ({
					...p,
					dateAcquisition: p.dateAcquisition?.toISOString(),
					dateDebutCredit: p.dateDebutCredit?.toISOString(),
				}))}
			/>
		</div>
	);
}
