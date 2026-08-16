import { Text, View } from "react-native";
import {
  assessRiskMetricStatus,
  type DrawdownStatus,
  type SharpeStatus,
  type VolatilityStatus,
} from "@patrimo/core/portfolio-risk";
import { formatPercent, formatPercentCompact } from "@patrimo/core/format";
import { shared, type Theme } from "./theme";

type Tone = "green" | "yellow" | "red" | "muted";

const VOL_LABEL: Record<VolatilityStatus, string> = {
  low: "faibles",
  moderate: "normales",
  high: "élevées",
};

const VOL_TONE: Record<VolatilityStatus, Tone> = {
  low: "green",
  moderate: "yellow",
  high: "red",
};

const SHARPE_LABEL: Record<SharpeStatus, string> = {
  strong: "bon",
  acceptable: "correct",
  weak: "faible",
};

const SHARPE_TONE: Record<SharpeStatus, Tone> = {
  strong: "green",
  acceptable: "yellow",
  weak: "red",
};

const DRAWDOWN_LABEL: Record<DrawdownStatus, string> = {
  mild: "légère",
  marked: "marquée",
  severe: "sévère",
};

const DRAWDOWN_TONE: Record<DrawdownStatus, Tone> = {
  mild: "green",
  marked: "yellow",
  severe: "red",
};

function toneColor(tone: Tone, theme: Theme): string {
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
  tone: Tone;
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
  const drawdownStatus = assessRiskMetricStatus("drawdown", drawdown);

  return (
    <View style={[shared.card, { backgroundColor: t.card, marginBottom: 24 }]}>
      <Text style={[shared.cardTitle, { color: t.text, marginBottom: 12 }]}>
        Risque
      </Text>
      <MetricLine
        title="Oscillations"
        value={volatility === null ? "—" : formatPercent(volatility)}
        statusWord={volStatus === null ? null : VOL_LABEL[volStatus]}
        tone={volStatus === null ? "muted" : VOL_TONE[volStatus]}
        theme={t}
      />
      <MetricLine
        title="Rendement / risque"
        value={sharpe === null ? "—" : sharpe.toFixed(2)}
        statusWord={sharpeStatus === null ? null : SHARPE_LABEL[sharpeStatus]}
        tone={sharpeStatus === null ? "muted" : SHARPE_TONE[sharpeStatus]}
        theme={t}
      />
      <MetricLine
        title="Pire chute"
        value={formatPercentCompact(drawdown)}
        statusWord={
          drawdownStatus === null ? null : DRAWDOWN_LABEL[drawdownStatus]
        }
        tone={
          drawdownStatus === null ? "muted" : DRAWDOWN_TONE[drawdownStatus]
        }
        theme={t}
      />
      <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 4 }}>
        vert = confortable · jaune = à surveiller · rouge = élevé
      </Text>
    </View>
  );
}
