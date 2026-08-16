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
  colors,
}: {
  title: string;
  regions?: GeographicSlice[];
  countries: GeographicSlice[];
  colors: {
    text: string;
    textSecondary: string;
    textMuted: string;
    cardBorder: string;
  };
}) {
  if (countries.length === 0 && regions.length === 0) {
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
          accessibilityLabel="Aucune répartition géographique"
          style={{ color: colors.textMuted, fontSize: 13 }}
        >
          Aucune répartition géographique
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
      {countries.map((slice, index) => (
        <View
          key={`country-${slice.key}`}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 8,
            borderTopWidth: index > 0 ? 1 : 0,
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
                {formatEuro(slice.marketValue)} · {formatPercent(slice.weight)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
