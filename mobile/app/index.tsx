import { summarizeBudget } from "@patrimo/core/budget";
import {
	computeEmergencyFundHealth,
	sumLivretMarketValue,
} from "@patrimo/core/emergency-fund";
import { formatEuro, formatPercent } from "@patrimo/core/format";
import { manualPricesToPriceStore } from "@patrimo/core/manual-prices";
import {
	annualizedVolatility,
	maxDrawdown,
	sharpeRatio,
} from "@patrimo/core/performance";
import { buildPortfolio, computeNetWorth } from "@patrimo/core/portfolio";
import {
	aggregateHistory,
	buildHistorySeries,
} from "@patrimo/core/portfolio-history";
import { ScrollView, Text, useColorScheme, View } from "react-native";
import { EmergencyFundCard } from "../lib/emergency-fund-card";
import { RiskBadges } from "../lib/risk-badges";
import { shared, useThemeColors } from "../lib/theme";
import { useWorkbook } from "../lib/use-workbook";

export default function DashboardScreen() {
	const isDark = useColorScheme() === "dark";
	const t = useThemeColors(isDark);
	const { workbook, prices, priceStore, loading, error } = useWorkbook();

	if (loading) {
		return (
			<View style={[shared.emptyState, { backgroundColor: t.bg }]}>
				<Text style={[shared.emptyText, { color: t.textSecondary }]}>
					Chargement...
				</Text>
			</View>
		);
	}

	if (error || !workbook) {
		return (
			<View style={[shared.emptyState, { backgroundColor: t.bg }]}>
				<Text style={[shared.emptyText, { color: t.textSecondary }]}>
					{error ??
						"Connecte ton Google Drive dans les réglages pour commencer."}
				</Text>
			</View>
		);
	}

	let portfolio: ReturnType<typeof buildPortfolio>;
	try {
		portfolio = buildPortfolio(workbook, prices);
	} catch (e) {
		console.log(
			"[Dashboard] buildPortfolio error:",
			e instanceof Error ? e.message : e,
		);
		return (
			<View style={[shared.emptyState, { backgroundColor: t.bg }]}>
				<Text style={[shared.emptyText, { color: t.textSecondary }]}>
					Erreur lors du calcul du portefeuille. Vérifie les données.
				</Text>
			</View>
		);
	}
	const { totals } = portfolio;
	const { realEstateEquity, netWorth } = computeNetWorth(
		portfolio,
		workbook.properties,
	);
	const hasRealEstate = realEstateEquity > 0;
	const livretBalance = sumLivretMarketValue(portfolio.accounts);
	const { depensesMensuelles } = summarizeBudget(workbook.budget);
	const emergencyFund = computeEmergencyFundHealth(
		livretBalance,
		depensesMensuelles,
	);

	const history = buildHistorySeries(
		workbook,
		priceStore,
		manualPricesToPriceStore(workbook.manualPrices),
	);
	const points = aggregateHistory(history);
	const volatility = annualizedVolatility(points);
	const sharpe = sharpeRatio(points);
	const drawdown = maxDrawdown(points);

	return (
		<ScrollView
			style={{ flex: 1, backgroundColor: t.bg }}
			contentContainerStyle={{ padding: 16 }}
		>
			<View style={{ marginBottom: 24 }}>
				<Text
					style={[shared.label, { color: t.textSecondary, marginBottom: 4 }]}
				>
					{hasRealEstate ? "Patrimoine net total" : "Patrimoine net"}
				</Text>
				<Text style={[shared.bigNumber, { color: t.text }]}>
					{formatEuro(netWorth)}
				</Text>
				{hasRealEstate && (
					<Text style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>
						{formatEuro(totals.marketValue)} placements +{" "}
						{formatEuro(realEstateEquity)} immobilier
					</Text>
				)}
			</View>

			<View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
				<StatCard
					label="Investi"
					value={formatEuro(totals.costBasis)}
					theme={t}
				/>
				{hasRealEstate && (
					<StatCard
						label="Immobilier (équité)"
						value={formatEuro(realEstateEquity)}
						theme={t}
					/>
				)}
				<StatCard
					label="Plus-value"
					value={formatEuro(totals.totalReturn)}
					valueColor={totals.totalReturn >= 0 ? t.success : t.danger}
					theme={t}
				/>
			</View>

			<View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
				<StatCard
					label="Rendement"
					value={formatPercent(totals.totalReturnPct)}
					valueColor={totals.totalReturnPct >= 0 ? t.success : t.danger}
					theme={t}
				/>
				<StatCard
					label="Frais payés"
					value={formatEuro(totals.fees)}
					theme={t}
				/>
			</View>

			<EmergencyFundCard health={emergencyFund} theme={t} />

			<RiskBadges
				volatility={volatility}
				sharpe={sharpe}
				drawdown={drawdown.value}
				theme={t}
			/>

			<View style={[shared.card, { backgroundColor: t.card }]}>
				<Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
					Répartition par enveloppe
				</Text>
				{portfolio.accounts.map((account, i) => (
					<View
						key={account.accountId}
						style={[
							shared.row,
							{
								paddingVertical: 10,
								borderTopWidth: i > 0 ? 1 : 0,
								borderTopColor: t.cardBorder,
							},
						]}
					>
						<Text style={{ color: t.textSecondary, fontSize: 14 }}>
							{account.accountId}
						</Text>
						<Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
							{formatEuro(account.marketValue)}
						</Text>
					</View>
				))}
			</View>
		</ScrollView>
	);
}

function StatCard({
	label,
	value,
	valueColor,
	theme: t,
}: {
	label: string;
	value: string;
	valueColor?: string;
	theme: ReturnType<typeof useThemeColors>;
}) {
	return (
		<View
			style={[
				shared.card,
				{ flex: 1, backgroundColor: t.card, marginBottom: 0 },
			]}
		>
			<Text style={[shared.label, { color: t.textSecondary, marginBottom: 6 }]}>
				{label}
			</Text>
			<Text
				style={{ fontSize: 18, fontWeight: "600", color: valueColor ?? t.text }}
			>
				{value}
			</Text>
		</View>
	);
}
