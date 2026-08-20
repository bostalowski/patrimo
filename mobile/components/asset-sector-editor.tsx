import { useState } from "react";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	Alert,
} from "react-native";
import type { SectorAllocation } from "@patrimo/core/schema";
import type { SectorSlice } from "@patrimo/core/sector-exposure";
import {
	isIncompleteSectorDraftSum,
	sumSectorDraftWeightPercents,
} from "@patrimo/core/sector-allocation";
import { SectorExposureList } from "./sector-exposure-list";
import { sectorOptions } from "../lib/sector-key-options";

type DraftRow = { sector: string; weightPercent: string };

function emptyDraft(): DraftRow[] {
	return [{ sector: "", weightPercent: "" }];
}

function incompleteSumLabel(draft: DraftRow[]): string | null {
	const sum = sumSectorDraftWeightPercents(
		draft.map((row) => row.weightPercent),
	);
	if (!isIncompleteSectorDraftSum(sum)) return null;
	return `${Math.round(sum * 10) / 10} % renseignés`;
}

function draftFromAllocations(allocations: SectorAllocation[]): DraftRow[] {
	if (allocations.length === 0) return emptyDraft();
	return allocations.map((row) => ({
		sector: row.sector,
		weightPercent: String(Math.round(row.weight * 1000) / 10),
	}));
}

export function AssetSectorEditor({
	assetLabel,
	hasIsin = false,
	allocations,
	sectors,
	colors,
	onSave,
	onSyncJustEtf,
	pending,
}: {
	assetId: string;
	assetLabel: string;
	hasIsin?: boolean;
	allocations: SectorAllocation[];
	sectors: SectorSlice[];
	colors: {
		text: string;
		textSecondary: string;
		textMuted: string;
		cardBorder: string;
		accentBg: string;
	};
	onSave: (
		weights: Array<{ sector: string; weight: number }>,
	) => Promise<void>;
	onSyncJustEtf?: (options: {
		restore: boolean;
	}) => Promise<{ ok: boolean; skippedManual?: boolean }>;
	pending: boolean;
}) {
	const [draft, setDraft] = useState(() => draftFromAllocations(allocations));
	const keyOptions = sectorOptions();
	const sumLabel = incompleteSumLabel(draft);

	const save = async () => {
		const weights = draft
			.filter((row) => row.sector.trim() && row.weightPercent.trim())
			.map((row) => ({
				sector: row.sector.trim(),
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
			{sectors.length === 0 ? (
				<Text style={{ color: colors.textMuted, fontSize: 13 }}>
					Aucune exposition sectorielle renseignée pour {assetLabel}.
				</Text>
			) : (
				<SectorExposureList
					title="Exposition sectorielle"
					sectors={sectors}
					colors={colors}
				/>
			)}

			{hasIsin && onSyncJustEtf && (
				<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
					<TouchableOpacity
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

			<Text style={{ color: colors.text, fontWeight: "600", fontSize: 13 }}>
				Saisie manuelle (secteur + %)
			</Text>
			{draft.map((row, index) => (
				<View key={index} style={{ gap: 8 }}>
					<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
						{keyOptions.map((option) => (
							<TouchableOpacity
								key={option.value}
								onPress={() => {
									const next = [...draft];
									next[index] = { ...row, sector: option.value };
									setDraft(next);
								}}
								style={{
									borderWidth: 1,
									borderColor:
										row.sector === option.value
											? colors.accentBg
											: colors.cardBorder,
									borderRadius: 8,
									paddingVertical: 6,
									paddingHorizontal: 10,
									backgroundColor:
										row.sector === option.value ? colors.accentBg : "transparent",
								}}
							>
								<Text
									style={{
										color: row.sector === option.value ? "#fff" : colors.text,
										fontSize: 12,
									}}
								>
									{option.label}
								</Text>
							</TouchableOpacity>
						))}
					</View>
					<TextInput
						value={row.weightPercent}
						onChangeText={(value) => {
							const next = [...draft];
							next[index] = { ...row, weightPercent: value };
							setDraft(next);
						}}
						keyboardType="decimal-pad"
						placeholder="35"
						placeholderTextColor={colors.textMuted}
						style={{
							borderWidth: 1,
							borderColor: colors.cardBorder,
							borderRadius: 8,
							padding: 10,
							color: colors.text,
						}}
					/>
				</View>
			))}
			{sumLabel && (
				<Text style={{ color: colors.textMuted, fontSize: 13 }}>{sumLabel}</Text>
			)}
			<View style={{ flexDirection: "row", gap: 8 }}>
				<TouchableOpacity
					onPress={() => setDraft([...draft, { sector: "", weightPercent: "" }])}
					style={{
						borderWidth: 1,
						borderColor: colors.cardBorder,
						borderRadius: 8,
						paddingVertical: 10,
						paddingHorizontal: 12,
					}}
				>
					<Text style={{ color: colors.text, fontWeight: "600" }}>
						Ajouter une ligne
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					disabled={pending}
					onPress={() => void save()}
					style={{
						backgroundColor: colors.accentBg,
						borderRadius: 8,
						paddingVertical: 10,
						paddingHorizontal: 12,
						opacity: pending ? 0.6 : 1,
					}}
				>
					<Text style={{ color: "#fff", fontWeight: "600" }}>Enregistrer</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
