import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { formatEuro } from "@patrimo/core/format";

export default function ComptesScreen() {
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
  const accountMap = new Map(workbook.accounts.map((a) => [a.id, a]));

  return (
    <ScrollView
      className={isDark ? "flex-1 bg-zinc-950" : "flex-1 bg-white"}
      contentContainerStyle={{ padding: 16 }}
    >
      {portfolio.accounts.map((account) => {
        const meta = accountMap.get(account.accountId);
        return (
          <View
            key={account.accountId}
            className={`rounded-xl p-4 mb-3 ${isDark ? "bg-zinc-900" : "bg-zinc-100"}`}
          >
            <View className="flex-row justify-between mb-1">
              <View>
                <Text className={isDark ? "text-zinc-100 font-medium" : "text-zinc-900 font-medium"}>
                  {meta?.label ?? account.accountId}
                </Text>
                <Text className={isDark ? "text-zinc-500 text-xs" : "text-zinc-400 text-xs"}>
                  {account.envelope}
                </Text>
              </View>
              <Text className={isDark ? "text-zinc-100 font-semibold" : "text-zinc-900 font-semibold"}>
                {formatEuro(account.marketValue)}
              </Text>
            </View>
            <View className="flex-row justify-between mt-2">
              <Text className={isDark ? "text-zinc-400 text-sm" : "text-zinc-500 text-sm"}>
                Investi: {formatEuro(account.costBasis)}
              </Text>
              <Text
                className={`text-sm ${
                  account.unrealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {account.unrealizedPnL >= 0 ? "+" : ""}
                {formatEuro(account.unrealizedPnL)}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
