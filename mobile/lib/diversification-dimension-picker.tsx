import { diversificationKeyLabel } from "@patrimo/core/diversification-labels";
import { useState } from "react";
import {
	Pressable,
	Text,
	TextInput,
	View,
} from "react-native";
import {
	diversificationKeyOptionsForRow,
	filterCountryOptionsForQuery,
} from "./diversification-key-options";
import type { Theme } from "./theme";

type Props = {
	value: string;
	otherKeys: readonly string[];
	theme: Theme;
	onChange: (key: string) => void;
	rowLabel: string;
};

export function DiversificationDimensionPicker({
	value,
	otherKeys,
	theme: t,
	onChange,
	rowLabel,
}: Props) {
	const [expanded, setExpanded] = useState(!value);
	const [countryQuery, setCountryQuery] = useState("");
	const groups = diversificationKeyOptionsForRow({
		currentKey: value,
		otherKeys,
	});
	const cryptoGroup = groups.find((group) => group.label === "Crypto");
	const regionGroup = groups.find((group) => group.label === "Régions");
	const countryGroup = groups.find((group) => group.label === "Pays");
	const countryOptions = countryGroup
		? filterCountryOptionsForQuery(countryGroup.options, countryQuery)
		: [];

	function selectKey(key: string) {
		onChange(key);
		setExpanded(false);
		setCountryQuery("");
	}

	return (
		<View style={{ flex: 1.2, gap: 6 }}>
			<Pressable
				onPress={() => setExpanded((open) => !open)}
				accessibilityRole="button"
				accessibilityLabel={rowLabel}
				style={{
					borderWidth: 1,
					borderColor: t.cardBorder,
					borderRadius: 8,
					paddingHorizontal: 8,
					paddingVertical: 8,
					backgroundColor: t.bg,
				}}
			>
				<Text style={{ fontSize: 13, color: value ? t.text : t.textMuted }}>
					{value ? diversificationKeyLabel(value) : "Choisir une dimension…"}
				</Text>
			</Pressable>

			{expanded && (
				<View style={{ gap: 8 }}>
					{cryptoGroup && (
						<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
							{cryptoGroup.options.map((option) => (
								<OptionChip
									key={option.value}
									label={option.label}
									selected={value === option.value}
									theme={t}
									onPress={() => selectKey(option.value)}
								/>
							))}
						</View>
					)}

					{regionGroup && (
						<View style={{ gap: 4 }}>
							<Text style={{ fontSize: 11, fontWeight: "600", color: t.textMuted }}>
								Régions
							</Text>
							<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
								{regionGroup.options.map((option) => (
									<OptionChip
										key={option.value}
										label={option.label}
										selected={value === option.value}
										theme={t}
										onPress={() => selectKey(option.value)}
									/>
								))}
							</View>
						</View>
					)}

					{countryGroup && (
						<View style={{ gap: 4 }}>
							<Text style={{ fontSize: 11, fontWeight: "600", color: t.textMuted }}>
								Pays
							</Text>
							<TextInput
								style={{
									borderWidth: 1,
									borderColor: t.cardBorder,
									borderRadius: 8,
									paddingHorizontal: 8,
									paddingVertical: 8,
									fontSize: 13,
									color: t.text,
									backgroundColor: t.bg,
								}}
								value={countryQuery}
								onChangeText={setCountryQuery}
								placeholder="Rechercher un pays…"
								placeholderTextColor={t.textMuted}
								accessibilityLabel={`Rechercher un pays ${rowLabel}`}
							/>
							<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
								{countryOptions.map((option) => (
									<OptionChip
										key={option.value}
										label={option.label}
										selected={value === option.value}
										theme={t}
										onPress={() => selectKey(option.value)}
									/>
								))}
							</View>
						</View>
					)}
				</View>
			)}
		</View>
	);
}

function OptionChip({
	label,
	selected,
	theme: t,
	onPress,
}: {
	label: string;
	selected: boolean;
	theme: Theme;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			style={{
				borderWidth: 1,
				borderColor: selected ? t.accent : t.cardBorder,
				backgroundColor: selected ? t.accent : "transparent",
				borderRadius: 8,
				paddingHorizontal: 8,
				paddingVertical: 6,
			}}
		>
			<Text style={{ fontSize: 12, color: selected ? "#fff" : t.text }}>
				{label}
			</Text>
		</Pressable>
	);
}
