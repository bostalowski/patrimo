import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWorkbook } from "../lib/use-workbook";
import { formatEuro } from "@patrimo/core/format";
import { useThemeColors, shared } from "../lib/theme";

export default function TransactionsScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, transactionKeys, loading } = useWorkbook();

  if (loading || !workbook) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  // workbook.transactions is sorted ascending; we pair each tx with its Excel row key
  // then sort descending for display — the row key stays attached to the right tx
  const indexed = workbook.transactions.map((tx, i) => ({ tx, key: transactionKeys[i] ?? `idx${i}` }));
  const sorted = [...indexed].sort((a, b) => b.tx.date.getTime() - a.tx.date.getTime());

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {sorted.length === 0 && (
          <Text style={[shared.emptyText, { color: t.textSecondary, textAlign: "center", marginTop: 48 }]}>
            Aucune transaction
          </Text>
        )}
        {sorted.map(({ tx, key: txKey }) => {
          const dateStr = tx.date.toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          const typeColor =
            tx.type === "ACHAT" || tx.type === "DEPOT"
              ? t.success
              : tx.type === "VENTE" || tx.type === "RETRAIT"
              ? t.danger
              : t.textSecondary;

          return (
            <View
              key={txKey}
              style={[
                shared.card,
                { backgroundColor: t.card, flexDirection: "row", alignItems: "center" },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <Text style={{ color: typeColor, fontSize: 12, fontWeight: "600" }}>
                    {tx.type}
                  </Text>
                  {tx.actif ? (
                    <Text style={{ color: t.text, fontSize: 14, fontWeight: "500" }}>
                      {tx.actif}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: t.textMuted, fontSize: 12 }}>
                  {tx.compte} · {dateStr}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {tx.prixUnitaire != null && tx.quantite > 0 ? (
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                    {formatEuro(tx.prixUnitaire * tx.quantite)}
                  </Text>
                ) : tx.quantite > 0 ? (
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                    ×{tx.quantite}
                  </Text>
                ) : null}
                {tx.frais > 0 && (
                  <Text style={{ color: t.danger, fontSize: 11 }}>
                    frais {formatEuro(tx.frais)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.push("/add-transaction")}
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
