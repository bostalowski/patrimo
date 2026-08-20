import { View, Text } from "react-native";
import { sectorLabel, type SectorSlice } from "@patrimo/core/sector-exposure";
import { ExposureBarList } from "./exposure-bar-list";

export function SectorExposureList({
	title,
	sectors,
	colors,
}: {
	title: string;
	sectors: SectorSlice[];
	colors: {
		text: string;
		textSecondary: string;
		textMuted: string;
		cardBorder: string;
		accentBg?: string;
	};
}) {
	if (sectors.length === 0) {
		return (
			<View>
				<Text
					accessibilityRole="header"
					style={{
						color: colors.text,
						fontSize: 15,
						fontWeight: "600",
						marginBottom: 8,
					}}
				>
					{title}
				</Text>
				<Text style={{ color: colors.textMuted, fontSize: 13 }}>
					Aucune répartition sectorielle disponible
				</Text>
			</View>
		);
	}

	return (
		<View style={{ gap: 12 }}>
			<Text
				accessibilityRole="header"
				style={{
					color: colors.text,
					fontSize: 15,
					fontWeight: "600",
				}}
			>
				{title}
			</Text>
			<ExposureBarList
				items={sectors.map((slice) => ({
					key: slice.key,
					label: sectorLabel(slice.key),
					weight: slice.weight,
					marketValue: slice.marketValue,
				}))}
				colors={colors}
			/>
		</View>
	);
}
