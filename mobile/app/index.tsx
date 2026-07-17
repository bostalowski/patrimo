import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { formatEuro, formatPercent } from "@patrimo/core/format";

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { workbook, prices, loading, error } = useWorkbook();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <Text className="text-zinc-400">Chargement...</Text>
      </View>
    );
  }

  if (error || !workbook) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950 px-6">
        <Text className="text-zinc-400 text-center">
          {error ?? "Configurez votre fichier Excel dans les réglages."}
        </Text>
      </View>
    );
  }

  const portfolio = buildPortfolio(workbook, prices);
  const { totals } = portfolio;

  return (
    <ScrollView
      className={isDark ? "flex-1 bg-zinc-950" : "flex-1 bg-white"}
      contentContainerStyle={{ padding: 16 }}
    >
      <View className="mb-6">
        <Text className={isDark ? "text-zinc-400 text-sm" : "text-zinc-500 text-sm"}>
          Patrimoine net
        </Text>
        <Text className={isDark ? "text-white text-3xl font-bold" : "text-zinc-900 text-3xl font-bold"}>
          {formatEuro(totals.marketValue)}
        </Text>
      </View>

      <View className="flex-row gap-4 mb-6">
        <StatCard
          label="Investi"
          value={formatEuro(totals.costBasis)}
          isDark={isDark}
        />
        <StatCard
          label="Plus-value"
          value={formatEuro(totals.totalReturn)}
          color={totals.totalReturn >= 0 ? "emerald" : "rose"}
          isDark={isDark}
        />
      </View>

      <View className="flex-row gap-4 mb-6">
        <StatCard
          label="Rendement"
          value={formatPercent(totals.totalReturnPct)}
          color={totals.totalReturnPct >= 0 ? "emerald" : "rose"}
          isDark={isDark}
        />
        <StatCard
          label="Frais payés"
          value={formatEuro(totals.fees)}
          isDark={isDark}
        />
      </View>

      <View className={isDark ? "bg-zinc-900 rounded-xl p-4" : "bg-zinc-100 rounded-xl p-4"}>
        <Text className={isDark ? "text-zinc-300 font-semibold mb-3" : "text-zinc-700 font-semibold mb-3"}>
          Répartition par enveloppe
        </Text>
        {portfolio.accounts.map((account) => (
          <View key={account.accountId} className="flex-row justify-between py-2">
            <Text className={isDark ? "text-zinc-300" : "text-zinc-700"}>
              {account.accountId}
            </Text>
            <Text className={isDark ? "text-zinc-100 font-medium" : "text-zinc-900 font-medium"}>
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
  color,
  isDark,
}: {
  label: string;
  value: string;
  color?: "emerald" | "rose";
  isDark: boolean;
}) {
  const valueColor = color === "emerald"
    ? "text-emerald-400"
    : color === "rose"
      ? "text-rose-400"
      : isDark
        ? "text-zinc-100"
        : "text-zinc-900";

  return (
    <View className={`flex-1 rounded-xl p-4 ${isDark ? "bg-zinc-900" : "bg-zinc-100"}`}>
      <Text className={isDark ? "text-zinc-400 text-xs" : "text-zinc-500 text-xs"}>
        {label}
      </Text>
      <Text className={`text-lg font-semibold ${valueColor}`}>
        {value}
      </Text>
    </View>
  );
}
