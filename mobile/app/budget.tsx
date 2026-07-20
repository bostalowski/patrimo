import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
} from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import {
  summarizeBudget,
  CATEGORY_LABELS,
  FREQUENCY_LABELS as BUDGET_FREQ_LABELS,
  REVENU_CATEGORIES,
  DEPENSE_CATEGORIES,
  EPARGNE_CATEGORIES,
} from "@patrimo/core/budget";
import { formatEuro, formatPercent } from "@patrimo/core/format";
import type {
  BudgetLine,
  BudgetKind,
  BudgetFrequency,
  BudgetCategory,
} from "@patrimo/core/schema";
import { saveBudgetLines } from "../lib/write-budget";
import { useThemeColors, shared } from "../lib/theme";
import type { Theme } from "../lib/theme";

const KIND_LABELS: Record<BudgetKind, string> = {
  REVENU: "Revenu",
  DEPENSE: "Dépense",
  EPARGNE: "Épargne",
};

const ALL_FREQUENCIES: { key: BudgetFrequency; label: string }[] = [
  { key: "MENSUEL", label: "Mensuel" },
  { key: "TRIMESTRIEL", label: "Trimestriel" },
  { key: "ANNUEL", label: "Annuel" },
];

const KIND_COLORS: Record<BudgetKind, string> = {
  REVENU: "#22c55e",
  DEPENSE: "#ef4444",
  EPARGNE: "#3b82f6",
};

function categoriesForKind(kind: BudgetKind): BudgetCategory[] {
  switch (kind) {
    case "REVENU":
      return REVENU_CATEGORIES;
    case "DEPENSE":
      return DEPENSE_CATEGORIES;
    case "EPARGNE":
      return EPARGNE_CATEGORIES;
  }
}

type BudgetDraft = {
  id: string;
  label: string;
  kind: BudgetKind;
  amount: string;
  frequency: BudgetFrequency;
  category: BudgetCategory;
  notes: string;
};

function emptyDraft(kind: BudgetKind): BudgetDraft {
  const categories = categoriesForKind(kind);
  return {
    id: `budget-${Date.now()}`,
    label: "",
    kind,
    amount: "",
    frequency: "MENSUEL",
    category: categories[0],
    notes: "",
  };
}

function lineToDraft(line: BudgetLine): BudgetDraft {
  return {
    id: line.id,
    label: line.label,
    kind: line.kind,
    amount: String(line.amount),
    frequency: line.frequency,
    category: line.category,
    notes: line.notes ?? "",
  };
}

function draftToLine(draft: BudgetDraft): BudgetLine | null {
  const amount = Number(draft.amount.replace(",", "."));
  if (!draft.label.trim() || !Number.isFinite(amount) || amount <= 0)
    return null;
  return {
    id: draft.id,
    label: draft.label.trim(),
    kind: draft.kind,
    amount,
    frequency: draft.frequency,
    category: draft.category,
    notes: draft.notes.trim() || undefined,
  };
}

