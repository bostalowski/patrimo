import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Account } from "@patrimo/core/schema";
import {
  accountDeletionImpact,
  type AccountDeletionMode,
} from "@patrimo/core/deletion";
import { useWorkbook } from "../lib/use-workbook";
import {
  deleteAccountFromSource,
  updateAccountInSource,
} from "../lib/write-account";
import { useThemeColors, shared } from "../lib/theme";
import { DeletionModal } from "../components/deletion-modal";

const ACCOUNT_TYPES = [
  "BROKER",
  "EXCHANGE_CRYPTO",
  "WALLET_CRYPTO",
  "EPARGNE_SALARIALE",
  "BANQUE",
] as const;

const ENVELOPES = ["CTO", "PEA", "PEE", "AV", "LIVRET", "PER"] as const;

export default function EditAccountScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, loading, refresh } = useWorkbook();
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

  const existing = workbook.accounts.find((account) => account.id === accountId);
  if (!existing) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Compte introuvable.
        </Text>
      </View>
    );
  }

  return (
    <EditAccountForm
      initial={existing}
      workbook={workbook}
      refresh={refresh}
    />
  );
}

function EditAccountForm({
  initial,
  workbook,
  refresh,
}: {
  initial: Account;
  workbook: NonNullable<ReturnType<typeof useWorkbook>["workbook"]>;
  refresh: () => Promise<void>;
}) {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const [label, setLabel] = useState(initial.label);
  const [type, setType] = useState<string>(initial.type);
  const [envelope, setEnvelope] = useState<string>(initial.envelope);
  const [rate, setRate] = useState(
    initial.rate != null ? String(initial.rate) : "",
  );
  const [plafond, setPlafond] = useState(
    initial.plafond != null ? String(initial.plafond) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showRate = envelope === "LIVRET" || envelope === "AV";
  const showPlafond = envelope === "LIVRET";

  const handleSubmit = async () => {
    setError(null);
    const parsed = Account.safeParse({
      id: initial.id,
      label: label.trim(),
      type,
      envelope,
      openDate: initial.openDate,
      rate: rate ? Number(rate) : undefined,
      plafond: plafond ? Number(plafond) : undefined,
    });

    if (!parsed.success) {
      Alert.alert(
        "Formulaire invalide",
        parsed.error.issues.map((issue) => issue.message).join("\n"),
      );
      return;
    }

    setSubmitting(true);
    try {
      await updateAccountInSource(parsed.data);
      await refresh();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeletion = async (mode: AccountDeletionMode) => {
    await deleteAccountFromSource(initial.id, mode);
    await refresh();
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }}>
      <Field label="ID (clé unique)" theme={t}>
        <TextInput
          accessibilityLabel="Identifiant du compte"
          style={inputStyle(t)}
          value={initial.id}
          editable={false}
        />
      </Field>

      <Field label="Libellé" theme={t}>
        <TextInput
          accessibilityLabel="Libellé du compte"
          style={inputStyle(t)}
          value={label}
          onChangeText={setLabel}
          placeholder="ex: Trade Republic"
          placeholderTextColor={t.textMuted}
        />
      </Field>

      <Field label="Type de compte" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {ACCOUNT_TYPES.map((accountType) => (
            <Chip
              key={accountType}
              label={accountType}
              selected={type === accountType}
              onPress={() => setType(accountType)}
              theme={t}
            />
          ))}
        </ScrollView>
      </Field>

      <Field label="Enveloppe fiscale" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {ENVELOPES.map((env) => (
            <Chip
              key={env}
              label={env}
              selected={envelope === env}
              onPress={() => setEnvelope(env)}
              theme={t}
            />
          ))}
        </ScrollView>
      </Field>

      {showRate && (
        <Field label="Taux (ex: 0.03 pour 3%)" theme={t}>
          <TextInput
            style={inputStyle(t)}
            value={rate}
            onChangeText={setRate}
            placeholder="0.03"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
          />
        </Field>
      )}

      {showPlafond && (
        <Field label="Plafond (€)" theme={t}>
          <TextInput
            style={inputStyle(t)}
            value={plafond}
            onChangeText={setPlafond}
            placeholder="22950"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
          />
        </Field>
      )}

      {error ? (
        <Text style={{ color: t.danger, marginBottom: 12 }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        accessibilityLabel="Enregistrer le compte"
        onPress={handleSubmit}
        disabled={submitting}
        style={[
          shared.button,
          { backgroundColor: t.accentBg, marginTop: 8, opacity: submitting ? 0.6 : 1 },
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[shared.buttonText, { color: "#fff" }]}>Enregistrer</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Supprimer le compte ${initial.label}`}
        onPress={() => setDeleting(true)}
        disabled={submitting}
        style={[
          shared.button,
          {
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: t.danger,
            marginTop: 12,
          },
        ]}
      >
        <Text style={[shared.buttonText, { color: t.danger }]}>Supprimer</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />

      {deleting && (
        <DeletionModal
          visible
          kind="account"
          label={initial.label}
          impact={accountDeletionImpact(workbook, initial.id)}
          onClose={() => setDeleting(false)}
          onConfirm={confirmDeletion}
        />
      )}
    </ScrollView>
  );
}

function Field({
  label,
  children,
  theme: t,
}: {
  label: string;
  children: React.ReactNode;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[shared.label, { color: t.textSecondary, marginBottom: 6 }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  theme: t,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useThemeColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: selected ? t.accentBg : t.card,
        borderWidth: 1,
        borderColor: selected ? t.accentBg : t.cardBorder,
      }}
    >
      <Text style={{ color: selected ? "#fff" : t.text, fontSize: 13, fontWeight: "500" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function inputStyle(t: ReturnType<typeof useThemeColors>) {
  return {
    backgroundColor: t.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: t.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: t.cardBorder,
  };
}
