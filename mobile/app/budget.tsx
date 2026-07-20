import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { summarizeBudget } from "@patrimo/core/budget";
import { formatEuro, formatPercent } from "@patrimo/core/format";
import { useThemeColors, shared } from "../lib/theme";

export default function BudgetScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, loading, error } = useWorkbook();

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

  const summary = summarizeBudget(workbook.budget);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <KpiCard label="Revenus mensuels" value={formatEuro(summary.revenusMensuels)} theme={t} />
        <KpiCard label="Dépenses" value={formatEuro(summary.depensesMensuelles)} theme={t} />
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <KpiCard label="Épargne" value={formatEuro(summary.epargneMensuelle)} theme={t} />
        <KpiCard label="Restant" value={formatEuro(summary.restant)} valueColor={summary.restant >= 0 ? t.success : t.danger} theme={t} />
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Taux d'épargne" value={formatPercent(summary.tauxEpargne)} theme={t} />
        <View style={{ flex: 1 }} />
      </View>

      {summary.depensesParCategorie.length > 0 && (
        <View style={[shared.card, { backgroundColor: t.card }]}>
          <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
            Dépenses
          </Text>
          {summary.depensesParCategorie.map((item, i) => (
            <View
              key={item.category}
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
                {item.name}
              </Text>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                {formatEuro(item.value)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {summary.epargneParCategorie.length > 0 && (
        <View style={[shared.card, { backgroundColor: t.card }]}>
          <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
            Épargne
          </Text>
          {summary.epargneParCategorie.map((item, i) => (
            <View
              key={item.category}
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
                {item.name}
              </Text>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                {formatEuro(item.value)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function KpiCard({
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
