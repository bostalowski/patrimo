import { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import type { GeographicAllocation } from "@patrimo/core/schema";
import {
  geographicAllocationGranularity,
  type GeographicSlice,
} from "@patrimo/core/geographic-exposure";
import {
  isIncompleteGeographicDraftSum,
  sumGeographicDraftWeightPercents,
} from "@patrimo/core/geographic-allocation";
import { GeographicExposureList } from "./geographic-exposure-list";
import {
  geographicCountryOptions,
  geographicRegionOptions,
} from "../lib/geographic-key-options";

type DraftRow = { country: string; weightPercent: string };
type EntryMode = "countries" | "regions";

function emptyDraft(): DraftRow[] {
  return [{ country: "", weightPercent: "" }];
}

function incompleteSumLabel(draft: DraftRow[]): string | null {
  const sum = sumGeographicDraftWeightPercents(
    draft.map((row) => row.weightPercent),
  );
  if (!isIncompleteGeographicDraftSum(sum)) return null;
  return `${Math.round(sum * 10) / 10} % renseignés`;
}

function draftFromAllocations(allocations: GeographicAllocation[]): DraftRow[] {
  if (allocations.length === 0) return emptyDraft();
  return allocations.map((row) => ({
    country: row.country,
    weightPercent: String(Math.round(row.weight * 1000) / 10),
  }));
}

function entryModeFromAllocations(
  allocations: GeographicAllocation[],
): EntryMode {
  if (allocations.length === 0) return "countries";
  return geographicAllocationGranularity(allocations.map((row) => row.country)) ===
    "region"
    ? "regions"
    : "countries";
}

function initialDraftsByMode(allocations: GeographicAllocation[]): Record<
  EntryMode,
  DraftRow[]
> {
  const mode = entryModeFromAllocations(allocations);
  const filled = draftFromAllocations(allocations);
  return {
    countries: mode === "countries" ? filled : emptyDraft(),
    regions: mode === "regions" ? filled : emptyDraft(),
  };
}

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
  onSyncJustEtf?: (options: {
    restore: boolean;
  }) => Promise<{ ok: boolean; skippedManual?: boolean }>;
  pending: boolean;
}) {
  const [mode, setMode] = useState<EntryMode>(() =>
    entryModeFromAllocations(allocations),
  );
  const [countryQuery, setCountryQuery] = useState("");
  const [draftByMode, setDraftByMode] = useState(() =>
    initialDraftsByMode(allocations),
  );
  const modeRef = useRef(mode);
  const draftByModeRef = useRef(draftByMode);
  const draft = draftByMode[mode];

  const updateDraft = (next: DraftRow[]) => {
    const updated = {
      ...draftByModeRef.current,
      [modeRef.current]: next,
    };
    draftByModeRef.current = updated;
    setDraftByMode(updated);
  };

  const switchMode = (nextMode: EntryMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
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
  const sumLabel = incompleteSumLabel(draft);

  const save = async () => {
    const weights = draftByModeRef.current[modeRef.current]
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
      if (result.skippedManual) {
        Alert.alert(
          "Répartition manuelle conservée",
          "Utilise « Rétablir depuis JustETF » pour écraser la saisie manuelle.",
        );
        return;
      }
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
          onPress={() => switchMode("countries")}
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
          onPress={() => switchMode("regions")}
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
                      const next = [...draftByModeRef.current[modeRef.current]];
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
              const next = [...draftByModeRef.current[modeRef.current]];
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
            ...draftByModeRef.current[modeRef.current],
            { country: "", weightPercent: "" },
          ])
        }
      >
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Ajouter une ligne
        </Text>
      </TouchableOpacity>
      {sumLabel && (
        <Text
          accessibilityLabel={sumLabel}
          style={{ color: colors.textMuted, fontSize: 13 }}
        >
          {sumLabel}
        </Text>
      )}
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
