import { useMemo, useState } from "react";
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
import { Asset } from "@patrimo/core/schema";
import { assetDeletionImpact } from "@patrimo/core/deletion";
import { formatEuro } from "@patrimo/core/format";
import { useWorkbook } from "../lib/use-workbook";
import {
  deleteAssetFromSource,
  deleteManualPriceFromSource,
  replaceGeographicAllocationInSource,
  updateAssetInSource,
  upsertManualPriceInSource,
} from "../lib/write-asset";
import { useThemeColors, shared } from "../lib/theme";
import { DeletionModal } from "../components/deletion-modal";
import { AssetGeographicEditor } from "../components/asset-geographic-editor";
import { aggregateGeographicExposure } from "@patrimo/core/geographic-exposure";
import { buildPortfolio } from "@patrimo/core/portfolio";

const ASSET_TYPES = ["CRYPTO", "ETF", "ACTION", "FCPE", "CASH"] as const;
const PRICE_SOURCES = ["yahoo", "coingecko", "investir", "zonebourse", "manual"] as const;

export default function EditAssetScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading, refresh } = useWorkbook();
  const params = useLocalSearchParams<{ id?: string }>();
  const assetId = typeof params.id === "string" ? params.id : "";

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

  const existing = workbook.assets.find((asset) => asset.id === assetId);
  if (!existing) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Actif introuvable.
        </Text>
      </View>
    );
  }

  return (
    <EditAssetForm
      initial={existing}
      workbook={workbook}
      prices={prices}
      refresh={refresh}
    />
  );
}

