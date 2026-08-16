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
import {
  geographicCountryOptions,
  geographicRegionOptions,
} from "../lib/geographic-key-options";

export function AssetGeographicEditor({
  assetLabel,
  hasIsin = false,
  allocations,
  regions,
  countries,
  colors,
  onSave,
  onSyncJustEtf,
  pending,
}: {
  assetId: string;
  assetLabel: string;
  hasIsin?: boolean;
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
  onSyncJustEtf?: (options: { restore: boolean }) => Promise<{ ok: boolean }>;
  pending: boolean;
}) {
  const initialMode =
    allocations.length > 0 &&
    allocations.every(
      (row) =>
        row.country === "OTHER" ||
        [
          "NORTH_AMERICA",
          "EUROPE",
          "ASIA_PACIFIC",
          "EMERGING",
        ].includes(row.country),
    )
      ? "regions"
      : "countries";
  const [mode, setMode] = useState<"countries" | "regions">(initialMode);
  const [countryQuery, setCountryQuery] = useState("");
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

  const regionOptions = geographicRegionOptions();
  const countryOptions = geographicCountryOptions().filter((option) => {
    if (!countryQuery.trim()) return option.value === "US" || option.value === "FR" || option.value === "OTHER";
    const query = countryQuery.trim().toLowerCase();
    return (
      option.value.toLowerCase().includes(query) ||
      option.label.toLowerCase().includes(query)
    );
  }).slice(0, 30);

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

  const syncJustEtf = async (restore: boolean) => {
    if (!onSyncJustEtf) return;
    try {
      const result = await onSyncJustEtf({ restore });
      if (!result.ok) {
        Alert.alert(
          "Sync JustETF impossible",
          "La récupération depuis JustETF a échoué. Le classeur n'a pas été modifié.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Sync JustETF impossible",
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

      {hasIsin && onSyncJustEtf && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TouchableOpacity
            accessibilityLabel={
              allocations.length === 0
                ? "Récupérer depuis JustETF"
                : "Sync JustETF"
            }
            disabled={pending}
            onPress={() => void syncJustEtf(false)}
            style={{
              backgroundColor: colors.accentBg,
              borderRadius: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              opacity: pending ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              {allocations.length === 0
                ? "Récupérer depuis JustETF"
                : "Sync JustETF"}
            </Text>
          </TouchableOpacity>
          {allocations.length > 0 && (
            <TouchableOpacity
              accessibilityLabel="Rétablir depuis JustETF"
              disabled={pending}
              onPress={() => void syncJustEtf(true)}
              style={{
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                opacity: pending ? 0.6 : 1,
              }}
            >
              <Text
                style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}
              >
                Rétablir depuis JustETF
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity
          accessibilityLabel="Mode saisie pays"
          onPress={() => {
            setMode("countries");
            updateDraft([{ country: "", weightPercent: "" }]);
          }}
          style={{
            backgroundColor:
              mode === "countries" ? colors.accentBg : "transparent",
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text
            style={{
              color: mode === "countries" ? "#fff" : colors.text,
              fontWeight: "600",
              fontSize: 13,
            }}
          >
            Pays
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Mode saisie régions"
          onPress={() => {
            setMode("regions");
            updateDraft([{ country: "", weightPercent: "" }]);
          }}
          style={{
            backgroundColor:
              mode === "regions" ? colors.accentBg : "transparent",
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 12,
          }}
        >
          <Text
            style={{
              color: mode === "regions" ? "#fff" : colors.text,
              fontWeight: "600",
              fontSize: 13,
            }}
          >
            Régions
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
        Saisie manuelle ({mode === "regions" ? "régions" : "pays"} + %)
      </Text>
      {mode === "countries" && (
        <TextInput
          accessibilityLabel="Rechercher un pays"
          style={{
            borderWidth: 1,
            borderColor: colors.cardBorder,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            color: colors.text,
          }}
          value={countryQuery}
          onChangeText={setCountryQuery}
          placeholder="Rechercher un pays…"
          placeholderTextColor={colors.textMuted}
        />
      )}
      {draft.map((row, index) => (
        <View key={index} style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(mode === "regions" ? regionOptions : countryOptions).map(
              (option) => {
                const selected = row.country === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    accessibilityLabel={`Clé géographique ${index + 1} ${option.label}`}
                    onPress={() => {
                      const next = [...draftRef.current];
                      next[index] = { ...next[index], country: option.value };
                      updateDraft(next);
                    }}
                    style={{
                      borderWidth: 1,
                      borderColor: selected
                        ? colors.accentBg
                        : colors.cardBorder,
                      backgroundColor: selected
                        ? colors.accentBg
                        : "transparent",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? "#fff" : colors.text,
                        fontSize: 12,
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>
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
