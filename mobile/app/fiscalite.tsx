import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildRealizedEvents, buildYearlyReports } from "@patrimo/core/fiscalite";
import { formatEuro } from "@patrimo/core/format";
import { useThemeColors, shared } from "../lib/theme";

const KIND_LABELS: Record<string, string> = {
  PV: "Plus-value",
  DIVIDENDE: "Dividende",
  INTERET: "Intérêt",
  RETRAIT: "Retrait",
};

const KIND_COLORS = (t: ReturnType<typeof useThemeColors>) =>
  ({
    PV: t.accent,
    DIVIDENDE: t.success,
    INTERET: t.success,
    RETRAIT: t.danger,
  }) as Record<string, string>;

export default function FiscaliteScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, loading, error } = useWorkbook();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

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

  const events = buildRealizedEvents(workbook);
  const reports = buildYearlyReports(events);

  if (reports.length === 0) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Aucun événement fiscal
        </Text>
      </View>
    );
  }

  const activeYear = selectedYear ?? reports[reports.length - 1].year;
  const currentReport = reports.find((r) => r.year === activeYear);
  const kindColors = KIND_COLORS(t);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {reports.map((r) => {
          const isActive = r.year === activeYear;
          return (
            <TouchableOpacity
              key={r.year}
              onPress={() => setSelectedYear(r.year)}
              style={[
                shared.button,
                {
                  backgroundColor: isActive ? t.accentBg : t.card,
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                },
              ]}
            >
              <Text
                style={[
                  shared.buttonText,
                  { color: isActive ? "#fff" : t.textSecondary },
                ]}
              >
                {r.year}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {currentReport?.envelopes.map((env) => {
        const total = env.realizedPnL + env.dividends + env.interest;
        return (
          <View key={env.envelope} style={[shared.card, { backgroundColor: t.card }]}>
            <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
              {env.envelope}
            </Text>
            <View style={[shared.row, { paddingVertical: 6 }]}>
              <Text style={{ color: t.textSecondary, fontSize: 14 }}>PV réalisées</Text>
              <Text style={{ color: env.realizedPnL >= 0 ? t.success : t.danger, fontSize: 14, fontWeight: "600" }}>
                {formatEuro(env.realizedPnL)}
              </Text>
            </View>
            <View style={[shared.row, { paddingVertical: 6 }]}>
              <Text style={{ color: t.textSecondary, fontSize: 14 }}>Dividendes + intérêts</Text>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                {formatEuro(env.dividends + env.interest)}
              </Text>
            </View>
            <View style={[shared.separator, { backgroundColor: t.cardBorder }]} />
            <View style={[shared.row, { paddingVertical: 6 }]}>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>Total</Text>
              <Text style={{ color: total >= 0 ? t.success : t.danger, fontSize: 15, fontWeight: "700" }}>
                {formatEuro(total)}
              </Text>
            </View>
          </View>
        );
      })}

      {currentReport && (
        <View style={[shared.card, { backgroundColor: t.card }]}>
          <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
            Détail des événements
          </Text>
          {currentReport.envelopes.flatMap((env) => env.events).map((event, i) => {
            const dateStr = event.date.toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
            });
            return (
              <View
                key={`${event.accountId}-${event.assetId}-${event.kind}-${i}`}
                style={{
                  paddingVertical: 10,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: t.cardBorder,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <Text style={{ color: kindColors[event.kind] ?? t.textSecondary, fontSize: 12, fontWeight: "600" }}>
                      {KIND_LABELS[event.kind] ?? event.kind}
                    </Text>
                    <Text style={{ color: t.text, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>
                      {event.assetLabel}
                    </Text>
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: 12 }}>
                    {event.envelope} · {dateStr}
                  </Text>
                </View>
                <Text
                  style={{
                    color: event.gain >= 0 ? t.success : t.danger,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {formatEuro(event.gain)}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
