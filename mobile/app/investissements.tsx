import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio, portfolioByEnvelope } from "@patrimo/core/portfolio";
import {
  computeDcaPlan,
  computeDcaExecution,
  type DcaExecution,
  type ExecutionLine,
} from "@patrimo/core/dca";
import { formatEuro, formatPercent } from "@patrimo/core/format";
import { clampRetirementAge } from "@patrimo/core/schema";
import type { Envelope, DcaConfig, DcaFrequency, DcaLine, RetirementProfile } from "@patrimo/core/schema";
import { saveDcaConfigs } from "../lib/write-dca";
import { useThemeColors, shared } from "../lib/theme";
import type { Theme } from "../lib/theme";

const FREQUENCY_LABELS: Record<string, string> = {
  MENSUEL: "Mensuel",
  TRIMESTRIEL: "Trimestriel",
  ANNUEL: "Annuel",
};

const ENVELOPE_LABELS: Record<string, string> = {
  CTO: "CTO",
  PEA: "PEA",
  PEE: "PEE",
  AV: "Assurance-vie",
  LIVRET: "Livret",
  PER: "PER",
};

const DEFAULT_MIN_ORDERS: Partial<Record<Envelope, number>> = {
  PEA: 200,
};

const RETIREMENT_STORAGE_KEY = "@patrimo/retirement-profile";

type Tab = "dca" | "execution" | "retraite" | "immobilier";

const TABS: { key: Tab; label: string }[] = [
  { key: "dca", label: "DCA" },
  { key: "execution", label: "Exécution" },
  { key: "retraite", label: "Retraite" },
  { key: "immobilier", label: "Immo" },
];

