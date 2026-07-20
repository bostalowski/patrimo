import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { formatEuro, formatPercent } from "@patrimo/core/format";
import { useThemeColors, shared } from "../lib/theme";

export default function ActifsScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading } = useWorkbook();

  if (loading || !workbook) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  let portfolio: ReturnType<typeof buildPortfolio>;
  try {
    portfolio = buildPortfolio(workbook, prices);
  } catch (e) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Erreur de calcul portefeuille.
        </Text>
      </View>
    );
  }
  const priceMap = prices;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {workbook.assets.map((asset) => {
          const position = portfolio.assets.find((p) => p.assetId === asset.id);
          const currentPrice = priceMap.get(asset.id);

          return (
            <View key={asset.id} style={[shared.card, { backgroundColor: t.card }]}>
              <View style={[shared.row, { marginBottom: 6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 15, fontWeight: "500" }}>
                    {asset.label}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                    {asset.id} · {asset.type}
                  </Text>
                </View>
                {currentPrice != null && (
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                    {formatEuro(currentPrice)}
                  </Text>
                )}
              </View>

              {position && position.quantity > 0 && (
                <View
                  style={[
                    shared.row,
                    { paddingTop: 8, borderTopWidth: 1, borderTopColor: t.cardBorder },
                  ]}
                >
                  <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                    {position.quantity % 1 === 0
                      ? `${position.quantity} parts`
                      : `${position.quantity.toFixed(6)}`}
                    {" · "}PRU {formatEuro(position.pru)}
                  </Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: t.text, fontSize: 13, fontWeight: "600" }}>
                      {formatEuro(position.marketValue)}
                    </Text>
                    {position.totalReturnPct !== 0 && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: position.unrealizedPnL >= 0 ? t.success : t.danger,
                        }}
                      >
                        {position.unrealizedPnL >= 0 ? "+" : ""}
                        {formatPercent(position.totalReturnPct)}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <View style={{ flexDirection: "row", marginTop: 6, gap: 8 }}>
                <Text style={{ color: t.textMuted, fontSize: 11 }}>
                  Source: {asset.source}
                  {asset.param ? ` · ${asset.param}` : ""}
                </Text>
              </View>
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.push("/add-asset")}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.accentBg,
          alignItems: "center",
          justifyContent: "center",
          elevation: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
