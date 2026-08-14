import { Text, View } from "react-native";
import type {
  EmergencyFundHealth,
  EmergencyFundStatus,
} from "@patrimo/core/emergency-fund";
import { formatEuro } from "@patrimo/core/format";
import { shared, type Theme } from "./theme";

const STATUS_LABEL: Record<EmergencyFundStatus, string> = {
  insufficient: "Insuffisant",
  acceptable: "Acceptable",
  healthy: "Sain",
  over_allocated: "Surdimensionné",
};

const coverageFormatter = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function statusColor(status: EmergencyFundStatus, theme: Theme): string {
  switch (status) {
    case "insufficient":
      return theme.danger;
    case "acceptable":
      return "#d97706";
    case "healthy":
      return theme.success;
    case "over_allocated":
      return "#0284c7";
  }
}

export function EmergencyFundCard({
  health,
  theme: t,
}: {
  health: EmergencyFundHealth | null;
  theme: Theme;
}) {
  if (!health) return null;

  const tone = statusColor(health.status, t);

  return (
    <View style={[shared.card, { backgroundColor: t.card, marginBottom: 24 }]}>
      <View style={[shared.row, { marginBottom: 8 }]}>
        <Text style={[shared.label, { color: t.textSecondary }]}>
          {"Fonds d'urgence"}
        </Text>
        <Text style={{ color: tone, fontSize: 13, fontWeight: "600" }}>
          {STATUS_LABEL[health.status]}
        </Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: "600", color: t.text, marginBottom: 6 }}>
        {coverageFormatter.format(health.coverageMonths)} mois
      </Text>
      <Text style={{ color: t.textMuted, fontSize: 12 }}>
        {formatEuro(health.livretBalance)} livrets ·{" "}
        {formatEuro(health.monthlyExpenses)} / mois
      </Text>
      {health.status === "over_allocated" && (
        <Text style={{ color: "#0284c7", fontSize: 12, marginTop: 6 }}>
          Capital potentiellement immobilisé
        </Text>
      )}
    </View>
  );
}