function EditAssetForm({
  initial,
  workbook,
  prices,
  refresh,
}: {
  initial: Asset;
  workbook: NonNullable<ReturnType<typeof useWorkbook>["workbook"]>;
  prices: NonNullable<ReturnType<typeof useWorkbook>["prices"]>;
  refresh: () => Promise<void>;
}) {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const [label, setLabel] = useState(initial.label);
  const [type, setType] = useState<string>(initial.type);
  const [isin, setIsin] = useState(initial.isin ?? "");
  const [ticker, setTicker] = useState(initial.ticker ?? "");
  const [source, setSource] = useState<string>(initial.source);
  const [param, setParam] = useState(initial.param ?? "");
  const [ter, setTer] = useState(initial.ter != null ? String(initial.ter) : "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [manualDate, setManualDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [manualPrice, setManualPrice] = useState("");

  const history = useMemo(
    () =>
      [...(workbook.manualPrices ?? [])]
        .filter((entry) => entry.assetId === initial.id)
        .sort((left, right) => right.date.getTime() - left.date.getTime()),
    [workbook.manualPrices, initial.id],
  );

  const assetAllocations = useMemo(
    () =>
      (workbook.geographicAllocations ?? []).filter(
        (entry) => entry.assetId === initial.id,
      ),
    [workbook.geographicAllocations, initial.id],
  );

  const assetGeo = useMemo(() => {
    try {
      const portfolio = buildPortfolio(workbook, prices);
      const position = portfolio.assets.find(
        (entry) => entry.assetId === initial.id,
      );
      return aggregateGeographicExposure(
        [
          {
            assetId: initial.id,
            marketValue: position?.marketValue ?? 0,
          },
        ],
        assetAllocations,
      );
    } catch {
      return { regions: [], countries: [], coveredMarketValue: 0 };
    }
  }, [workbook, prices, initial.id, assetAllocations]);

  const handleSaveGeographicAllocation = async (
    weights: Array<{ country: string; weight: number }>,
  ) => {
    setSubmitting(true);
    setError(null);
    try {
      await replaceGeographicAllocationInSource(initial.id, weights);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const parsed = Asset.safeParse({
      id: initial.id,
      label: label.trim(),
      type,
      isin: isin.trim() || undefined,
      ticker: ticker.trim() || undefined,
      source,
      param: param.trim() || undefined,
      currency: initial.currency || "EUR",
      ter: ter ? Number(ter) : undefined,
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
      await updateAssetInSource(parsed.data);
      await refresh();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddManualPrice = async () => {
    setError(null);
    const numericPrice = Number(manualPrice.replace(",", "."));
    setSubmitting(true);
    try {
      await upsertManualPriceInSource({
        assetId: initial.id,
        date: new Date(`${manualDate}T00:00:00.000Z`),
        price: numericPrice,
      });
      setManualPrice("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteManualPrice = async (date: Date) => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteManualPriceFromSource(initial.id, date);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeletion = async () => {
    await deleteAssetFromSource(initial.id);
    await refresh();
    router.back();
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16 }}>
      <Field label="ID (clé unique)" theme={t}>
        <TextInput
          accessibilityLabel="Identifiant de l'actif"
          style={inputStyle(t)}
          value={initial.id}
          editable={false}
        />
      </Field>

      <Field label="Libellé" theme={t}>
        <TextInput
          accessibilityLabel="Libellé de l'actif"
          style={inputStyle(t)}
          value={label}
          onChangeText={setLabel}
          placeholderTextColor={t.textMuted}
        />
      </Field>

      <Field label="Type" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {ASSET_TYPES.map((assetType) => (
            <Chip
              key={assetType}
              label={assetType}
              selected={type === assetType}
              onPress={() => setType(assetType)}
              theme={t}
            />
          ))}
        </ScrollView>
      </Field>

      <Field label="Source de prix" theme={t}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {PRICE_SOURCES.map((priceSource) => (
            <Chip
              key={priceSource}
              label={priceSource}
              selected={source === priceSource}
              onPress={() => setSource(priceSource)}
              theme={t}
            />
          ))}
        </ScrollView>
      </Field>

      {source !== "manual" && (
        <Field label="Paramètre source (symbole/ISIN)" theme={t}>
          <TextInput
            style={inputStyle(t)}
            value={param}
            onChangeText={setParam}
            placeholderTextColor={t.textMuted}
          />
        </Field>
      )}

      <Field label="ISIN (optionnel)" theme={t}>
        <TextInput
          style={inputStyle(t)}
          value={isin}
          onChangeText={setIsin}
          placeholderTextColor={t.textMuted}
          autoCapitalize="characters"
        />
      </Field>

      <Field label="Ticker (optionnel)" theme={t}>
        <TextInput
          style={inputStyle(t)}
          value={ticker}
          onChangeText={setTicker}
          placeholderTextColor={t.textMuted}
          autoCapitalize="characters"
        />
      </Field>

      {type === "ETF" && (
        <Field label="TER % (optionnel)" theme={t}>
          <TextInput
            style={inputStyle(t)}
            value={ter}
            onChangeText={setTer}
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
          />
        </Field>
      )}

      <View
        style={[
          shared.card,
          { backgroundColor: t.card, marginBottom: 16, gap: 12 },
        ]}
      >
        <AssetGeographicEditor
          assetId={initial.id}
          assetLabel={initial.label}
          allocations={assetAllocations}
          regions={assetGeo.regions}
          countries={assetGeo.countries}
          colors={t}
          onSave={handleSaveGeographicAllocation}
          pending={submitting}
        />
      </View>

      {source === "manual" && (
        <View
          style={[
            shared.card,
            { backgroundColor: t.card, marginBottom: 16, gap: 12 },
          ]}
        >
          <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>
            Prix manuels
          </Text>
          <TextInput
            accessibilityLabel="Date du prix manuel"
            style={inputStyle(t)}
            value={manualDate}
            onChangeText={setManualDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={t.textMuted}
          />
          <TextInput
            accessibilityLabel="Montant du prix manuel"
            style={inputStyle(t)}
            value={manualPrice}
            onChangeText={setManualPrice}
            placeholder="VL en €"
            placeholderTextColor={t.textMuted}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity
            accessibilityLabel="Ajouter le prix manuel"
            onPress={handleAddManualPrice}
            disabled={submitting}
            style={[
              shared.button,
              { backgroundColor: t.accentBg, opacity: submitting ? 0.6 : 1 },
            ]}
          >
            <Text style={[shared.buttonText, { color: "#fff" }]}>
              Ajouter le prix
            </Text>
          </TouchableOpacity>
          {history.map((entry) => (
            <View
              key={`${entry.assetId}-${entry.date.toISOString()}`}
              style={[shared.row, { alignItems: "center" }]}
            >
              <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                {entry.date.toISOString().slice(0, 10)}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ color: t.text, fontWeight: "600" }}>
                  {formatEuro(entry.price)}
                </Text>
                <TouchableOpacity
                  accessibilityLabel={`Supprimer le prix du ${entry.date.toISOString().slice(0, 10)}`}
                  onPress={() => handleDeleteManualPrice(entry.date)}
                >
                  <Text style={{ color: t.danger, fontSize: 13 }}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {error ? (
        <Text style={{ color: t.danger, marginBottom: 12 }}>{error}</Text>
      ) : null}

      <TouchableOpacity
        accessibilityLabel="Enregistrer l'actif"
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
        accessibilityLabel={`Supprimer l'actif ${initial.label}`}
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
          kind="asset"
          label={initial.label}
          impact={assetDeletionImpact(workbook, initial.id)}
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
