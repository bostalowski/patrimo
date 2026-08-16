import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import type { GeographicAllocation } from "@patrimo/core/schema";
import type { GeographicSlice } from "@patrimo/core/geographic-exposure";
import { GeographicExposureList } from "./geographic-exposure-list";

export function AssetGeographicEditor({
  assetLabel,
  allocations,
  regions,
  countries,
  colors,
  onSave,
  pending,
}: {
  assetId: string;
  assetLabel: string;
  allocations: GeographicAllocation[];
  regions: GeographicSlice[];
  countries: GeographicSlice[];
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    cardBorder: string;
    accentBg: string;
  };
  onSave: (
    weights: Array<{ country: string; weight: number }>,
  ) => Promise<void>;
  pending: boolean;
}) {
  const [draft, setDraft] = useState(
    allocations.length > 0
      ? allocations.map((row) => ({
          country: row.country,
          weightPercent: String(Math.round(row.weight * 1000) / 10),
        }))
      : [{ country: "", weightPercent: "" }],
  );
  const draftRef = useRef(draft);

  const updateDraft = (
    next: Array<{ country: string; weightPercent: string }>,
  ) => {
    draftRef.current = next;
    setDraft(next);
  };

  const save = async () => {
    const weights = draftRef.current
      .filter((row) => row.country.trim() && row.weightPercent.trim())
      .map((row) => ({
        country: row.country.trim().toUpperCase(),
        weight: Number(row.weightPercent.replace(",", ".")) / 100,
      }));
    try {
      await onSave(weights);
    } catch (error) {
      Alert.alert(
        "Répartition invalide",
        error instanceof Error ? error.message : "Erreur inconnue",
      );
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {allocations.length === 0 ? (
        <Text
          accessibilityLabel="Aucune répartition géographique"
          style={{ color: colors.textMuted, fontSize: 13 }}
        >
          Aucune répartition géographique renseignée pour {assetLabel}.
        </Text>
      ) : (
        <GeographicExposureList
          title="Répartition géographique"
          regions={regions}
          countries={countries}
          colors={colors}
        />
      )}

      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
        Saisie manuelle (pays ISO + %)
      </Text>
      {draft.map((row, index) => (
        <View key={index} style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            accessibilityLabel={`Pays géographique ${index + 1}`}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: colors.text,
            }}
            value={row.country}
            onChangeText={(value) => {
              const next = [...draftRef.current];
              next[index] = { ...next[index], country: value };
              updateDraft(next);
            }}
            placeholder="US"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
          />
          <TextInput
            accessibilityLabel={`Poids géographique ${index + 1}`}
            style={{
              width: 80,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: colors.text,
            }}
            value={row.weightPercent}
            onChangeText={(value) => {
              const next = [...draftRef.current];
              next[index] = { ...next[index], weightPercent: value };
              updateDraft(next);
            }}
            placeholder="70"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
        </View>
      ))}
      <TouchableOpacity
        accessibilityLabel="Ajouter une ligne géographique"
        onPress={() =>
          updateDraft([
            ...draftRef.current,
            { country: "", weightPercent: "" },
          ])
        }
      >
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Ajouter une ligne
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityLabel="Enregistrer la répartition géographique"
        disabled={pending}
        onPress={() => void save()}
        style={{
          backgroundColor: colors.accentBg,
          borderRadius: 10,
          paddingVertical: 12,
          alignItems: "center",
          opacity: pending ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Enregistrer</Text>
      </TouchableOpacity>
    </View>
  );
}
