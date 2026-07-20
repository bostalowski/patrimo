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
import { router } from "expo-router";
import { Account } from "@patrimo/core/schema";
import { getToken, getFileId } from "../lib/google-drive";
import { appendAccountToDrive } from "../lib/write-account";
import { useThemeColors, shared } from "../lib/theme";

const ACCOUNT_TYPES = [
  "BROKER",
  "EXCHANGE_CRYPTO",
  "WALLET_CRYPTO",
  "EPARGNE_SALARIALE",
  "BANQUE",
] as const;

const ENVELOPES = ["CTO", "PEA", "PEE", "AV", "LIVRET", "PER"] as const;

export default function AddAccountScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);

  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<string>("BROKER");
  const [envelope, setEnvelope] = useState<string>("CTO");
  const [rate, setRate] = useState("");
  const [plafond, setPlafond] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const showRate = envelope === "LIVRET" || envelope === "AV";
  const showPlafond = envelope === "LIVRET";

  const handleSubmit = async () => {
    const parsed = Account.safeParse({
      id: id.trim(),
      label: label.trim(),
      type,
      envelope,
      openDate: undefined,
      rate: rate ? Number(rate) : undefined,
      plafond: plafond ? Number(plafond) : undefined,
    });

    if (!parsed.success) {
      Alert.alert("Formulaire invalide", parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const fileId = await getFileId();
      if (!token || !fileId) {
        Alert.alert("Erreur", "Reconnecte-toi à Google Drive d'abord.");
        return;
      }
      await appendAccountToDrive(token, fileId, parsed.data);
      Alert.alert("Succès", `Compte "${parsed.data.label}" ajouté.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      Alert.alert("Erreur", msg === "TOKEN_EXPIRED" ? "Session expirée, reconnecte-toi." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }}>

      <Field label="ID (clé unique)" theme={t}>
        <TextInput style={inputStyle(t)} value={id} onChangeText={setId}
          placeholder="ex: CTO" placeholderTextColor={t.textMuted} autoCapitalize="characters" />
      </Field>

      <Field label="Libellé" theme={t}>
        <TextInput style={inputStyle(t)} value={label} onChangeText={setLabel}
          placeholder="ex: Trade Republic" placeholderTextColor={t.textMuted} />
      </Field>

      <Field label="Type de compte" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {ACCOUNT_TYPES.map((at) => (
            <Chip key={at} label={at} selected={type === at} onPress={() => setType(at)} theme={t} />
          ))}
        </ScrollView>
      </Field>

      <Field label="Enveloppe fiscale" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {ENVELOPES.map((env) => (
            <Chip key={env} label={env} selected={envelope === env} onPress={() => setEnvelope(env)} theme={t} />
          ))}
        </ScrollView>
      </Field>

      {showRate && (
        <Field label="Taux (ex: 0.03 pour 3%)" theme={t}>
          <TextInput style={inputStyle(t)} value={rate} onChangeText={setRate}
            placeholder="0.03" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" />
        </Field>
      )}

      {showPlafond && (
        <Field label="Plafond (€)" theme={t}>
          <TextInput style={inputStyle(t)} value={plafond} onChangeText={setPlafond}
            placeholder="22950" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" />
        </Field>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={[shared.button, { backgroundColor: t.accentBg, marginTop: 8, opacity: submitting ? 0.6 : 1 }]}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : (
          <Text style={[shared.buttonText, { color: "#fff" }]}>Ajouter le compte</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function Field({ label, children, theme: t }: { label: string; children: React.ReactNode; theme: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[shared.label, { color: t.textSecondary, marginBottom: 6 }]}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label, selected, onPress, theme: t }: { label: string; selected: boolean; onPress: () => void; theme: ReturnType<typeof useThemeColors> }) {
  return (
    <TouchableOpacity onPress={onPress} style={{
      paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20, marginRight: 8,
      backgroundColor: selected ? t.accentBg : t.card, borderWidth: 1,
      borderColor: selected ? t.accentBg : t.cardBorder,
    }}>
      <Text style={{ color: selected ? "#fff" : t.text, fontSize: 13, fontWeight: "500" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function inputStyle(t: ReturnType<typeof useThemeColors>) {
  return { backgroundColor: t.card, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: t.text, fontSize: 15, borderWidth: 1, borderColor: t.cardBorder };
}
