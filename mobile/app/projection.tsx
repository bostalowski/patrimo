import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { projectInvestment, SCENARIO_PRESETS } from "@patrimo/core/projection";
import { formatEuro } from "@patrimo/core/format";

export default function ProjectionScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { workbook, prices, loading } = useWorkbook();

  if (loading || !workbook) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <Text className="text-zinc-400">Chargement...</Text>
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
      className={isDark ? "flex-1 bg-zinc-950" : "flex-1 bg-white"}
      contentContainerStyle={{ padding: 16 }}
    >
      <Text className={isDark ? "text-zinc-300 mb-4" : "text-zinc-600 mb-4"}>
        Projection sur 20 ans avec 500 €/mois
      </Text>

      {projections.map(({ key, label, rate, result }) => (
        <View
          key={key}
          className={`rounded-xl p-4 mb-3 ${isDark ? "bg-zinc-900" : "bg-zinc-100"}`}
        >
          <View className="flex-row justify-between mb-2">
            <Text className={isDark ? "text-zinc-100 font-medium" : "text-zinc-900 font-medium"}>
              {label}
            </Text>
            <Text className={isDark ? "text-zinc-400 text-sm" : "text-zinc-500 text-sm"}>
              {(rate * 100).toFixed(0)}% / an
            </Text>
          </View>
          <View className="flex-row justify-between">
            <View>
              <Text className={isDark ? "text-zinc-400 text-xs" : "text-zinc-500 text-xs"}>
                Valeur finale
              </Text>
              <Text className={isDark ? "text-zinc-100 font-semibold" : "text-zinc-900 font-semibold"}>
                {formatEuro(result.finalValue)}
              </Text>
            </View>
            <View className="items-end">
              <Text className={isDark ? "text-zinc-400 text-xs" : "text-zinc-500 text-xs"}>
                Valeur réelle
              </Text>
              <Text className={isDark ? "text-zinc-300" : "text-zinc-700"}>
                {formatEuro(result.finalRealValue)}
              </Text>
            </View>
          </View>
          <View className="mt-2">
            <Text className="text-emerald-400 text-sm">
              +{formatEuro(result.gain)} de gains
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
