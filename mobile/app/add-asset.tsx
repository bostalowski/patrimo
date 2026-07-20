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
import { Asset } from "@patrimo/core/schema";
import { appendAsset } from "../lib/write-asset";
import { useThemeColors, shared } from "../lib/theme";

const ASSET_TYPES = ["CRYPTO", "ETF", "ACTION", "FCPE", "CASH"] as const;
const PRICE_SOURCES = ["yahoo", "coingecko", "investir", "zonebourse", "manual"] as const;

export default function AddAssetScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);

  const [id, setId] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<string>("ETF");
  const [isin, setIsin] = useState("");
  const [ticker, setTicker] = useState("");
  const [source, setSource] = useState<string>("yahoo");
  const [param, setParam] = useState("");
  const [ter, setTer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const parsed = Asset.safeParse({
      id: id.trim(),
      label: label.trim(),
      type,
      isin: isin.trim() || undefined,
      ticker: ticker.trim() || undefined,
      source,
      param: param.trim() || undefined,
      currency: "EUR",
      ter: ter ? Number(ter) : undefined,
    });

    if (!parsed.success) {
      Alert.alert("Formulaire invalide", parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    setSubmitting(true);
    try {
      await appendAsset(parsed.data);
      Alert.alert("Succès", `Actif "${parsed.data.label}" ajouté.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      if (msg === "No file source configured") {
        Alert.alert("Erreur", "Configure une source de données dans les réglages.");
      } else {
        Alert.alert("Erreur", msg === "TOKEN_EXPIRED" ? "Session expirée, reconnecte-toi." : msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }}>

      <Field label="ID (clé unique)" theme={t}>
        <TextInput style={inputStyle(t)} value={id} onChangeText={setId}
          placeholder="ex: WPEA" placeholderTextColor={t.textMuted} autoCapitalize="characters" />
      </Field>

      <Field label="Libellé" theme={t}>
        <TextInput style={inputStyle(t)} value={label} onChangeText={setLabel}
          placeholder="ex: Amundi MSCI World" placeholderTextColor={t.textMuted} />
      </Field>

      <Field label="Type" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {ASSET_TYPES.map((at) => (
            <Chip key={at} label={at} selected={type === at} onPress={() => setType(at)} theme={t} />
          ))}
        </ScrollView>
      </Field>

      <Field label="Source de prix" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {PRICE_SOURCES.map((s) => (
            <Chip key={s} label={s} selected={source === s} onPress={() => setSource(s)} theme={t} />
          ))}
        </ScrollView>
      </Field>

      {source !== "manual" && (
        <Field label="Paramètre source (symbole/ISIN)" theme={t}>
          <TextInput style={inputStyle(t)} value={param} onChangeText={setParam}
            placeholder={source === "yahoo" ? "ex: WPEA.PA" : source === "coingecko" ? "ex: bitcoin" : "ex: QS0004036743"}
            placeholderTextColor={t.textMuted} />
        </Field>
      )}

      <Field label="ISIN (optionnel)" theme={t}>
        <TextInput style={inputStyle(t)} value={isin} onChangeText={setIsin}
          placeholder="ex: LU1681043599" placeholderTextColor={t.textMuted} autoCapitalize="characters" />
      </Field>

      <Field label="Ticker (optionnel)" theme={t}>
        <TextInput style={inputStyle(t)} value={ticker} onChangeText={setTicker}
          placeholder="ex: WPEA" placeholderTextColor={t.textMuted} autoCapitalize="characters" />
      </Field>

      {type === "ETF" && (
        <Field label="TER % (optionnel)" theme={t}>
          <TextInput style={inputStyle(t)} value={ter} onChangeText={setTer}
            placeholder="ex: 0.0012" placeholderTextColor={t.textMuted} keyboardType="decimal-pad" />
        </Field>
      )}

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={[shared.button, { backgroundColor: t.accentBg, marginTop: 8, opacity: submitting ? 0.6 : 1 }]}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : (
          <Text style={[shared.buttonText, { color: "#fff" }]}>Ajouter l'actif</Text>
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
