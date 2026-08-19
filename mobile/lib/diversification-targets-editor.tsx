import { validateDiversificationTargets } from "@patrimo/core/diversification-targets";
import type { DiversificationTarget } from "@patrimo/core/schema";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import { DiversificationDimensionPicker } from "./diversification-dimension-picker";
import type { Theme } from "./theme";
import { saveDiversificationTargets } from "./write-diversification-targets";

type DraftRow = {
	id: string;
	key: string;
	minPercent: string;
	maxPercent: string;
};

type Props = {
	initialTargets: DiversificationTarget[];
	theme: Theme;
	onSaved: () => Promise<void>;
};

function toDraft(rows: DiversificationTarget[]): DraftRow[] {
	return rows.map((row, index) => ({
		id: `saved-${index}-${row.key}`,
		key: row.key,
		minPercent: String(Math.round(row.minPct * 1000) / 10),
		maxPercent: String(Math.round(row.maxPct * 1000) / 10),
	}));
}

function fromDraft(rows: DraftRow[]): DiversificationTarget[] {
	return rows.map((row) => ({
		key: row.key.trim(),
		minPct: Number(row.minPercent.replace(",", ".")) / 100,
		maxPct: Number(row.maxPercent.replace(",", ".")) / 100,
	}));
}

export function DiversificationTargetsEditor({
	initialTargets,
	theme: t,
	onSaved,
}: Props) {
	const [rows, setRows] = useState<DraftRow[]>(() => toDraft(initialTargets));
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	function updateRow(id: string, patch: Partial<DraftRow>) {
		setRows((current) =>
			current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
		);
	}

	function addRow() {
		setRows((current) => [
			...current,
			{
				id: `draft-${Date.now()}-${current.length}`,
				key: "",
				minPercent: "0",
				maxPercent: "0",
			},
		]);
	}

	function removeRow(id: string) {
		setRows((current) => current.filter((row) => row.id !== id));
	}

	async function save() {
		const targets = fromDraft(rows);
		const validation = validateDiversificationTargets(targets);
		if (!validation.ok) {
			setError(
				validation.reason === "overlapping_keys"
					? "Ces dimensions se chevauchent (pays et sa région)."
					: "Règles invalides — vérifie la dimension et les min/max.",
			);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await saveDiversificationTargets(targets);
			await onSaved();
			Alert.alert("Enregistré", "Cibles de diversification mises à jour.");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Échec de la sauvegarde");
		} finally {
			setSaving(false);
		}
	}

	return (
		<View
			style={{
				backgroundColor: t.card,
				borderRadius: 12,
				borderWidth: 1,
				borderColor: t.cardBorder,
				padding: 16,
				gap: 10,
				marginBottom: 16,
			}}
		>
			<Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>
				Cibles de diversification
			</Text>
			<Text style={{ fontSize: 13, color: t.textMuted, marginBottom: 4 }}>
				Règles min–max (pays, région ou crypto). Pas besoin de totaliser 100 %.
			</Text>

			{rows.map((row, index) => {
				const otherKeys = rows
					.filter((entry) => entry.id !== row.id)
					.map((entry) => entry.key);

				return (
					<View key={row.id} style={{ gap: 6 }}>
						<View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
							<DiversificationDimensionPicker
								value={row.key}
								otherKeys={otherKeys}
								theme={t}
								onChange={(key) => updateRow(row.id, { key })}
								rowLabel={`Dimension ${index + 1}`}
							/>
							<TextInput
								style={{
									flex: 0.5,
									borderWidth: 1,
									borderColor: t.cardBorder,
									borderRadius: 8,
									paddingHorizontal: 8,
									paddingVertical: 8,
									fontSize: 13,
									color: t.text,
									backgroundColor: t.bg,
								}}
								value={row.minPercent}
								onChangeText={(minPercent) => updateRow(row.id, { minPercent })}
								placeholder="Min %"
								placeholderTextColor={t.textMuted}
								keyboardType="decimal-pad"
								accessibilityLabel="Min %"
							/>
							<TextInput
								style={{
									flex: 0.5,
									borderWidth: 1,
									borderColor: t.cardBorder,
									borderRadius: 8,
									paddingHorizontal: 8,
									paddingVertical: 8,
									fontSize: 13,
									color: t.text,
									backgroundColor: t.bg,
								}}
								value={row.maxPercent}
								onChangeText={(maxPercent) => updateRow(row.id, { maxPercent })}
								placeholder="Max %"
								placeholderTextColor={t.textMuted}
								keyboardType="decimal-pad"
								accessibilityLabel="Max %"
							/>
							<Pressable onPress={() => removeRow(row.id)} hitSlop={8}>
								<Text
									style={{ color: t.danger, fontSize: 16, paddingHorizontal: 4 }}
								>
									✕
								</Text>
							</Pressable>
						</View>
					</View>
				);
			})}

			<View
				style={{
					flexDirection: "row",
					justifyContent: "space-between",
					alignItems: "center",
					marginTop: 4,
				}}
			>
				<Pressable
					style={{ paddingVertical: 8, paddingHorizontal: 4 }}
					onPress={addRow}
					accessibilityRole="button"
				>
					<Text style={{ color: t.accent, fontWeight: "600" }}>
						Ajouter une règle
					</Text>
				</Pressable>
				<Pressable
					style={{
						backgroundColor: t.accent,
						borderRadius: 8,
						paddingHorizontal: 16,
						paddingVertical: 10,
						minWidth: 120,
						alignItems: "center",
						opacity: saving ? 0.6 : 1,
					}}
					onPress={save}
					disabled={saving}
					accessibilityRole="button"
					accessibilityLabel="Enregistrer"
				>
					{saving ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={{ color: "#fff", fontWeight: "600" }}>
							Enregistrer
						</Text>
					)}
				</Pressable>
			</View>

			{error ? (
				<Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
			) : null}
		</View>
	);
}
