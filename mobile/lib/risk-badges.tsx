import { Text, View } from "react-native";
import {
  assessRiskMetricStatus,
  type DrawdownStatus,
  type SharpeStatus,
  type VolatilityStatus,
} from "@patrimo/core/portfolio-risk";
import { formatPercent, formatPercentCompact } from "@patrimo/core/format";
import { shared, type Theme } from "./theme";

const VOL_LABEL: Record<VolatilityStatus, string> = {
  low: "faibles",
  moderate: "normales",
  high: "élevées",
};

const SHARPE_LABEL: Record<SharpeStatus, string> = {
  strong: "bon",
  acceptable: "correct",
  weak: "faible",
};

const DRAWDOWN_LABEL: Record<DrawdownStatus, string> = {
  mild: "légère",
  marked: "marquée",
  severe: "sévère",
};

function toneColor(
  tone: "green" | "yellow" | "red" | "muted",
  theme: Theme,
): string {
  switch (tone) {
    case "green":
      return theme.success;
    case "yellow":
      return "#d97706";
    case "red":
      return theme.danger;
    case "muted":
      return theme.textSecondary;
  }
}

function MetricLine({
  title,
  value,
  statusWord,
  tone,
  theme: t,
}: {
  title: string;
  value: string;
  statusWord: string | null;
  tone: "green" | "yellow" | "red" | "muted";
  theme: Theme;
}) {
  const color = toneColor(tone, t);
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 2 }}>
        {title}
      </Text>
      <Text style={{ color, fontSize: 15, fontWeight: "600" }}>
        {value}
        {statusWord !== null ? ` · ${statusWord}` : ""}
      </Text>
    </View>
  );
}

export function RiskBadges({
  volatility,
  sharpe,
  drawdown,
  theme: t,
}: {
  volatility: number | null;
  sharpe: number | null;
  drawdown: number;
  theme: Theme;
}) {
  const volStatus = assessRiskMetricStatus("volatility", volatility);
  const sharpeStatus = assessRiskMetricStatus("sharpe", sharpe);
  const drawdownStatus = assessRiskMetricStatus(
    "drawdown",
    drawdown,
  ) as DrawdownStatus;

  return (
    <View style={[shared.card, { backgroundColor: t.card, marginBottom: 24 }]}>
      <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
        Risque
      </Text>
      <MetricLine
        title="Oscillations"
        value={volatility === null ? "—" : formatPercent(volatility)}
        statusWord={
          volStatus === null ? null : VOL_LABEL[volStatus as VolatilityStatus]
        }
        tone={
          volStatus === null
            ? "muted"
            : volStatus === "low"
              ? "green"
              : volStatus === "moderate"
                ? "yellow"
                : "red"
        }
        theme={t}
      />
      <MetricLine
        title="Rendement / risque"
        value={sharpe === null ? "—" : sharpe.toFixed(2)}
        statusWord={
          sharpeStatus === null
            ? null
            : SHARPE_LABEL[sharpeStatus as SharpeStatus]
        }
        tone={
          sharpeStatus === null
            ? "muted"
            : sharpeStatus === "strong"
              ? "green"
              : sharpeStatus === "acceptable"
                ? "yellow"
                : "red"
        }
        theme={t}
      />
      <MetricLine
        title="Pire chute"
        value={formatPercentCompact(drawdown)}
        statusWord={DRAWDOWN_LABEL[drawdownStatus]}
        tone={
          drawdownStatus === "mild"
            ? "green"
            : drawdownStatus === "marked"
              ? "yellow"
              : "red"
        }
        theme={t}
      />
      <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>
        vert = confortable · jaune = à surveiller · rouge = élevé
      </Text>
    </View>
  );
}
