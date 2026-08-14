import { Text, View } from "react-native";
import type {
  ConcentrationStatus,
  PortfolioConcentration,
} from "@patrimo/core/portfolio-risk";
import { formatPercent } from "@patrimo/core/format";
import { shared, type Theme } from "./theme";

const STATUS_LABEL: Record<ConcentrationStatus, string> = {
  diversified: "Diversifié",
  balanced: "Équilibré",
  concentrated: "Concentré",
};

function statusColor(status: ConcentrationStatus, theme: Theme): string {
  switch (status) {
    case "diversified":
      return theme.success;
    case "balanced":
      return "#d97706";
    case "concentrated":
      return theme.danger;
  }
}

export function ConcentrationSummary({
  concentration,
  theme: t,
}: {
  concentration: PortfolioConcentration | null;
  theme: Theme;
}) {
  if (!concentration) return null;

  return (
    <View style={[shared.card, { backgroundColor: t.card, marginBottom: 24 }]}>
      <Text style={[shared.cardTitle, { color: t.text, marginBottom: 8 }]}>
        Concentration
      </Text>
      <Text style={{ color: t.text, fontSize: 14, marginBottom: 4 }}>
        Plus grosse ligne : {concentration.top1Label} —{" "}
        {formatPercent(concentration.top1Weight)}
      </Text>
      <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 8 }}>
        Top 3 : {formatPercent(concentration.top3Weight)}
      </Text>
      <Text
        style={{
          color: statusColor(concentration.status, t),
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {STATUS_LABEL[concentration.status]}
      </Text>
    </View>
  );
}
