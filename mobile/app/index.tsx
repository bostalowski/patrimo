import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio, computeNetWorth } from "@patrimo/core/portfolio";
import { formatEuro, formatPercent } from "@patrimo/core/format";
import { useThemeColors, shared } from "../lib/theme";

export default function DashboardScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading, error } = useWorkbook();

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
          {error ?? "Connecte ton Google Drive dans les réglages pour commencer."}
        </Text>
      </View>
    );
  }

  let portfolio: ReturnType<typeof buildPortfolio>;
  try {
    portfolio = buildPortfolio(workbook, prices);
  } catch (e) {
    console.log("[Dashboard] buildPortfolio error:", e instanceof Error ? e.message : e);
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={{ marginBottom: 24 }}>
        <Text style={[shared.label, { color: t.textSecondary, marginBottom: 4 }]}>
          {hasRealEstate ? "Patrimoine net total" : "Patrimoine net"}
        </Text>
        <Text style={[shared.bigNumber, { color: t.text }]}>
          {formatEuro(netWorth)}
        </Text>
        {hasRealEstate && (
          <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 4 }}>
            {formatEuro(totals.marketValue)} placements + {formatEuro(realEstateEquity)} immobilier
          </Text>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
        <StatCard label="Investi" value={formatEuro(totals.costBasis)} theme={t} />
        {hasRealEstate && (
          <StatCard label="Immobilier (équité)" value={formatEuro(realEstateEquity)} theme={t} />
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
        <StatCard label="Frais payés" value={formatEuro(totals.fees)} theme={t} />
      </View>

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
    <View style={[shared.card, { flex: 1, backgroundColor: t.card, marginBottom: 0 }]}>
      <Text style={[shared.label, { color: t.textSecondary, marginBottom: 6 }]}>
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: "600", color: valueColor ?? t.text }}>
        {value}
      </Text>
    </View>
  );
}