export default function BudgetScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, loading, error, refresh } = useWorkbook();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<BudgetDraft | null>(null);
  const [saving, setSaving] = useState(false);

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

  const summary = summarizeBudget(workbook.budget);

  const startEdit = (line: BudgetLine) => {
    setEditingId(line.id);
    setDraft(lineToDraft(line));
  };

  const startCreate = (kind: BudgetKind) => {
    const d = emptyDraft(kind);
    setEditingId(d.id);
    setDraft(d);
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(null);
  };

  const save = async () => {
    if (!draft) return;
    const parsed = draftToLine(draft);
    if (!parsed) {
      Alert.alert(
        "Erreur",
        "Vérifie les champs : il faut un libellé et un montant positif.",
      );
      return;
    }

    const existing = workbook.budget.filter((l) => l.id !== parsed.id);
    const updated = [...existing, parsed];

    setSaving(true);
    try {
      await saveBudgetLines(updated);
      await refresh();
      setEditingId(null);
      setDraft(null);
    } catch (e) {
      Alert.alert(
        "Erreur",
        e instanceof Error ? e.message : "Échec de la sauvegarde",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteLine = (line: BudgetLine) => {
    Alert.alert("Supprimer", `Supprimer "${line.label}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const updated = workbook.budget.filter((l) => l.id !== line.id);
          setSaving(true);
          try {
            await saveBudgetLines(updated);
            await refresh();
          } catch (e) {
            Alert.alert(
              "Erreur",
              e instanceof Error ? e.message : "Échec",
            );
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const revenus = workbook.budget.filter((l) => l.kind === "REVENU");
  const depenses = workbook.budget.filter((l) => l.kind === "DEPENSE");
  const epargne = workbook.budget.filter((l) => l.kind === "EPARGNE");

  const isNewEntry =
    editingId && !workbook.budget.some((l) => l.id === editingId);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <KpiCard
          label="Revenus mensuels"
          value={formatEuro(summary.revenusMensuels)}
          theme={t}
        />
        <KpiCard
          label="Dépenses"
          value={formatEuro(summary.depensesMensuelles)}
          theme={t}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
        <KpiCard
          label="Épargne"
          value={formatEuro(summary.epargneMensuelle)}
          theme={t}
        />
        <KpiCard
          label="Restant"
          value={formatEuro(summary.restant)}
          valueColor={summary.restant >= 0 ? t.success : t.danger}
          theme={t}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
        <KpiCard
          label="Taux d'épargne"
          value={formatPercent(summary.tauxEpargne)}
          theme={t}
        />
        <View style={{ flex: 1 }} />
      </View>

      <BudgetSection
        title="Revenus"
        kind="REVENU"
        lines={revenus}
        editingId={editingId}
        draft={draft}
        setDraft={setDraft}
        onEdit={startEdit}
        onDelete={deleteLine}
        onCreate={() => startCreate("REVENU")}
        onSave={save}
        onCancel={cancel}
        saving={saving}
        theme={t}
      />

      <BudgetSection
        title="Dépenses"
        kind="DEPENSE"
        lines={depenses}
        editingId={editingId}
        draft={draft}
        setDraft={setDraft}
        onEdit={startEdit}
        onDelete={deleteLine}
        onCreate={() => startCreate("DEPENSE")}
        onSave={save}
        onCancel={cancel}
        saving={saving}
        theme={t}
      />

      <BudgetSection
        title="Épargne"
        kind="EPARGNE"
        lines={epargne}
        editingId={editingId}
        draft={draft}
        setDraft={setDraft}
        onEdit={startEdit}
        onDelete={deleteLine}
        onCreate={() => startCreate("EPARGNE")}
        onSave={save}
        onCancel={cancel}
        saving={saving}
        theme={t}
      />

      {isNewEntry && draft && (
        <View style={{ marginBottom: 16 }}>
          <BudgetEditor
            draft={draft}
            setDraft={setDraft}
            onSave={save}
            onCancel={cancel}
            saving={saving}
            theme={t}
          />
        </View>
      )}
    </ScrollView>
  );
}

function BudgetSection({
  title,
  kind,
  lines,
  editingId,
  draft,
  setDraft,
  onEdit,
  onDelete,
  onCreate,
  onSave,
  onCancel,
  saving,
  theme: t,
}: {
  title: string;
  kind: BudgetKind;
  lines: BudgetLine[];
  editingId: string | null;
  draft: BudgetDraft | null;
  setDraft: (d: BudgetDraft) => void;
  onEdit: (line: BudgetLine) => void;
  onDelete: (line: BudgetLine) => void;
  onCreate: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  theme: Theme;
}) {
  const color = KIND_COLORS[kind];
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={[shared.row, { marginBottom: 8 }]}>
        <Text style={{ color: t.text, fontSize: 15, fontWeight: "600" }}>
          {title}
        </Text>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: color,
          }}
        />
      </View>

      {lines.map((line) =>
        editingId === line.id && draft ? (
          <BudgetEditor
            key={line.id}
            draft={draft}
            setDraft={setDraft}
            onSave={onSave}
            onCancel={onCancel}
            saving={saving}
            theme={t}
          />
        ) : (
          <BudgetLineCard
            key={line.id}
            line={line}
            onEdit={() => onEdit(line)}
            onDelete={() => onDelete(line)}
            theme={t}
          />
        ),
      )}

      {!editingId && (
        <TouchableOpacity
          onPress={onCreate}
          style={{
            borderWidth: 1,
            borderColor: color,
            borderRadius: 10,
            paddingVertical: 10,
            alignItems: "center",
            borderStyle: "dashed",
          }}
        >
          <Text style={{ color, fontSize: 13, fontWeight: "600" }}>
            + {KIND_LABELS[kind]}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function BudgetLineCard({
  line,
  onEdit,
  onDelete,
  theme: t,
}: {
  line: BudgetLine;
  onEdit: () => void;
  onDelete: () => void;
  theme: Theme;
}) {
  const color = KIND_COLORS[line.kind];
  return (
    <View style={[shared.card, { backgroundColor: t.card }]}>
      <View style={[shared.row, { marginBottom: 4 }]}>
        <Text
          style={{ color: t.text, fontSize: 14, fontWeight: "600", flex: 1 }}
          numberOfLines={1}
        >
          {line.label}
        </Text>
        <Text
          style={{
            color,
            fontSize: 14,
            fontWeight: "600",
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatEuro(line.amount)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
        <Text style={{ color: t.textMuted, fontSize: 12 }}>
          {CATEGORY_LABELS[line.category]}
        </Text>
        <Text style={{ color: t.textMuted, fontSize: 12 }}>
          {BUDGET_FREQ_LABELS[line.frequency]}
        </Text>
      </View>
      {line.notes && (
        <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 4 }}>
          {line.notes}
        </Text>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 16,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: t.cardBorder,
        }}
      >
        <TouchableOpacity onPress={onDelete}>
          <Text style={{ color: "#ef4444", fontSize: 12 }}>Supprimer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit}>
          <Text style={{ color: t.accent, fontSize: 12, fontWeight: "600" }}>
            Modifier
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function BudgetEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
  saving,
  theme: t,
}: {
  draft: BudgetDraft;
  setDraft: (d: BudgetDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  theme: Theme;
}) {
  const categories = categoriesForKind(draft.kind);

  const updateField = <K extends keyof BudgetDraft>(
    key: K,
    value: BudgetDraft[K],
  ) => setDraft({ ...draft, [key]: value });

  const switchKind = (kind: BudgetKind) => {
    const cats = categoriesForKind(kind);
    setDraft({ ...draft, kind, category: cats[0] });
  };

  return (
    <View
      style={[
        shared.card,
        {
          backgroundColor: t.card,
          borderWidth: 1,
          borderColor: KIND_COLORS[draft.kind],
        },
      ]}
    >
      <Text
        style={{
          color: t.textSecondary,
          fontSize: 13,
          fontWeight: "500",
          marginBottom: 8,
        }}
      >
        Type
      </Text>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
        {(["REVENU", "DEPENSE", "EPARGNE"] as BudgetKind[]).map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => switchKind(k)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor:
                draft.kind === k ? KIND_COLORS[k] : t.cardBorder,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: draft.kind === k ? "#fff" : t.textSecondary,
              }}
            >
              {KIND_LABELS[k]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 2 }}>
          <FieldLabel text="Libellé" theme={t} />
          <TextInput
            value={draft.label}
            onChangeText={(v) => updateField("label", v)}
            placeholder="Ex: Salaire net"
            placeholderTextColor={t.textMuted}
            style={fieldInputStyle(t)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Montant (€)" theme={t} />
          <TextInput
            value={draft.amount}
            onChangeText={(v) => updateField("amount", v)}
            keyboardType="decimal-pad"
            style={fieldInputStyle(t)}
          />
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
              backgroundColor:
                draft.frequency === f.key ? t.accent : t.cardBorder,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color:
                  draft.frequency === f.key ? "#fff" : t.textSecondary,
              }}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FieldLabel text="Catégorie" theme={t} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => updateField("category", cat)}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 5,
              borderRadius: 6,
              backgroundColor:
                draft.category === cat
                  ? KIND_COLORS[draft.kind]
                  : t.cardBorder,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color:
                  draft.category === cat ? "#fff" : t.textSecondary,
              }}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FieldLabel text="Notes (optionnel)" theme={t} />
      <TextInput
        value={draft.notes}
        onChangeText={(v) => updateField("notes", v)}
        placeholder="..."
        placeholderTextColor={t.textMuted}
        multiline
        style={[fieldInputStyle(t), { minHeight: 40 }]}
      />

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
          <Text style={{ color: t.textSecondary, fontSize: 14 }}>
            Annuler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          style={{
            backgroundColor: KIND_COLORS[draft.kind],
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

function KpiCard({
  label,
  value,
  valueColor,
  theme: t,
}: {
  label: string;
  value: string;
  valueColor?: string;
  theme: Theme;
}) {
  return (
    <View
      style={[
        shared.card,
        { flex: 1, backgroundColor: t.card, marginBottom: 0 },
      ]}
    >
      <Text
        style={[shared.label, { color: t.textSecondary, marginBottom: 6 }]}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          color: valueColor ?? t.text,
        }}
      >
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
