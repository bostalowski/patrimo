import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { projectInvestment, SCENARIO_PRESETS } from "@patrimo/core/projection";
import { formatEuro } from "@patrimo/core/format";
import { useThemeColors, shared } from "../lib/theme";

export default function ProjectionScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading } = useWorkbook();

  if (loading || !workbook) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  const portfolio = buildPortfolio(workbook, prices);
  const startBalance = portfolio.totals.marketValue;

  const projections = SCENARIO_PRESETS.map((preset) => {
    const result = projectInvestment({
      startBalance,
      monthlyContribution: 500,
      annualRate: preset.rate,
      years: 20,
      inflationRate: 0.02,
    });
    return { ...preset, result };
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 16 }}>
        Projection sur 20 ans avec 500 €/mois
      </Text>

      {projections.map(({ key, label, rate, result }) => (
        <View key={key} style={[shared.card, { backgroundColor: t.card }]}>
          <View style={[shared.row, { marginBottom: 10 }]}>
            <Text style={{ color: t.text, fontSize: 15, fontWeight: "500" }}>
              {label}
            </Text>
            <Text style={{ color: t.textMuted, fontSize: 13 }}>
              {(rate * 100).toFixed(0)}% / an
            </Text>
          </View>
          <View style={shared.row}>
            <View>
              <Text style={{ color: t.textSecondary, fontSize: 11, marginBottom: 2 }}>
                Valeur finale
              </Text>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: "600" }}>
                {formatEuro(result.finalValue)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: t.textSecondary, fontSize: 11, marginBottom: 2 }}>
                Valeur réelle
              </Text>
              <Text style={{ color: t.textSecondary, fontSize: 15 }}>
                {formatEuro(result.finalRealValue)}
              </Text>
            </View>
          </View>
          <View style={{ marginTop: 8 }}>
            <Text style={{ color: t.success, fontSize: 13, fontWeight: "500" }}>
              +{formatEuro(result.gain)} de gains
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
