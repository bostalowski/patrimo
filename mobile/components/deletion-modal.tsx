import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import type {
  AccountDeletionMode,
  DeletionImpact,
} from "@patrimo/core/deletion";
import { useThemeColors } from "../lib/theme";

type Props = {
  visible: boolean;
  kind: "account" | "asset";
  label: string;
  impact: DeletionImpact;
  onClose: () => void;
  onConfirm: (mode: AccountDeletionMode) => Promise<void>;
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function DeletionModal({
  visible,
  kind,
  label,
  impact,
  onClose,
  onConfirm,
}: Props) {
  const isDark = useColorScheme() === "dark";
  const theme = useThemeColors(isDark);
  const [mode, setMode] = useState<AccountDeletionMode>("cascade");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAccount = kind === "account";
  const isEmptyAccount = isAccount && impact.transactionCount === 0;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(isEmptyAccount ? "cascade" : mode);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 20,
          backgroundColor: "rgba(0,0,0,0.45)",
        }}
      >
        <View
          style={{
            borderRadius: 16,
            padding: 20,
            backgroundColor: theme.card,
          }}
        >
          <Text
            style={{ color: theme.text, fontSize: 18, fontWeight: "600" }}
          >
            Supprimer {label} ?
          </Text>
          <Text style={{ color: theme.textSecondary, marginTop: 8 }}>
            Cette action est irréversible et modifie le fichier Excel source.
          </Text>

          {!isEmptyAccount && (
            <View style={{ marginTop: 16, gap: 4 }}>
              <Text style={{ color: theme.textSecondary }}>
                {countLabel(
                  impact.transactionCount,
                  "transaction",
                  "transactions",
                )}
              </Text>
              {impact.assetCount > 0 && (
                <Text style={{ color: theme.textSecondary }}>
                  {countLabel(impact.assetCount, "actif", "actifs")}
                </Text>
              )}
              {impact.priceCount > 0 && (
                <Text style={{ color: theme.textSecondary }}>
                  {countLabel(
                    impact.priceCount,
                    "historique de prix",
                    "historiques de prix",
                  )}
                </Text>
              )}
              {impact.investmentPlanCount > 0 && (
                <Text style={{ color: theme.textSecondary }}>
                  {countLabel(
                    impact.investmentPlanCount,
                    "plan d’investissement",
                    "plans d’investissement",
                  )}
                </Text>
              )}
            </View>
          )}

          {isAccount && !isEmptyAccount && (
            <View style={{ marginTop: 16, gap: 8 }}>
              <TouchableOpacity
                accessibilityRole="radio"
                accessibilityState={{ selected: mode === "cascade" }}
                accessibilityLabel="Supprimer les données liées"
                onPress={() => setMode("cascade")}
                style={{
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>
                  Supprimer les données liées
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="radio"
                accessibilityState={{ selected: mode === "detach" }}
                accessibilityLabel="Rattacher à Aucun compte"
                onPress={() => setMode("detach")}
                style={{
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "600" }}>
                  Rattacher à Aucun compte
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <Text style={{ color: theme.danger, marginTop: 12 }}>{error}</Text>
          )}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              disabled={busy}
              accessibilityLabel="Annuler"
              style={{ padding: 12 }}
            >
              <Text style={{ color: theme.textSecondary }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirm}
              disabled={busy}
              accessibilityLabel="Confirmer la suppression"
              style={{
                minWidth: 120,
                alignItems: "center",
                borderRadius: 10,
                padding: 12,
                backgroundColor: theme.danger,
              }}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  Supprimer
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
