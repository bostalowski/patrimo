import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import {
	aggregatePortfolioDiversificationBreakdown,
	assessDiversificationCoherence,
} from "@patrimo/core/diversification-coherence";
import { aggregatePortfolioSectorBreakdown } from "@patrimo/core/sector-exposure";
import { useThemeColors, shared } from "../lib/theme";
import { AllocationCoherenceCard } from "../lib/allocation-coherence-card";
import { GeographicExposureList } from "../components/geographic-exposure-list";
import { SectorExposureList } from "../components/sector-exposure-list";
import { DiversificationTargetsEditor } from "../lib/diversification-targets-editor";

export default function DiversificationScreen() {
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

  const positions = portfolio.assets.map((position) => ({
    assetId: position.assetId,
    marketValue: position.marketValue,
  }));
  const breakdown = aggregatePortfolioDiversificationBreakdown(
    positions,
    workbook.geographicAllocations ?? [],
    workbook.assets,
  );
  const sectorBreakdown = aggregatePortfolioSectorBreakdown(
    positions,
    workbook.sectorAllocations ?? [],
  );
  const coherence = assessDiversificationCoherence({
    targets: workbook.diversificationTargets,
    positions: portfolio.assets,
    dca: workbook.dca,
    geographicAllocations: workbook.geographicAllocations,
    sectorAllocations: workbook.sectorAllocations ?? [],
    assets: workbook.assets,
  });

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
      <AllocationCoherenceCard coherence={coherence} theme={t} />
      {breakdown && (
        <View style={[shared.card, { backgroundColor: t.card }]}>
          <GeographicExposureList
            title="Répartition géographique"
            regions={breakdown.regions}
            countries={breakdown.countries}
            crypto={breakdown.crypto}
            unmapped={breakdown.unmapped}
            colors={t}
          />
        </View>
      )}
      {sectorBreakdown && (
        <View style={[shared.card, { backgroundColor: t.card, marginTop: 12 }]}>
          <SectorExposureList
            title="Répartition sectorielle"
            sectors={sectorBreakdown.sectors}
            unmapped={sectorBreakdown.unmapped}
            colors={t}
          />
        </View>
      )}
    </ScrollView>
  );
}
