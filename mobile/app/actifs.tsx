import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { formatEuro, formatPercent } from "@patrimo/core/format";

export default function ActifsScreen() {
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

  return (
    <ScrollView
      className={isDark ? "flex-1 bg-zinc-950" : "flex-1 bg-white"}
      contentContainerStyle={{ padding: 16 }}
    >
      {portfolio.assets
        .filter((p) => p.marketValue > 0)
        .map((position) => (
          <View
            key={position.assetId}
            className={`rounded-xl p-4 mb-3 ${isDark ? "bg-zinc-900" : "bg-zinc-100"}`}
          >
            <View className="flex-row justify-between mb-1">
              <Text className={isDark ? "text-zinc-100 font-medium" : "text-zinc-900 font-medium"}>
                {position.asset?.label ?? position.assetId}
              </Text>
              <Text className={isDark ? "text-zinc-100 font-medium" : "text-zinc-900 font-medium"}>
                {formatEuro(position.marketValue)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className={isDark ? "text-zinc-400 text-sm" : "text-zinc-500 text-sm"}>
                {position.asset?.type} · PRU {formatEuro(position.pru)}
              </Text>
              <Text
                className={`text-sm ${
                  position.unrealizedPnL >= 0
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {formatPercent(position.totalReturnPct)}
              </Text>
            </View>
          </View>
        ))}
    </ScrollView>
  );
}
