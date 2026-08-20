import { View, Text } from "react-native";
import { formatEuro, formatPercent } from "@patrimo/core/format";

export type ExposureBarItem = {
	key: string;
	label: string;
	weight: number;
	marketValue?: number;
};

/**
 * Horizontal percentage bars (Amundi-style) for mobile exposure lists.
 */
export function ExposureBarList({
	items,
	colors,
}: {
	items: ExposureBarItem[];
	colors: {
		text: string;
		textSecondary: string;
		textMuted: string;
		cardBorder: string;
		accentBg?: string;
	};
}) {
	if (items.length === 0) return null;

	const barColor = "#0284c7";

	return (
		<View style={{ gap: 10 }}>
			{items.map((item) => {
				const pct = Math.max(0, Math.min(1, item.weight));
				return (
					<View key={item.key} style={{ gap: 4 }}>
						<View
							style={{
								flexDirection: "row",
								justifyContent: "space-between",
								alignItems: "center",
								gap: 8,
							}}
						>
							<Text
								style={{
									color: colors.text,
									fontSize: 13,
									flexShrink: 1,
								}}
								numberOfLines={1}
							>
								{item.label}
							</Text>
							<Text
								style={{
									color: colors.textSecondary,
									fontSize: 12,
									fontVariant: ["tabular-nums"],
								}}
							>
								{formatPercent(item.weight)}
								{item.marketValue !== undefined
									? ` · ${formatEuro(item.marketValue)}`
									: ""}
							</Text>
						</View>
						<View
							style={{
								height: 10,
								borderRadius: 2,
								backgroundColor: colors.cardBorder,
								overflow: "hidden",
							}}
							accessibilityElementsHidden
							importantForAccessibility="no-hide-descendants"
						>
							<View
								style={{
									height: "100%",
									width: `${pct * 100}%`,
									backgroundColor: barColor,
									borderRadius: 2,
								}}
							/>
						</View>
					</View>
				);
			})}
		</View>
	);
}
