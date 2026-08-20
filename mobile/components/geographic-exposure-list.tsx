import { View, Text } from "react-native";
import {
	geographicCountryLabel,
	regionLabel,
	type GeographicSlice,
} from "@patrimo/core/geographic-exposure";
import { ExposureBarList } from "./exposure-bar-list";

export function GeographicExposureList({
	title,
	countries,
	regions = [],
	crypto,
	colors,
}: {
	title: string;
	regions?: GeographicSlice[];
	countries: GeographicSlice[];
	crypto?: { marketValue: number; weight: number } | null;
	colors: {
		text: string;
		textSecondary: string;
		textMuted: string;
		cardBorder: string;
		accentBg?: string;
	};
}) {
	const hasGeo = countries.length > 0 || regions.length > 0;

	if (!hasGeo && !crypto) {
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

			{crypto && (
				<ExposureBarList
					items={[
						{
							key: "CRYPTO",
							label: "Crypto",
							weight: crypto.weight,
							marketValue: crypto.marketValue,
						},
					]}
					colors={colors}
				/>
			)}

			{hasGeo ? (
				<>
					{countries.length > 0 && (
						<ExposureBarList
							items={countries.map((slice) => ({
								key: `country-${slice.key}`,
								label: geographicCountryLabel(slice.key),
								weight: slice.weight,
								marketValue: slice.marketValue,
							}))}
							colors={colors}
						/>
					)}
					{regions.length > 0 && (
						<View style={{ gap: 8 }}>
							<Text
								style={{
									color: colors.text,
									fontSize: 14,
									fontWeight: "600",
								}}
							>
								Régions
							</Text>
							<ExposureBarList
								items={regions.map((slice) => ({
									key: `region-${slice.key}`,
									label: regionLabel(slice.key),
									weight: slice.weight,
									marketValue: slice.marketValue,
								}))}
								colors={colors}
							/>
						</View>
					)}
				</>
			) : (
				!crypto && (
					<Text style={{ color: colors.textMuted, fontSize: 13 }}>
						Aucune répartition géographique couverte.
					</Text>
				)
			)}
		</View>
	);
}
