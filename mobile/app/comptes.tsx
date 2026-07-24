import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import { formatEuro } from "@patrimo/core/format";
import {
  NO_ACCOUNT_ID,
  NO_ACCOUNT_LABEL,
  accountDeletionImpact,
  type AccountDeletionMode,
} from "@patrimo/core/deletion";
import { useThemeColors, shared } from "../lib/theme";
import { deleteAccountFromSource } from "../lib/write-account";
import { DeletionModal } from "../components/deletion-modal";

export default function ComptesScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading, refresh } = useWorkbook();
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(
    null,
  );

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
  } catch {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Erreur de calcul portefeuille.
        </Text>
      </View>
    );
  }
  const accountMap = new Map(workbook.accounts.map((a) => [a.id, a]));
  const portfolioByAccountId = new Map(
    portfolio.accounts.map((account) => [account.accountId, account]),
  );
  const displayAccounts = workbook.accounts.map(
    (account) =>
      portfolioByAccountId.get(account.id) ?? {
        accountId: account.id,
        envelope: account.envelope,
        marketValue: 0,
        costBasis: 0,
        unrealizedPnL: 0,
      },
  );
  for (const account of portfolio.accounts) {
    if (accountMap.has(account.accountId)) continue;
    displayAccounts.push(account);
  }
  const deletingAccount = deletingAccountId
    ? accountMap.get(deletingAccountId)
    : undefined;

  async function confirmDeletion(mode: AccountDeletionMode) {
    if (!deletingAccount) return;
    await deleteAccountFromSource(deletingAccount.id, mode);
    await refresh();
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {displayAccounts.map((account) => {
          const meta = accountMap.get(account.accountId);
          return (
            <View key={account.accountId} style={[shared.card, { backgroundColor: t.card }]}>
              <View style={[shared.row, { marginBottom: 4 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 15, fontWeight: "500" }}>
                    {meta?.label ??
                      (account.accountId === NO_ACCOUNT_ID
                        ? NO_ACCOUNT_LABEL
                        : account.accountId)}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>
                    {account.envelope} · {meta?.type ?? ""}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={{ color: t.text, fontSize: 16, fontWeight: "600" }}>
                    {formatEuro(account.marketValue)}
                  </Text>
                  {meta && account.accountId !== NO_ACCOUNT_ID && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Supprimer le compte ${meta.label}`}
                      onPress={() => setDeletingAccountId(meta.id)}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={t.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View
                style={[
                  shared.row,
                  { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.cardBorder },
                ]}
              >
                <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                  Investi: {formatEuro(account.costBasis)}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: account.unrealizedPnL >= 0 ? t.success : t.danger,
                  }}
                >
                  {account.unrealizedPnL >= 0 ? "+" : ""}
                  {formatEuro(account.unrealizedPnL)}
                </Text>
              </View>
            </View>
          );
        })}
        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.push("/add-account")}
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

      {deletingAccount && (
        <DeletionModal
          visible
          kind="account"
          label={deletingAccount.label}
          impact={accountDeletionImpact(workbook, deletingAccount.id)}
          onClose={() => setDeletingAccountId(null)}
          onConfirm={confirmDeletion}
        />
      )}
    </View>
  );
}