export default function InvestissementsScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading, error } = useWorkbook();
  const [tab, setTab] = useState<Tab>("dca");

  if (loading) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  if (error || !workbook) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          {error ?? "Configure une source de fichier dans les réglages."}
        </Text>
      </View>
    );
  }

  const hasDca = workbook.dca.length > 0;
  const hasProperties = workbook.properties.length > 0;
  const visibleTabs = TABS.filter((t) => {
    if (t.key === "immobilier") return hasProperties;
    if (t.key === "execution") return hasDca;
    return true;
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: isDark ? "#27272a" : "#f4f4f5",
          borderRadius: 10,
          padding: 3,
          marginBottom: 16,
        }}
      >
        {visibleTabs.map((item) => (
          <TouchableOpacity
            key={item.key}
            onPress={() => setTab(item.key)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 8,
              alignItems: "center",
              backgroundColor:
                tab === item.key
                  ? isDark
                    ? "#3f3f46"
                    : "#ffffff"
                  : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: tab === item.key ? "600" : "400",
                color: tab === item.key ? t.text : t.textMuted,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "dca" && <DcaTab workbook={workbook} prices={prices} theme={t} />}
      {tab === "execution" && (
        <ExecutionTab workbook={workbook} prices={prices} theme={t} />
      )}
      {tab === "retraite" && <RetraiteTab theme={t} />}
      {tab === "immobilier" && <ImmobilierTab workbook={workbook} theme={t} />}
    </ScrollView>
  );
}

const ALL_ENVELOPES: Envelope[] = ["CTO", "PEA", "PEE", "AV", "LIVRET", "PER"];
const ALL_FREQUENCIES: { key: DcaFrequency; label: string }[] = [
  { key: "MENSUEL", label: "Mensuel" },
  { key: "TRIMESTRIEL", label: "Trimestriel" },
  { key: "ANNUEL", label: "Annuel" },
];

type DcaDraft = {
  id: string;
  label: string;
  envelope: Envelope;
  amount: string;
  frequency: DcaFrequency;
  lines: { label: string; assetIds: string; targetPct: string }[];
};

function emptyDraft(): DcaDraft {
  return {
    id: `dca-${Date.now()}`,
    label: "",
    envelope: "PEA",
    amount: "",
    frequency: "MENSUEL",
    lines: [{ label: "", assetIds: "", targetPct: "100" }],
  };
}

function configToDraft(config: DcaConfig): DcaDraft {
  return {
    id: config.id,
    label: config.label,
    envelope: config.envelope,
    amount: String(config.amount),
    frequency: config.frequency,
    lines: config.lines.map((l) => ({
      label: l.label ?? "",
      assetIds: l.assetIds.join(", "),
      targetPct: String(Math.round(l.targetPct * 1000) / 10),
    })),
  };
}

function draftToConfig(draft: DcaDraft): DcaConfig | null {
  const amount = Number(draft.amount.replace(",", "."));
  if (!draft.label.trim() || !Number.isFinite(amount) || amount < 0) return null;

  const lines: DcaLine[] = [];
  for (const line of draft.lines) {
    const assetIds = line.assetIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (assetIds.length === 0) continue;
    const pct = Number(line.targetPct.replace(",", "."));
    if (!Number.isFinite(pct) || pct <= 0) continue;
    lines.push({
      label: line.label.trim() || undefined,
      assetIds,
      targetPct: pct / 100,
    });
  }
  if (lines.length === 0) return null;

  return {
    id: draft.id,
    label: draft.label.trim(),
    envelope: draft.envelope,
    amount,
    frequency: draft.frequency,
    lines,
  };
}

function DcaTab({
  workbook,
  prices,
  theme: t,
}: {
  workbook: NonNullable<ReturnType<typeof useWorkbook>["workbook"]>;
  prices: Map<string, number>;
  theme: Theme;
}) {
  const { refresh } = useWorkbook();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DcaDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (config: DcaConfig) => {
    setEditingId(config.id);
    setDraft(configToDraft(config));
  };

  const startCreate = () => {
    const d = emptyDraft();
    setEditingId(d.id);
    setDraft(d);
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(null);
  };

  const save = async () => {
    if (!draft) return;
    const parsed = draftToConfig(draft);
    if (!parsed) {
      Alert.alert("Erreur", "Vérifie les champs : il faut un libellé, un montant, et au moins une ligne avec un actif et un %.");
      return;
    }

    const existing = workbook.dca.filter((c) => c.id !== parsed.id);
    const updated = [...existing, parsed];

    setSaving(true);
    try {
      await saveDcaConfigs(updated);
      await refresh();
      setEditingId(null);
      setDraft(null);
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Échec de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = (config: DcaConfig) => {
    Alert.alert(
      "Supprimer",
      `Supprimer le plan "${config.label}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const updated = workbook.dca.filter((c) => c.id !== config.id);
            setSaving(true);
            try {
              await saveDcaConfigs(updated);
              await refresh();
            } catch (e) {
              Alert.alert("Erreur", e instanceof Error ? e.message : "Échec");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View>
      {workbook.dca.map((config) =>
        editingId === config.id && draft ? (
          <DcaEditorCard
            key={config.id}
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={cancel}
            saving={saving}
            assets={workbook.assets}
            theme={t}
          />
        ) : (
          <DcaCard
            key={config.id}
            config={config}
            onEdit={() => startEdit(config)}
            onDelete={() => deletePlan(config)}
            theme={t}
          />
        ),
      )}

      {editingId && !workbook.dca.some((c) => c.id === editingId) && draft && (
        <DcaEditorCard
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={cancel}
          saving={saving}
          assets={workbook.assets}
          theme={t}
        />
      )}

      {!editingId && (
        <TouchableOpacity
          onPress={startCreate}
          style={{
            borderWidth: 1,
            borderColor: t.accent,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
            marginTop: 4,
            borderStyle: "dashed",
          }}
        >
          <Text style={{ color: t.accent, fontSize: 14, fontWeight: "600" }}>
            + Nouveau plan DCA
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function DcaCard({
  config,
  onEdit,
  onDelete,
  theme: t,
}: {
  config: DcaConfig;
  onEdit: () => void;
  onDelete: () => void;
  theme: Theme;
}) {
  return (
    <View style={[shared.card, { backgroundColor: t.card }]}>
      <View style={[shared.row, { marginBottom: 8 }]}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: "600", flex: 1 }}>
          {config.label}
        </Text>
        <Text style={{ color: t.accent, fontSize: 14, fontWeight: "600" }}>
          {formatEuro(config.amount)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>
          {ENVELOPE_LABELS[config.envelope] ?? config.envelope}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 13 }}>
          {FREQUENCY_LABELS[config.frequency] ?? config.frequency}
        </Text>
      </View>
      {config.lines.map((line, lineIdx) => (
        <View
          key={line.label ?? line.assetIds.join("-")}
          style={[
            shared.row,
            {
              paddingVertical: 8,
              borderTopWidth: lineIdx > 0 ? 1 : 0,
              borderTopColor: t.cardBorder,
            },
          ]}
        >
          <Text
            style={{ color: t.textSecondary, fontSize: 14, flex: 1 }}
            numberOfLines={1}
          >
            {line.label ?? line.assetIds.join(", ")}
          </Text>
          <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
            {formatPercent(line.targetPct)}
          </Text>
        </View>
      ))}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 16,
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: t.cardBorder,
        }}
      >
        <TouchableOpacity onPress={onDelete}>
          <Text style={{ color: "#ef4444", fontSize: 13 }}>Supprimer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit}>
          <Text style={{ color: t.accent, fontSize: 13, fontWeight: "600" }}>Modifier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DcaEditorCard({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  assets,
  theme: t,
}: {
  draft: DcaDraft;
  setDraft: (d: DcaDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  assets: { id: string; label: string }[];
  theme: Theme;
}) {
  const updateField = <K extends keyof DcaDraft>(key: K, value: DcaDraft[K]) =>
    setDraft({ ...draft, [key]: value });

  const updateLine = (idx: number, field: string, value: string) => {
    const lines = [...draft.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    setDraft({ ...draft, lines });
  };

  const addLine = () =>
    setDraft({
      ...draft,
      lines: [...draft.lines, { label: "", assetIds: "", targetPct: "" }],
    });

  const removeLine = (idx: number) => {
    if (draft.lines.length <= 1) return;
    setDraft({ ...draft, lines: draft.lines.filter((_, i) => i !== idx) });
  };

  const totalPct = draft.lines.reduce((s, l) => {
    const n = Number(l.targetPct.replace(",", "."));
    return s + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <View
      style={[
        shared.card,
        {
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: t.accent,
        },
      ]}
    >
      <FieldLabel text="Libellé" theme={t} />
      <TextInput
        value={draft.label}
        onChangeText={(v) => updateField("label", v)}
        placeholder="Ex: ETF World"
        placeholderTextColor={t.textMuted}
        style={fieldInputStyle(t)}
      />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Montant (€)" theme={t} />
          <TextInput
            value={draft.amount}
            onChangeText={(v) => updateField("amount", v)}
            keyboardType="decimal-pad"
            placeholder="500"
            placeholderTextColor={t.textMuted}
            style={fieldInputStyle(t)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Enveloppe" theme={t} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
            {ALL_ENVELOPES.map((env) => (
              <TouchableOpacity
                key={env}
                onPress={() => updateField("envelope", env)}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: 6,
                  backgroundColor: draft.envelope === env ? t.accent : t.cardBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: draft.envelope === env ? "#fff" : t.textSecondary,
                  }}
                >
                  {env}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <FieldLabel text="Fréquence" theme={t} />
      <View style={{ flexDirection: "row", gap: 6 }}>
        {ALL_FREQUENCIES.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => updateField("frequency", f.key)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: draft.frequency === f.key ? t.accent : t.cardBorder,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: draft.frequency === f.key ? "#fff" : t.textSecondary,
              }}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 16 }}>
        <View style={[shared.row, { marginBottom: 8 }]}>
          <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
            Lignes d'allocation
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: Math.abs(totalPct - 100) < 0.1 ? t.success : "#f59e0b",
            }}
          >
            Total : {totalPct.toFixed(1)}%
          </Text>
        </View>

        {draft.lines.map((line, idx) => (
          <View
            key={idx}
            style={{
              borderWidth: 1,
              borderColor: t.cardBorder,
              borderRadius: 8,
              padding: 10,
              marginBottom: 8,
              backgroundColor: t.bg,
            }}
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 2 }}>
                <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 4 }}>
                  Panier (optionnel)
                </Text>
                <TextInput
                  value={line.label}
                  onChangeText={(v) => updateLine(idx, "label", v)}
                  placeholder="Ex: US Tech"
                  placeholderTextColor={t.textMuted}
                  style={compactInputStyle(t)}
                />
              </View>
              <View style={{ width: 65 }}>
                <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 4 }}>
                  Cible %
                </Text>
                <TextInput
                  value={line.targetPct}
                  onChangeText={(v) => updateLine(idx, "targetPct", v)}
                  keyboardType="decimal-pad"
                  style={compactInputStyle(t)}
                />
              </View>
              {draft.lines.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeLine(idx)}
                  style={{ justifyContent: "flex-end", paddingBottom: 8 }}
                >
                  <Text style={{ color: "#ef4444", fontSize: 16 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: t.textMuted, fontSize: 11, marginBottom: 4 }}>
                Actifs (IDs séparés par des virgules)
              </Text>
              <TextInput
                value={line.assetIds}
                onChangeText={(v) => updateLine(idx, "assetIds", v)}
                placeholder={
                  assets.length > 0
                    ? `Ex: ${assets[0].id}`
                    : "ID1, ID2"
                }
                placeholderTextColor={t.textMuted}
                style={compactInputStyle(t)}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          onPress={addLine}
          style={{ alignItems: "center", paddingVertical: 8 }}
        >
          <Text style={{ color: t.accent, fontSize: 13 }}>+ Ajouter une ligne</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 12,
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: t.cardBorder,
        }}
      >
        <TouchableOpacity onPress={onCancel} disabled={saving}>
          <Text style={{ color: t.textSecondary, fontSize: 14 }}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={{
            backgroundColor: t.accent,
            paddingHorizontal: 20,
            paddingVertical: 8,
            borderRadius: 8,
            opacity: saving ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function compactInputStyle(t: Theme) {
  return {
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: t.text,
  } as const;
}

function ExecutionTab({
  workbook,
  prices,
  theme: t,
}: {
  workbook: NonNullable<ReturnType<typeof useWorkbook>["workbook"]>;
  prices: Map<string, number>;
  theme: Theme;
}) {
  const [amountOverrides, setAmountOverrides] = useState<
    Record<string, string>
  >({});

  const portfolio = useMemo(
    () => buildPortfolio(workbook, prices),
    [workbook, prices],
  );
  const byEnvelope = useMemo(
    () => portfolioByEnvelope(portfolio.accounts),
    [portfolio.accounts],
  );

  const assetMap = useMemo(
    () => new Map(workbook.assets.map((a) => [a.id, a])),
    [workbook.assets],
  );

  const parsedOverrides = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [id, raw] of Object.entries(amountOverrides)) {
      const n = Number(raw.replace(",", "."));
      if (Number.isFinite(n) && n >= 0) result[id] = n;
    }
    return result;
  }, [amountOverrides]);

  const executions = useMemo<
    { config: DcaConfig; execution: DcaExecution }[]
  >(() => {
    return workbook.dca.map((config) => {
      const currentValues = byEnvelope[config.envelope] ?? {};
      const effectiveConfig =
        config.id in parsedOverrides
          ? { ...config, amount: parsedOverrides[config.id] }
          : config;
      const plan = computeDcaPlan(effectiveConfig, currentValues);
      const minOrder = DEFAULT_MIN_ORDERS[config.envelope] ?? 0;
      const execution = computeDcaExecution(plan, prices, minOrder);
      return { config, execution };
    });
  }, [workbook.dca, byEnvelope, prices, parsedOverrides]);

  if (workbook.dca.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: "center" }}>
        <Text style={{ color: t.textSecondary, fontSize: 14 }}>
          Aucun plan DCA configuré
        </Text>
      </View>
    );
  }

  return (
    <View>
      {executions.map(({ config, execution }) => {
        const hasOverride = config.id in parsedOverrides;
        return (
          <View
            key={config.id}
            style={[shared.card, { backgroundColor: t.card }]}
          >
            <View style={[shared.row, { marginBottom: 8 }]}>
              <Text
                style={{ color: t.text, fontSize: 15, fontWeight: "600" }}
              >
                {config.label}
              </Text>
              <Text style={{ color: t.textMuted, fontSize: 12 }}>
                {ENVELOPE_LABELS[config.envelope] ?? config.envelope}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Text style={{ color: t.textSecondary, fontSize: 13 }}>
                Budget :
              </Text>
              <TextInput
                value={
                  amountOverrides[config.id] ?? String(config.amount)
                }
                onChangeText={(v) =>
                  setAmountOverrides((prev) => ({
                    ...prev,
                    [config.id]: v,
                  }))
                }
                keyboardType="decimal-pad"
                style={{
                  borderWidth: 1,
                  borderColor: hasOverride ? "#3b82f6" : t.cardBorder,
                  backgroundColor: hasOverride
                    ? "#3b82f610"
                    : t.card,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  fontSize: 14,
                  fontWeight: "600",
                  color: hasOverride ? "#3b82f6" : t.text,
                  width: 100,
                  fontVariant: ["tabular-nums"],
                }}
              />
              <Text style={{ color: t.textMuted, fontSize: 13 }}>€</Text>
              {hasOverride && (
                <TouchableOpacity
                  onPress={() =>
                    setAmountOverrides((prev) => {
                      const next = { ...prev };
                      delete next[config.id];
                      return next;
                    })
                  }
                >
                  <Text style={{ color: "#3b82f6", fontSize: 13 }}>
                    ↺
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <MiniStat
                label="Total ordres"
                value={formatEuro(execution.totalOrderAmount)}
                color={t.text}
                theme={t}
              />
              {execution.totalRemainder > 0 && (
                <MiniStat
                  label="Reste"
                  value={formatEuro(execution.totalRemainder)}
                  color="#f59e0b"
                  theme={t}
                />
              )}
            </View>

            {execution.lines.map((line) => (
              <ExecutionLineRow
                key={line.assetId}
                line={line}
                assetLabel={
                  assetMap.get(line.assetId)?.label ?? line.assetId
                }
                theme={t}
              />
            ))}

            {execution.rotation && (
              <View
                style={{
                  marginTop: 8,
                  backgroundColor: "#0ea5e910",
                  borderRadius: 8,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "#0ea5e930",
                }}
              >
                <Text
                  style={{
                    color: "#0ea5e9",
                    fontSize: 13,
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  Rotation sur {execution.rotation.rotationMonths} mois
                </Text>
                <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                  Concentrer sur{" "}
                  {assetMap.get(execution.rotation.focusAssetId)?.label ??
                    execution.rotation.focusAssetId}{" "}
                  : {execution.rotation.focusShares} part
                  {execution.rotation.focusShares > 1 ? "s" : ""} ={" "}
                  {formatEuro(execution.rotation.focusOrderAmount)}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function ExecutionLineRow({
  line,
  assetLabel,
  theme: t,
}: {
  line: ExecutionLine;
  assetLabel: string;
  theme: Theme;
}) {
  const statusColor =
    line.status === "BUY"
      ? t.success
      : line.status === "BUY_FRACTIONAL"
        ? t.success
        : "#f59e0b";
  const statusLabel =
    line.status === "BUY"
      ? "Acheter"
      : line.status === "BUY_FRACTIONAL"
        ? "Fractionné"
        : "Sous minimum";

  const sharesText =
    line.shares > 0
      ? String(line.shares)
      : line.fractionalShares
        ? line.fractionalShares
            .toFixed(6)
            .replace(/0+$/, "")
            .replace(/\.$/, "")
        : "—";

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: t.cardBorder,
      }}
    >
      <View style={{ flex: 2 }}>
        <Text
          style={{ color: t.text, fontSize: 13, fontWeight: "500" }}
          numberOfLines={1}
        >
          {assetLabel}
        </Text>
        {line.sharePrice > 0 && (
          <Text style={{ color: t.textMuted, fontSize: 11 }}>
            @ {formatEuro(line.sharePrice)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text
          style={{
            color: t.text,
            fontSize: 14,
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
          }}
        >
          {sharesText}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 10 }}>parts</Text>
      </View>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Text
          style={{
            color: line.orderAmount > 0 ? t.text : t.textMuted,
            fontSize: 13,
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
          }}
        >
          {line.orderAmount > 0 ? formatEuro(line.orderAmount) : "—"}
        </Text>
        <View
          style={{
            backgroundColor: `${statusColor}18`,
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
            marginTop: 2,
          }}
        >
          <Text
            style={{
              color: statusColor,
              fontSize: 10,
              fontWeight: "600",
            }}
          >
            {statusLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

function MiniStat({
  label,
  value,
  color,
  theme: t,
}: {
  label: string;
  value: string;
  color: string;
  theme: Theme;
}) {
  return (
    <View>
      <Text style={{ color: t.textMuted, fontSize: 11 }}>{label}</Text>
      <Text
        style={{
          color,
          fontSize: 14,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function RetraiteTab({ theme: t }: { theme: Theme }) {
  const [birthDate, setBirthDate] = useState("");
  const [ageDraft, setAgeDraft] = useState("64");
  const [pensionDraft, setPensionDraft] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(RETIREMENT_STORAGE_KEY);
      if (raw) {
        const profile = JSON.parse(raw) as Partial<RetirementProfile>;
        if (profile.birthDate) {
          const d = new Date(profile.birthDate);
          setBirthDate(d.toISOString().slice(0, 10));
        }
        if (profile.targetRetirementAge) {
          setAgeDraft(String(profile.targetRetirementAge));
        }
        if (profile.estimatedPublicPension !== undefined) {
          setPensionDraft(String(profile.estimatedPublicPension));
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  useState(() => {
    loadProfile();
  });

  const persist = useCallback(
    async (overrides?: Partial<{ birth: string; age: string; pension: string }>) => {
      const birth = overrides?.birth ?? birthDate;
      const age = overrides?.age ?? ageDraft;
      const pension = overrides?.pension ?? pensionDraft;

      const profile: Record<string, unknown> = {
        targetRetirementAge: clampRetirementAge(
          age === "" ? 64 : Number(age),
        ),
      };
      if (birth) profile.birthDate = new Date(birth).toISOString();
      if (pension !== "")
        profile.estimatedPublicPension = Math.max(0, Number(pension) || 0);

      await AsyncStorage.setItem(
        RETIREMENT_STORAGE_KEY,
        JSON.stringify(profile),
      );
    },
    [birthDate, ageDraft, pensionDraft],
  );

  if (!loaded) return null;

  return (
    <View style={[shared.card, { backgroundColor: t.card }]}>
      <Text
        style={{
          color: t.text,
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 4,
        }}
      >
        Profil retraite
      </Text>
      <Text
        style={{
          color: t.textMuted,
          fontSize: 12,
          marginBottom: 16,
        }}
      >
        Sauvegardé automatiquement.
      </Text>

      <FieldLabel text="Date de naissance" theme={t} />
      <TextInput
        value={birthDate}
        onChangeText={(v) => {
          setBirthDate(v);
        }}
        onBlur={() => persist({ birth: birthDate })}
        placeholder="AAAA-MM-JJ"
        placeholderTextColor={t.textMuted}
        style={fieldInputStyle(t)}
      />

      <FieldLabel text="Âge de départ visé (50–75)" theme={t} />
      <TextInput
        value={ageDraft}
        onChangeText={setAgeDraft}
        onBlur={() => {
          const clamped = clampRetirementAge(
            ageDraft === "" ? 64 : Number(ageDraft),
          );
          setAgeDraft(String(clamped));
          persist({ age: String(clamped) });
        }}
        keyboardType="number-pad"
        style={fieldInputStyle(t)}
      />

      <FieldLabel text="Pension publique estimée (€ / mois brut)" theme={t} />
      <TextInput
        value={pensionDraft}
        onChangeText={setPensionDraft}
        onBlur={() => persist({ pension: pensionDraft })}
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={t.textMuted}
        style={fieldInputStyle(t)}
      />
    </View>
  );
}

function ImmobilierTab({
  workbook,
  theme: t,
}: {
  workbook: NonNullable<ReturnType<typeof useWorkbook>["workbook"]>;
  theme: Theme;
}) {
  if (workbook.properties.length === 0) {
    return (
      <View style={{ paddingVertical: 40, alignItems: "center" }}>
        <Text style={{ color: t.textSecondary, fontSize: 14 }}>
          Aucun bien immobilier
        </Text>
      </View>
    );
  }

  return (
    <View>
      {workbook.properties.map((property) => (
        <PropertyCard key={property.id} property={property} theme={t} />
      ))}
    </View>
  );
}

function PropertyCard({
  property,
  theme: t,
}: {
  property: import("@patrimo/core/schema").Property;
  theme: Theme;
}) {
  const equity =
    property.valeurActuelle * property.partDetenue - property.montantEmprunte;

  return (
    <View style={[shared.card, { backgroundColor: t.card }]}>
      <Text
        style={{
          color: t.text,
          fontSize: 15,
          fontWeight: "600",
          marginBottom: 10,
        }}
      >
        {property.label}
      </Text>
      <DataRow label="Valeur" value={formatEuro(property.valeurActuelle)} theme={t} />
      <DataRow label="Équité nette" value={formatEuro(equity)} theme={t} />
      {property.loyerMensuelHC > 0 && (
        <DataRow
          label="Loyer HC"
          value={`${formatEuro(property.loyerMensuelHC)}/mois`}
          theme={t}
        />
      )}
    </View>
  );
}

function DataRow({
  label,
  value,
  theme: t,
}: {
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <View style={[shared.row, { paddingVertical: 4 }]}>
      <Text style={{ color: t.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
  );
}

function FieldLabel({ text, theme: t }: { text: string; theme: Theme }) {
  return (
    <Text
      style={{
        color: t.textSecondary,
        fontSize: 13,
        fontWeight: "500",
        marginTop: 12,
        marginBottom: 6,
      }}
    >
      {text}
    </Text>
  );
}

function fieldInputStyle(t: Theme) {
  return {
    borderWidth: 1,
    borderColor: t.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: t.text,
    backgroundColor: t.bg,
  } as const;
}
