import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { formatEuro, formatPercent } from "@patrimo/core/format";
import { useThemeColors, shared } from "../lib/theme";
import type { Theme } from "../lib/theme";

const FREQUENCY_LABELS: Record<string, string> = {
  MENSUEL: "Mensuel",
  TRIMESTRIEL: "Trimestriel",
  ANNUEL: "Annuel",
};

export default function InvestissementsScreen() {
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

  const hasDca = workbook.dca.length > 0;
  const hasProperties = workbook.properties.length > 0;

  if (!hasDca && !hasProperties) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Aucun investissement programmé ou bien immobilier
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      {hasDca && (
        <>
          <Text style={[shared.label, { color: t.textSecondary, marginBottom: 12 }]}>
            Plans DCA
          </Text>
          {workbook.dca.map((config) => (
            <DcaCard key={config.id} config={config} theme={t} />
          ))}
        </>
      )}

      {hasProperties && (
        <>
          <Text style={[shared.label, { color: t.textSecondary, marginBottom: 12, marginTop: hasDca ? 12 : 0 }]}>
            Immobilier
          </Text>
          {workbook.properties.map((property) => (
            <PropertyCard key={property.id} property={property} theme={t} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

function DcaCard({
  config,
  theme: t,
}: {
  config: import("@patrimo/core/schema").DcaConfig;
  theme: Theme;
}) {
  return (
    <View style={[shared.card, { backgroundColor: t.card }]}>
      <View style={[shared.row, { marginBottom: 8 }]}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>
          {config.label}
        </Text>
        <Text style={{ color: t.accent, fontSize: 14, fontWeight: "600" }}>
          {formatEuro(config.amount)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>
          {config.envelope}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>
          {FREQUENCY_LABELS[config.frequency] ?? config.frequency}
        </Text>
      </View>
      {config.lines.map((line, lineIdx) => (
        <View
          key={line.label ?? line.assetIds.join("-")}
          style={[
            shared.row,
            {
              paddingVertical: 8,
              borderTopWidth: lineIdx > 0 ? 1 : 0,
              borderTopColor: t.cardBorder,
            },
          ]}
        >
          <Text style={{ color: t.textSecondary, fontSize: 14, flex: 1 }} numberOfLines={1}>
            {line.label ?? line.assetIds.join(", ")}
          </Text>
          <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
            {formatPercent(line.targetPct)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PropertyCard({
  property,
  theme: t,
}: {
  property: import("@patrimo/core/schema").Property;
  theme: Theme;
}) {
  const equity = property.valeurActuelle * property.partDetenue - property.montantEmprunte;

  return (
    <View style={[shared.card, { backgroundColor: t.card }]}>
      <Text style={{ color: t.text, fontSize: 15, fontWeight: "600", marginBottom: 10 }}>
        {property.label}
      </Text>
      <View style={[shared.row, { paddingVertical: 4 }]}>
        <Text style={{ color: t.textSecondary, fontSize: 14 }}>Valeur</Text>
        <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
          {formatEuro(property.valeurActuelle)}
        </Text>
      </View>
      <View style={[shared.row, { paddingVertical: 4 }]}>
        <Text style={{ color: t.textSecondary, fontSize: 14 }}>Équité nette</Text>
        <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
          {formatEuro(equity)}
        </Text>
      </View>
      {property.loyerMensuelHC > 0 && (
        <View style={[shared.row, { paddingVertical: 4 }]}>
          <Text style={{ color: t.textSecondary, fontSize: 14 }}>Loyer HC</Text>
          <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
            {formatEuro(property.loyerMensuelHC)}/mois
          </Text>
        </View>
      )}
    </View>
  );
}
