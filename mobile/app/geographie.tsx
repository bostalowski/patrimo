import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { aggregateGeographicExposure } from "@patrimo/core/geographic-exposure";
import { useThemeColors, shared } from "../lib/theme";
import { GeographicExposureList } from "../components/geographic-exposure-list";
import { DiversificationTargetsEditor } from "../lib/diversification-targets-editor";

export default function GeographieScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading, error, refresh } = useWorkbook();

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
          {error ?? "Configure une source de données dans les réglages."}
        </Text>
      </View>
    );
  }

  let portfolio: ReturnType<typeof buildPortfolio>;
  try {
    portfolio = buildPortfolio(workbook, prices);
  } catch {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Erreur de calcul portefeuille.
        </Text>
      </View>
    );
  }

  const exposure = aggregateGeographicExposure(
    portfolio.assets.map((position) => ({
      assetId: position.assetId,
      marketValue: position.marketValue,
    })),
    workbook.geographicAllocations ?? [],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <DiversificationTargetsEditor
        initialTargets={workbook.diversificationTargets ?? []}
        theme={t}
        onSaved={refresh}
      />
      <View style={[shared.card, { backgroundColor: t.card }]}>
        <GeographicExposureList
          title="Répartition géographique"
          regions={exposure.regions}
          countries={exposure.countries}
          colors={t}
        />
      </View>
    </ScrollView>
  );
}
