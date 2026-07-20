import { View, Text, ScrollView, useColorScheme } from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { feesByYear, feesByAsset, feesByAccount, feeRatio } from "@patrimo/core/fees";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { formatEuro, formatPercent } from "@patrimo/core/format";
import { useThemeColors, shared } from "../lib/theme";

export default function FraisScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading, error } = useWorkbook();

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

  let portfolio: ReturnType<typeof buildPortfolio>;
  try {
    portfolio = buildPortfolio(workbook, prices);
  } catch {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Erreur lors du calcul du portefeuille. Vérifie les données.
        </Text>
      </View>
    );
  }

  const totalFees = portfolio.totals.fees;
  const ratio = feeRatio(totalFees, portfolio.totals.costBasis);
  const yearlyFees = feesByYear(workbook.transactions);
  const assetFees = feesByAsset(workbook.transactions, workbook.assets).slice(0, 5);
  const accountFees = feesByAccount(workbook.transactions, workbook.accounts);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <KpiCard label="Total des frais" value={formatEuro(totalFees)} theme={t} />
        <KpiCard label="Ratio frais/investi" value={formatPercent(ratio)} theme={t} />
      </View>

      {yearlyFees.length > 0 && (
        <View style={[shared.card, { backgroundColor: t.card }]}>
          <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
            Par année
          </Text>
          {yearlyFees.map((yf, i) => (
            <View
              key={yf.year}
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
                {yf.year}
              </Text>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                {formatEuro(yf.total)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {assetFees.length > 0 && (
        <View style={[shared.card, { backgroundColor: t.card }]}>
          <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
            Par actif (top 5)
          </Text>
          {assetFees.map((af, i) => (
            <View
              key={af.assetId}
              style={[
                shared.row,
                {
                  paddingVertical: 10,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: t.cardBorder,
                },
              ]}
            >
              <Text style={{ color: t.textSecondary, fontSize: 14, flex: 1 }} numberOfLines={1}>
                {af.label}
              </Text>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                {formatEuro(af.fees)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {accountFees.length > 0 && (
        <View style={[shared.card, { backgroundColor: t.card }]}>
          <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
            Par compte
          </Text>
          {accountFees.map((cf, i) => (
            <View
              key={cf.accountId}
              style={[
                shared.row,
                {
                  paddingVertical: 10,
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: t.cardBorder,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.textSecondary, fontSize: 14 }} numberOfLines={1}>
                  {cf.label}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: 11 }}>
                  {cf.envelope}
                </Text>
              </View>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                {formatEuro(cf.fees)}
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
  theme: t,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[shared.card, { flex: 1, backgroundColor: t.card, marginBottom: 0 }]}>
      <Text style={[shared.label, { color: t.textSecondary, marginBottom: 6 }]}>
        {label}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: "600", color: t.text }}>
        {value}
      </Text>
    </View>
  );
}
