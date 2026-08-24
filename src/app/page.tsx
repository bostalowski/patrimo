import {
	computeEmergencyFundHealth,
	sumLivretMarketValue,
} from "@patrimo/core/emergency-fund";
import { assessFinancialGoals } from "@patrimo/core/financial-goals";
import { buildNextEuroPlan } from "@patrimo/core/next-euro-plan";
import { computeNetWorth, portfolioByEnvelope } from "@patrimo/core/portfolio";
import { computeSavingsCapacity } from "@patrimo/core/savings-capacity";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { EmergencyFundCard } from "@/components/emergency-fund-card";
import { GoalsSummaryCard } from "@/components/goals-summary-card";
import { NextEuroPlanCard } from "@/components/next-euro-plan-card";
import { PerformanceSection } from "@/components/performance-section";
import { SavingsCapacityCard } from "@/components/savings-capacity-card";
import { SyncButton } from "@/components/sync-button";
import {
	Card,
	CardBody,
	CardHeader,
	CardTitle,
	CardValue,
} from "@/components/ui/card";
import { BENCHMARKS } from "@/lib/benchmarks";
import { summarizeBudget } from "@/lib/budget";
import { getInflationRate, getSyncIntervalMinutes } from "@/lib/config";
import { loadWorkbook } from "@/lib/excel";
import { realCostBasis } from "@/lib/inflation";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { aggregateHistory, buildHistorySeries } from "@/lib/portfolio-history";
import {
	readBenchmarks,
	readManualPrices,
	readPriceMap,
	readPrices,
	readRetirementProfile,
	readSyncMeta,
} from "@/lib/store";
import { formatEuro, formatPercent, signClass } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
	requireExcelConfigured();
	const workbook = loadWorkbook();
	const [priceMap, priceStore, manualStore, benchmarkStore, syncMeta, profile] =
		await Promise.all([
			readPriceMap(workbook.assets),
			readPrices(),
			readManualPrices(),
			readBenchmarks(),
			readSyncMeta(),
			readRetirementProfile(),
		]);
	const portfolio = buildPortfolio(workbook, priceMap);
	const history = buildHistorySeries(workbook, priceStore, manualStore);

	const { realEstateEquity, netWorth } = computeNetWorth(
		portfolio,
		workbook.properties,
	);

	const inflationRate = getInflationRate();
	const today = new Date().toISOString().slice(0, 10);
	const realInvested = realCostBasis(
		aggregateHistory(history),
		today,
		inflationRate,
	);
	const realUnrealizedPnL = portfolio.totals.marketValue - realInvested;

	const benchmarks = BENCHMARKS.filter((b) => benchmarkStore[b.id]).map(
		(b) => ({
			id: b.id,
			label: b.label,
			history: benchmarkStore[b.id],
		}),
	);

	const donut = portfolio.assets
		.filter((p) => p.marketValue > 0)
		.map((p) => ({ name: p.asset?.label ?? p.assetId, value: p.marketValue }));

	const livretBalance = sumLivretMarketValue(portfolio.accounts);
	const { revenusMensuels, depensesMensuelles } = summarizeBudget(
		workbook.budget,
	);
	const emergencyFund = computeEmergencyFundHealth(
		livretBalance,
		depensesMensuelles,
	);
	const savingsCapacity = computeSavingsCapacity({
		revenusMensuels,
		depensesMensuelles,
		livretBalance,
		dca: workbook.dca,
		emergencyFundConfig: workbook.emergencyFundConfig,
	});
	const goalsAssessment = assessFinancialGoals({
		goals: workbook.financialGoals ?? [],
		portfolio,
		dcaConfigs: workbook.dca,
		profile,
		inflationRate,
	});
	const nextEuroPlan = buildNextEuroPlan({
		targets: workbook.diversificationTargets ?? [],
		positions: portfolio.assets,
		dca: workbook.dca,
		geographicAllocations: workbook.geographicAllocations ?? [],
		sectorAllocations: workbook.sectorAllocations ?? [],
		assets: workbook.assets,
		accounts: portfolio.accounts,
		monthlyExpenses: depensesMensuelles,
		revenusMensuels,
		emergencyFundConfig: workbook.emergencyFundConfig,
		portfolioByEnvelope: portfolioByEnvelope(portfolio.accounts),
	});
	const assetLabels = Object.fromEntries(
		workbook.assets.map((a) => [a.id, a.label]),
	);

	return (
		<div className="space-y-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">
						{workbook.transactions.length} transactions •{" "}
						{portfolio.assets.length} actifs en portefeuille.
					</p>
				</div>
				<SyncButton
					lastSync={syncMeta.lastSync}
					intervalMinutes={getSyncIntervalMinutes()}
				/>
			</header>

			<div
				className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${realEstateEquity > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}
			>
				<Card>
					<CardHeader>
						<CardTitle>
							{realEstateEquity > 0 ? "Patrimoine net total" : "Valeur totale"}
						</CardTitle>
						<CardValue>{formatEuro(netWorth)}</CardValue>
						{realEstateEquity > 0 && (
							<p className="text-xs text-zinc-500">
								Dont {formatEuro(portfolio.totals.marketValue)} placements +{" "}
								{formatEuro(realEstateEquity)} immobilier
							</p>
						)}
					</CardHeader>
				</Card>
				{realEstateEquity > 0 && (
					<Card>
						<CardHeader>
							<CardTitle>Immobilier (équité)</CardTitle>
							<CardValue>{formatEuro(realEstateEquity)}</CardValue>
						</CardHeader>
					</Card>
				)}
				<Card>
					<CardHeader>
						<CardTitle>Capital investi (net)</CardTitle>
						<CardValue>{formatEuro(portfolio.totals.netInvested)}</CardValue>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>P&amp;L latente</CardTitle>
						<CardValue className={signClass(portfolio.totals.unrealizedPnL)}>
							{formatEuro(portfolio.totals.unrealizedPnL)}
						</CardValue>
					</CardHeader>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Plus-value réelle (€ d&apos;aujourd&apos;hui)</CardTitle>
						<CardValue className={signClass(realUnrealizedPnL)}>
							{formatEuro(realUnrealizedPnL)}
						</CardValue>
						<p className="text-xs text-zinc-500">
							Coût réévalué {formatEuro(realInvested)} • inflation{" "}
							{formatPercent(inflationRate)}
						</p>
					</CardHeader>
				</Card>
			</div>

			<div className="flex flex-wrap gap-4">
				<EmergencyFundCard health={emergencyFund} />
				<SavingsCapacityCard capacity={savingsCapacity} />
				<NextEuroPlanCard
					plan={nextEuroPlan}
					variant="summary"
					assetLabels={assetLabels}
				/>
				<GoalsSummaryCard assessment={goalsAssessment} />
			</div>

			<PerformanceSection history={history} benchmarks={benchmarks} />

			<Card>
				<CardHeader>
					<CardTitle>Répartition actuelle</CardTitle>
				</CardHeader>
				<CardBody>
					<AllocationDonut data={donut} />
				</CardBody>
			</Card>
		</div>
	);
}
