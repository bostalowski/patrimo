import type { Asset, TargetAllocationCategory } from "@patrimo/core/schema";
import { validateTargetAllocations } from "@patrimo/core/target-allocation";
import { useMemo, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import type { Theme } from "./theme";
import { saveTargetAllocations } from "./write-target-allocation";

type DraftLine = {
	key: string;
	category: string;
	targetPctPercent: string;
	assetIds: string;
};

type Props = {
	initialTargets: TargetAllocationCategory[];
	suggestion: TargetAllocationCategory[];
	assets: Asset[];
	theme: Theme;
	onSaved: () => Promise<void>;
};

function toDraft(targets: TargetAllocationCategory[]): DraftLine[] {
	return targets.map((t, i) => ({
		key: `${t.category}-${i}`,
		category: t.category,
		targetPctPercent: String(Math.round(t.targetPct * 1000) / 10),
		assetIds: t.assetIds.join(", "),
	}));
}

function fromDraft(lines: DraftLine[]): TargetAllocationCategory[] {
	return lines.map((line) => ({
		category: line.category.trim(),
		targetPct: Number(line.targetPctPercent.replace(",", ".")) / 100,
		assetIds: line.assetIds
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean),
	}));
}

export function AllocationPlanEditor({
	initialTargets,
	suggestion,
	assets,
	theme: t,
	onSaved,
}: Props) {
	const [lines, setLines] = useState<DraftLine[]>(() =>
		initialTargets.length > 0 ? toDraft(initialTargets) : [],
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const showBootstrap = useMemo(
		() => lines.length === 0 && suggestion.length > 0,
		[lines.length, suggestion.length],
	);

	const updateLine = (key: string, patch: Partial<DraftLine>) => {
		setLines((prev) =>
			prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
		);
	};

	const addLine = () => {
		setLines((prev) => [
			...prev,
			{
				key: `new-${Date.now()}`,
				category: "",
				targetPctPercent: "",
				assetIds: "",
			},
		]);
	};

	const removeLine = (key: string) => {
		setLines((prev) => prev.filter((line) => line.key !== key));
	};

	const applySuggestion = () => {
		setLines(toDraft(suggestion));
		setError(null);
	};

	const save = async () => {
		const targets = fromDraft(lines);
		const validation = validateTargetAllocations(targets, assets);
		if (!validation.ok) {
			setError(
				validation.reason === "sum_not_one"
					? "La somme des pourcentages doit être égale à 100 %."
					: "Plan invalide — vérifie les catégories et les actifs.",
			);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await saveTargetAllocations(targets);
			await onSaved();
			Alert.alert("Enregistré", "Plan d'allocation mis à jour.");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Échec de la sauvegarde");
		} finally {
			setSaving(false);
		}
	};

	return (
		<View
			style={{
				backgroundColor: t.card,
				borderRadius: 12,
				borderWidth: 1,
				borderColor: t.cardBorder,
				padding: 16,
				gap: 10,
			}}
		>
			<Text style={{ fontSize: 16, fontWeight: "600", color: t.text }}>
				Plan d&apos;allocation
			</Text>
			<Text style={{ fontSize: 13, color: t.textMuted, marginBottom: 4 }}>
				Cibles en % du portefeuille (total 100 %). Les actifs sont séparés par
				des virgules.
			</Text>

			{showBootstrap ? (
				<View
					style={{
						gap: 10,
						padding: 12,
						backgroundColor: t.bg,
						borderRadius: 8,
					}}
				>
					<Text style={{ fontSize: 13, color: t.text }}>
						Aucun plan enregistré. Suggestion :{" "}
						{suggestion
							.map(
								(row) => `${row.category} ${Math.round(row.targetPct * 100)}%`,
							)
							.join(" · ")}
					</Text>
					<Pressable
						style={{
							borderWidth: 1,
							borderColor: t.accent,
							borderRadius: 8,
							paddingHorizontal: 12,
							paddingVertical: 10,
							alignItems: "center",
						}}
						onPress={applySuggestion}
						accessibilityRole="button"
					>
						<Text style={{ color: t.accent, fontWeight: "600" }}>
							Proposer depuis DCA
						</Text>
					</Pressable>
				</View>
			) : null}

			{lines.map((line) => (
				<View
					key={line.key}
					style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
				>
					<TextInput
						style={{
							flex: 1,
							borderWidth: 1,
							borderColor: t.cardBorder,
							borderRadius: 8,
							paddingHorizontal: 8,
							paddingVertical: 8,
							fontSize: 13,
							color: t.text,
							backgroundColor: t.bg,
						}}
						value={line.category}
						onChangeText={(category) => updateLine(line.key, { category })}
						placeholder="Libellé"
						placeholderTextColor={t.textMuted}
					/>
					<TextInput
						style={{
							flex: 0.45,
							borderWidth: 1,
							borderColor: t.cardBorder,
							borderRadius: 8,
							paddingHorizontal: 8,
							paddingVertical: 8,
							fontSize: 13,
							color: t.text,
							backgroundColor: t.bg,
						}}
						value={line.targetPctPercent}
						onChangeText={(targetPctPercent) =>
							updateLine(line.key, { targetPctPercent })
						}
						placeholder="%"
						placeholderTextColor={t.textMuted}
						keyboardType="decimal-pad"
					/>
					<TextInput
						style={{
							flex: 1.2,
							borderWidth: 1,
							borderColor: t.cardBorder,
							borderRadius: 8,
							paddingHorizontal: 8,
							paddingVertical: 8,
							fontSize: 13,
							color: t.text,
							backgroundColor: t.bg,
						}}
						value={line.assetIds}
						onChangeText={(assetIds) => updateLine(line.key, { assetIds })}
						placeholder="Actifs"
						placeholderTextColor={t.textMuted}
						autoCapitalize="characters"
					/>
					<Pressable onPress={() => removeLine(line.key)} hitSlop={8}>
						<Text
							style={{ color: t.danger, fontSize: 16, paddingHorizontal: 4 }}
						>
							✕
						</Text>
					</Pressable>
				</View>
			))}

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
					onPress={addLine}
				>
					<Text style={{ color: t.accent, fontWeight: "600" }}>+ Ligne</Text>
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
