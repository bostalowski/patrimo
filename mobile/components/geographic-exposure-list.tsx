import { View, Text } from "react-native";
import {
	geographicCountryLabel,
	regionLabel,
	type GeographicSlice,
} from "@patrimo/core/geographic-exposure";
import { formatEuro, formatPercent } from "@patrimo/core/format";

export function GeographicExposureList({
	title,
	countries,
	regions = [],
	crypto,
	unmapped,
	colors,
}: {
	title: string;
	regions?: GeographicSlice[];
	countries: GeographicSlice[];
	crypto?: { marketValue: number; weight: number } | null;
	unmapped?: { marketValue: number; weight: number } | null;
	colors: {
		text: string;
		textSecondary: string;
		textMuted: string;
		cardBorder: string;
	};
}) {
	const hasGeo = countries.length > 0 || regions.length > 0;

	if (!hasGeo && !crypto && !unmapped) {
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
				<Text
					accessibilityLabel="Aucune répartition disponible"
					style={{ color: colors.textMuted, fontSize: 13 }}
				>
					Aucune répartition disponible
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

			{crypto && (
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						paddingVertical: 8,
					}}
				>
					<Text style={{ color: colors.text, fontSize: 13 }}>Crypto</Text>
					<Text style={{ color: colors.textSecondary, fontSize: 13 }}>
						{formatEuro(crypto.marketValue)} · {formatPercent(crypto.weight)}
					</Text>
				</View>
			)}

			{hasGeo ? (
				<>
					{countries.map((slice, index) => (
						<View
							key={`country-${slice.key}`}
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								paddingVertical: 8,
								borderTopWidth: index > 0 || crypto ? 1 : 0,
								borderTopColor: colors.cardBorder,
							}}
						>
							<Text style={{ color: colors.text, fontSize: 13 }}>
								{geographicCountryLabel(slice.key)}
							</Text>
							<Text style={{ color: colors.textSecondary, fontSize: 13 }}>
								{formatEuro(slice.marketValue)} · {formatPercent(slice.weight)}
							</Text>
						</View>
					))}
					{regions.length > 0 && (
						<View style={{ marginTop: countries.length > 0 ? 12 : 0 }}>
							<Text
								style={{
									color: colors.text,
									fontSize: 14,
									fontWeight: "600",
									marginBottom: 8,
								}}
							>
								Régions
							</Text>
							{regions.map((slice, index) => (
								<View
									key={`region-${slice.key}`}
									style={{
										flexDirection: "row",
										justifyContent: "space-between",
										paddingVertical: 8,
										borderTopWidth: index > 0 ? 1 : 0,
										borderTopColor: colors.cardBorder,
									}}
								>
									<Text style={{ color: colors.text, fontSize: 13 }}>
										{regionLabel(slice.key)}
									</Text>
									<Text style={{ color: colors.textSecondary, fontSize: 13 }}>
										{formatEuro(slice.marketValue)} ·{" "}
										{formatPercent(slice.weight)}
									</Text>
								</View>
							))}
						</View>
					)}
				</>
			) : (
				!unmapped && (
					<Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 8 }}>
						Aucune répartition géographique couverte.
					</Text>
				)
			)}

			{unmapped && (
				<View
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						paddingVertical: 8,
						borderTopWidth: hasGeo || crypto ? 1 : 0,
						borderTopColor: colors.cardBorder,
					}}
				>
					<Text style={{ color: colors.text, fontSize: 13 }}>Non renseigné</Text>
					<Text style={{ color: colors.textSecondary, fontSize: 13 }}>
						{formatEuro(unmapped.marketValue)} ·{" "}
						{formatPercent(unmapped.weight)}
					</Text>
				</View>
			)}
		</View>
	);
}
