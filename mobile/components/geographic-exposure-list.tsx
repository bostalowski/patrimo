import { View, Text } from "react-native";
import {
  regionLabel,
  type GeographicSlice,
} from "@patrimo/core/geographic-exposure";
import { formatEuro, formatPercent } from "@patrimo/core/format";

export function GeographicExposureList({
  title,
  regions,
  countries,
  colors,
}: {
  title: string;
  regions: GeographicSlice[];
  countries: GeographicSlice[];
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    cardBorder: string;
  };
}) {
  const preferred = regions.length > 0 ? regions : countries;

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 8 }}
      >
        {title}
      </Text>
      {preferred.length === 0 ? (
        <Text
          accessibilityLabel="Aucune répartition géographique"
          style={{ color: colors.textMuted, fontSize: 13 }}
        >
          Aucune répartition géographique
        </Text>
      ) : (
        preferred.map((slice, index) => (
          <View
            key={slice.key}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingVertical: 8,
              borderTopWidth: index > 0 ? 1 : 0,
              borderTopColor: colors.cardBorder,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 13 }}>
              {regions.length > 0 ? regionLabel(slice.key) : slice.key}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              {formatEuro(slice.marketValue)} · {formatPercent(slice.weight)}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}
