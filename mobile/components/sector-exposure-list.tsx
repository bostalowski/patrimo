import { View, Text } from "react-native";
import { sectorLabel, type SectorSlice } from "@patrimo/core/sector-exposure";
import { formatEuro, formatPercent } from "@patrimo/core/format";

export function SectorExposureList({
	title,
	sectors,
	unmapped,
	colors,
}: {
	title: string;
	sectors: SectorSlice[];
	unmapped?: { marketValue: number; weight: number } | null;
	colors: {
		text: string;
		textSecondary: string;
		textMuted: string;
	};
}) {
	if (sectors.length === 0 && !unmapped) {
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
			{sectors.map((slice) => (
				<View
					key={slice.key}
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						paddingVertical: 8,
					}}
				>
					<Text style={{ color: colors.text, fontSize: 13 }}>
						{sectorLabel(slice.key)}
					</Text>
					<Text style={{ color: colors.textSecondary, fontSize: 13 }}>
						{formatEuro(slice.marketValue)} · {formatPercent(slice.weight)}
					</Text>
				</View>
			))}
			{unmapped && (
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						paddingVertical: 8,
					}}
				>
					<Text style={{ color: colors.text, fontSize: 13 }}>Non renseigné</Text>
					<Text style={{ color: colors.textSecondary, fontSize: 13 }}>
						{formatEuro(unmapped.marketValue)} · {formatPercent(unmapped.weight)}
					</Text>
				</View>
			)}
		</View>
	);
}
