import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { formatEuro, formatQuantity } from "@patrimo/core/format";
import {
  NO_ACCOUNT_ID,
  NO_ACCOUNT_LABEL,
} from "@patrimo/core/deletion";
import {
  aggregateGeographicExposureForAccount,
  regionLabel,
} from "@patrimo/core/geographic-exposure";
import { useThemeColors, shared } from "../lib/theme";
import { GeographicExposureList } from "../components/geographic-exposure-list";

export default function AccountDetailScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading } = useWorkbook();
  const params = useLocalSearchParams<{ id?: string }>();
  const accountId = typeof params.id === "string" ? params.id : "";

  if (loading) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  if (!workbook) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Configure une source de données dans les réglages.
        </Text>
      </View>
    );
  }

  const meta = workbook.accounts.find((account) => account.id === accountId);
  if (!meta || accountId === NO_ACCOUNT_ID) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Compte introuvable.
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

  const account = portfolio.accounts.find(
    (entry) => entry.accountId === accountId,
  );
  const positions = account?.positions ?? [];
  const activePositions = positions.filter((position) => position.quantity > 0);
  const accountGeo = aggregateGeographicExposureForAccount(
    positions.map((position) => ({
      assetId: position.assetId,
      accountId,
      marketValue: position.marketValue,
    })),
    workbook.geographicAllocations ?? [],
    accountId,
  );

  const dividerRow = [
    shared.row,
    {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: t.cardBorder,
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={[shared.card, { backgroundColor: t.card, gap: 8 }]}>
          <View style={shared.row}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 18, fontWeight: "600" }}>
                {meta.label || NO_ACCOUNT_LABEL}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 4 }}>
                {meta.envelope} · {meta.type}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Modifier le compte ${meta.label}`}
              onPress={() =>
                router.push({
                  pathname: "/edit-account",
                  params: { id: meta.id },
                })
              }
            >
              <Text style={{ color: t.accent, fontSize: 14, fontWeight: "500" }}>
                Modifier
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={{ color: t.text, fontSize: 20, fontWeight: "600" }}>
            {formatEuro(account?.marketValue ?? 0)}
          </Text>
        </View>

        <View style={[shared.card, { backgroundColor: t.card }]}>
          <GeographicExposureList
            title="Géographie du compte"
            countries={accountGeo.countries}
            regions={accountGeo.regions}
            colors={t}
          />
          {accountGeo.regions.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text
                style={{
                  color: t.text,
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 8,
                }}
              >
                Régions
              </Text>
              {accountGeo.regions.map((slice, index) => (
                <View
                  key={slice.key}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingVertical: 8,
                    borderTopWidth: index > 0 ? 1 : 0,
                    borderTopColor: t.cardBorder,
                  }}
                >
                  <Text style={{ color: t.text, fontSize: 13 }}>
                    {regionLabel(slice.key)}
                  </Text>
                  <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                    {formatEuro(slice.marketValue)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[shared.card, { backgroundColor: t.card }]}>
          <Text
            style={{
              color: t.text,
              fontSize: 15,
              fontWeight: "600",
              marginBottom: 8,
            }}
          >
            Positions
          </Text>
          {activePositions.length === 0 ? (
            <Text style={{ color: t.textMuted, fontSize: 13 }}>
              Aucune position pour ce compte.
            </Text>
          ) : (
            activePositions.map((position) => (
              <View key={position.assetId} style={dividerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 13, fontWeight: "500" }}>
                    {position.asset?.label ?? position.assetId}
                  </Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {formatQuantity(position.quantity)}
                    {" · "}Investi {formatEuro(position.costBasis)}
                  </Text>
                </View>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: "600" }}>
                  {position.currentPrice !== null
                    ? formatEuro(position.marketValue)
                    : "—"}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
