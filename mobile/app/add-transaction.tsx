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
import { Transaction } from "@patrimo/core/schema";
import { useWorkbook } from "../lib/use-workbook";
import { appendTransaction } from "../lib/write-transaction";
import { useThemeColors, shared } from "../lib/theme";
import type { Account } from "@patrimo/core/schema";

const ALL_TYPES = [
  "ACHAT",
  "VENTE",
  "DIVIDENDE",
  "INTERET",
  "TRANSFERT",
  "DEPOT",
  "RETRAIT",
] as const;

const LIVRET_TYPES = ["DEPOT", "RETRAIT", "INTERET"] as const;

function isLivret(account: Account | undefined): boolean {
  return account?.envelope === "LIVRET";
}

export default function AddTransactionScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook } = useWorkbook();

  const firstAccount = workbook?.accounts[0];

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<string>("ACHAT");
  const [compte, setCompte] = useState<string>(firstAccount?.id ?? "");
  const [compteDestination, setCompteDestination] = useState("");
  const [actif, setActif] = useState<string>(workbook?.assets[0]?.id ?? "");
  const [quantite, setQuantite] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [frais, setFrais] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const accounts = workbook?.accounts ?? [];
  const assets = workbook?.assets ?? [];

  const selectedAccount = accounts.find((a) => a.id === compte);
  const livret = isLivret(selectedAccount);
  const availableTypes = livret ? LIVRET_TYPES : ALL_TYPES;

  const handleAccountChange = (id: string) => {
    setCompte(id);
    const acc = accounts.find((a) => a.id === id);
    if (isLivret(acc) && !LIVRET_TYPES.includes(type as typeof LIVRET_TYPES[number])) {
      setType("DEPOT");
    }
    if (!isLivret(acc) && LIVRET_TYPES.includes(type as typeof LIVRET_TYPES[number])) {
      setType("ACHAT");
    }
  };

  const handleSubmit = async () => {
    const parsed = Transaction.safeParse({
      date: new Date(date),
      type,
      compte,
      compteDestination: type === "TRANSFERT" && compteDestination ? compteDestination : undefined,
      actif: livret ? "" : actif,
      quantite: livret ? 1 : Number(quantite) || 0,
      prixUnitaire: livret ? (Number(quantite) || null) : (prixUnitaire ? Number(prixUnitaire) : null),
      devise: "EUR",
      frais: Number(frais) || 0,
      fraisDevise: "EUR",
      notes: notes.trim() || undefined,
    });

    if (!parsed.success) {
      Alert.alert("Formulaire invalide", parsed.error.issues.map((i) => i.message).join("\n"));
      return;
    }

    setSubmitting(true);
    try {
      await appendTransaction(parsed.data);
      Alert.alert("Succès", "Transaction ajoutée au fichier Excel.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      if (msg === "No file source configured") {
        Alert.alert("Erreur", "Configure une source de données dans les réglages.");
      } else if (msg === "TOKEN_EXPIRED") {
        Alert.alert("Session expirée", "Reconnecte-toi à Google Drive dans les réglages.");
      } else {
        Alert.alert("Erreur", msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!workbook) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Configure une source de données dans les réglages.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }}>

      <Field label="Date" theme={t}>
        <TextInput
          style={inputStyle(t)}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={t.textMuted}
          keyboardType="numbers-and-punctuation"
        />
      </Field>

      <Field label="Compte" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {accounts.map((acc) => (
            <Chip
              key={acc.id}
              label={acc.label}
              selected={compte === acc.id}
              onPress={() => handleAccountChange(acc.id)}
              theme={t}
            />
          ))}
        </ScrollView>
      </Field>

      <Field label="Type" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {availableTypes.map((txType) => (
            <Chip
              key={txType}
              label={txType}
              selected={type === txType}
              onPress={() => setType(txType)}
              theme={t}
            />
          ))}
        </ScrollView>
      </Field>

      {type === "TRANSFERT" && (
        <Field label="Compte destination" theme={t}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {accounts.filter((a) => a.id !== compte).map((acc) => (
              <Chip
                key={acc.id}
                label={acc.label}
                selected={compteDestination === acc.id}
                onPress={() => setCompteDestination(acc.id)}
                theme={t}
              />
            ))}
          </ScrollView>
        </Field>
      )}

      {!livret && (
        <Field label="Actif" theme={t}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
            {assets.map((asset) => (
              <Chip
                key={asset.id}
                label={asset.id}
                selected={actif === asset.id}
                onPress={() => setActif(asset.id)}
                theme={t}
              />
            ))}
          </ScrollView>
        </Field>
      )}

      <Field label={livret ? "Montant (€)" : "Quantité"} theme={t}>
        <TextInput
          style={inputStyle(t)}
          value={quantite}
          onChangeText={setQuantite}
          placeholder="0"
          placeholderTextColor={t.textMuted}
          keyboardType="decimal-pad"
        />
      </Field>

      {!livret && (
        <Field label="Prix unitaire (€)" theme={t}>
          <TextInput
            style={inputStyle(t)}
            value={prixUnitaire}
            onChangeText={setPrixUnitaire}
            placeholder="optionnel"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
          />
        </Field>
      )}

      {!livret && (
        <Field label="Frais (€)" theme={t}>
          <TextInput
            style={inputStyle(t)}
            value={frais}
            onChangeText={setFrais}
            placeholder="0"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
          />
        </Field>
      )}

      <Field label="Notes" theme={t}>
        <TextInput
          style={[inputStyle(t), { height: 72, textAlignVertical: "top" }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="optionnel"
          placeholderTextColor={t.textMuted}
          multiline
        />
      </Field>

      <TouchableOpacity
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
          <Text style={[shared.buttonText, { color: "#fff" }]}>Ajouter la transaction</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 32 }} />
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
      <Text style={[shared.label, { color: t.textSecondary, marginBottom: 6 }]}>{label}</Text>
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
