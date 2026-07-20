import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useWorkbook } from "../lib/use-workbook";
import { buildPortfolio } from "@patrimo/core/portfolio";
import {
  projectInvestment,
  DEFAULT_ENVELOPE_RATES,
  DEFAULT_ENVELOPE_PLAFONDS,
  type ContributionStream,
} from "@patrimo/core/projection";
import {
  ENVELOPE_LABELS,
  buildEnvelopeProjectionAdvice,
  type EnvelopeAdvice,
} from "@patrimo/core/fiscal-advice";
import { formatEuro } from "@patrimo/core/format";
import type { Envelope } from "@patrimo/core/schema";
import { useThemeColors, shared, type Theme } from "../lib/theme";

const HORIZON_OPTIONS = [5, 10, 15, 20, 25, 30];

function parseNum(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

type Tab = "envelopes" | "immobilier";

export default function ProjectionScreen() {
  const isDark = useColorScheme() === "dark";
  const t = useThemeColors(isDark);
  const { workbook, prices, loading, error } = useWorkbook();
  const [horizonYears, setHorizonYears] = useState(20);
  const [tab, setTab] = useState<Tab>("envelopes");
  const [inflationInput, setInflationInput] = useState("2");

  if (loading) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  if (error || !workbook) {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          {error ?? "Configure une source de données dans les réglages."}
        </Text>
      </View>
    );
  }

  let portfolio: ReturnType<typeof buildPortfolio>;
  try {
    portfolio = buildPortfolio(workbook, prices);
  } catch {
    return (
      <View style={[shared.emptyState, { backgroundColor: t.bg }]}>
        <Text style={[shared.emptyText, { color: t.textSecondary }]}>
          Erreur lors du calcul du portefeuille.
        </Text>
      </View>
    );
  }

  const hasProperties = workbook.properties.length > 0;
  const inflationRate = Math.max(0, parseNum(inflationInput) / 100);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      {hasProperties && <TabBar tab={tab} setTab={setTab} theme={t} />}

      <View style={[shared.card, { backgroundColor: t.card, marginBottom: 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <SectionLabel text="Horizon" theme={t} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {HORIZON_OPTIONS.map((y) => (
                <Chip
                  key={y}
                  label={`${y}`}
                  selected={horizonYears === y}
                  onPress={() => setHorizonYears(y)}
                  theme={t}
                />
              ))}
            </ScrollView>
          </View>
          <View style={{ marginLeft: 12, alignItems: "center" }}>
            <SectionLabel text="Inflation" theme={t} />
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                value={inflationInput}
                onChangeText={setInflationInput}
                keyboardType="decimal-pad"
                style={smallInputStyle(t)}
              />
              <Text style={{ color: t.textSecondary, fontSize: 13, marginLeft: 4 }}>%</Text>
            </View>
          </View>
        </View>
      </View>

      {tab === "envelopes" ? (
        <EnvelopeTab
          portfolio={portfolio}
          workbook={workbook}
          horizonYears={horizonYears}
          inflationRate={inflationRate}
          theme={t}
        />
      ) : (
        <RealEstateTab
          workbook={workbook}
          horizonYears={horizonYears}
          inflationRate={inflationRate}
          theme={t}
        />
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function EnvelopeTab({
  portfolio,
  workbook,
  horizonYears,
  inflationRate,
  theme: t,
}: {
  portfolio: ReturnType<typeof buildPortfolio>;
  workbook: NonNullable<ReturnType<typeof useWorkbook>["workbook"]>;
  horizonYears: number;
  inflationRate: number;
  theme: Theme;
}) {
  const envelopeDefaults = useMemo(() => {
    const valueByEnvelope = new Map<Envelope, number>();
    for (const account of portfolio.accounts) {
      const env = account.envelope as Envelope;
      valueByEnvelope.set(env, (valueByEnvelope.get(env) ?? 0) + account.marketValue);
    }

    const streamsByEnvelope = new Map<Envelope, ContributionStream[]>();
    for (const config of workbook.dca) {
      const streams = streamsByEnvelope.get(config.envelope) ?? [];
      streams.push({
        amount: config.amount,
        frequency: config.frequency,
        paymentMonth: config.paymentMonth,
      });
      streamsByEnvelope.set(config.envelope, streams);
    }

    const plafondByEnvelope = new Map<Envelope, number | undefined>();
    for (const account of workbook.accounts) {
      const existing = plafondByEnvelope.get(account.envelope);
      if (account.plafond && (!existing || account.plafond > existing)) {
        plafondByEnvelope.set(account.envelope, account.plafond);
      }
    }

    const allEnvelopes = new Set<Envelope>([
      ...Array.from(valueByEnvelope.keys()),
      ...Array.from(streamsByEnvelope.keys()),
    ]);

    return Array.from(allEnvelopes)
      .filter(
        (env) =>
          (valueByEnvelope.get(env) ?? 0) > 0 || streamsByEnvelope.has(env),
      )
      .map((env) => {
        const currentValue = valueByEnvelope.get(env) ?? 0;
        const streams = streamsByEnvelope.get(env) ?? [];
        const monthly = streams
          .filter((s) => s.frequency === "MENSUEL")
          .reduce((sum, s) => sum + s.amount, 0);
        const extraStreams = streams.filter((s) => s.frequency !== "MENSUEL");
        const defaultRate = DEFAULT_ENVELOPE_RATES[env] ?? 0.05;
        const plafond =
          plafondByEnvelope.get(env) ?? DEFAULT_ENVELOPE_PLAFONDS[env];

        return { envelope: env, currentValue, monthly, extraStreams, defaultRate, plafond };
      })
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [portfolio.accounts, workbook.dca, workbook.accounts]);

  const [rateInputs, setRateInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      envelopeDefaults.map((e) => [
        e.envelope,
        String(Math.round(e.defaultRate * 1000) / 10),
      ]),
    ),
  );

  const [monthlyInputs, setMonthlyInputs] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        envelopeDefaults.map((e) => [
          e.envelope,
          String(Math.max(0, e.monthly)),
        ]),
      ),
  );

  const projections = useMemo(
    () =>
      envelopeDefaults.map((env) => {
        const rate = parseNum(rateInputs[env.envelope] ?? "0") / 100;
        const monthly = Math.max(
          0,
          parseNum(monthlyInputs[env.envelope] ?? "0"),
        );
        const result = projectInvestment({
          startBalance: env.currentValue,
          contributions: [
            { amount: monthly, frequency: "MENSUEL" as const },
            ...env.extraStreams,
          ],
          annualRate: rate,
          years: horizonYears,
          inflationRate,
          plafond: env.plafond,
        });
        return { ...env, rate, monthly, result };
      }),
    [envelopeDefaults, rateInputs, monthlyInputs, horizonYears, inflationRate],
  );

  const fiscalAdvice = useMemo(() => {
    const adviceInputs = projections.map((p) => ({
      envelope: p.envelope,
      plafond: p.plafond,
      grossGain: p.result.gain,
      totalContributed: p.result.totalContributed,
    }));
    return buildEnvelopeProjectionAdvice({
      envelopes: adviceInputs,
      horizonYears,
    });
  }, [projections, horizonYears]);

  const adviceByEnvelope = useMemo(() => {
    const map = new Map<Envelope, EnvelopeAdvice>();
    for (const a of fiscalAdvice) map.set(a.envelope, a);
    return map;
  }, [fiscalAdvice]);

  const totalCurrent = projections.reduce((s, p) => s + p.currentValue, 0);
  const totalProjected = projections.reduce(
    (s, p) => s + p.result.finalValue,
    0,
  );
  const totalReal = projections.reduce(
    (s, p) => s + p.result.finalRealValue,
    0,
  );
  const totalGain = totalProjected - totalCurrent;
  const totalNetGain = fiscalAdvice.reduce((s, a) => s + a.netGain, 0);
  const totalNetValue = fiscalAdvice.reduce((s, a) => s + a.netFinalValue, 0);
  const totalMonthly = projections.reduce((s, p) => s + p.monthly, 0);

  const updateRate = (envelope: string, value: string) =>
    setRateInputs((prev) => ({ ...prev, [envelope]: value }));

  const updateMonthly = (envelope: string, value: string) =>
    setMonthlyInputs((prev) => ({ ...prev, [envelope]: value }));

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <KpiCard
          label="Patrimoine projeté"
          value={formatEuro(totalProjected)}
          sub={`à ${horizonYears} ans`}
          theme={t}
        />
        <KpiCard
          label="Après inflation"
          value={formatEuro(totalReal)}
          valueColor="#0ea5e9"
          sub={`à ${Math.round(inflationRate * 100 * 10) / 10}% d'inflation`}
          theme={t}
        />
        <KpiCard
          label="Croissance"
          value={`+${formatEuro(totalGain)}`}
          valueColor={t.success}
          theme={t}
        />
        <KpiCard
          label="Valeur actuelle"
          value={formatEuro(totalCurrent)}
          theme={t}
        />
        <KpiCard
          label="Gain net après impôt"
          value={`+${formatEuro(totalNetGain)}`}
          valueColor={t.success}
          theme={t}
        />
        <KpiCard
          label="Valeur nette après impôt"
          value={formatEuro(totalNetValue)}
          valueColor={t.success}
          sub="PFU / PS selon enveloppe"
          theme={t}
        />
      </View>

      {totalMonthly > 0 && (
        <View
          style={[shared.card, { backgroundColor: t.card, marginBottom: 4 }]}
        >
          <View style={[shared.row]}>
            <Text style={{ color: t.textSecondary, fontSize: 13 }}>
              Versement mensuel total
            </Text>
            <Text
              style={{ color: t.text, fontSize: 15, fontWeight: "600" }}
            >
              {formatEuro(totalMonthly)}
            </Text>
          </View>
        </View>
      )}

      <SectionLabel text="Détail par enveloppe" theme={t} />

      {projections.map((p) => (
        <EnvelopeCard
          key={p.envelope}
          projection={p}
          advice={adviceByEnvelope.get(p.envelope)}
          horizonYears={horizonYears}
          rateInput={rateInputs[p.envelope] ?? ""}
          monthlyInput={monthlyInputs[p.envelope] ?? ""}
          onRateChange={(v) => updateRate(p.envelope, v)}
          onMonthlyChange={(v) => updateMonthly(p.envelope, v)}
          theme={t}
        />
      ))}
    </View>
  );
}

function RealEstateTab({
  workbook,
  horizonYears,
  inflationRate,
  theme: t,
}: {
  workbook: NonNullable<ReturnType<typeof useWorkbook>["workbook"]>;
  horizonYears: number;
  inflationRate: number;
  theme: Theme;
}) {
  const properties = workbook.properties;

  if (properties.length === 0) {
    return (
      <View style={[shared.card, { backgroundColor: t.card }]}>
        <Text
          style={{
            color: t.textSecondary,
            fontSize: 14,
            textAlign: "center",
            paddingVertical: 24,
          }}
        >
          Aucun bien immobilier configuré.
        </Text>
      </View>
    );
  }

  return (
    <View>
      {properties.map((property) => {
        const startValue =
          property.valeurActuelle * property.partDetenue;
        const revalo = property.revaloAnnuelle || 0.02;
        const projectedValue =
          startValue * Math.pow(1 + revalo, horizonYears);
        const realValue =
          projectedValue / Math.pow(1 + inflationRate, horizonYears);

        const monthlyRent =
          property.loyerMensuelHC *
          (1 - property.vacancePct) *
          property.partDetenue;
        const annualCharges =
          property.chargesNonRecupAnnuelles * property.partDetenue;
        const annualTaxe =
          property.taxeFonciere * property.partDetenue;
        const annualGestion =
          monthlyRent * 12 * property.fraisGestionPct;
        const netAnnualRent =
          monthlyRent * 12 - annualCharges - annualTaxe - annualGestion;
        const cumulativeRent = netAnnualRent * horizonYears;

        const capitalRestant = computeRemainingLoan(
          property,
          horizonYears,
        );

        return (
          <View
            key={property.id}
            style={[
              shared.card,
              { backgroundColor: t.card, marginBottom: 12 },
            ]}
          >
            <Text
              style={{
                color: t.text,
                fontSize: 15,
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              {property.label}
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <MiniKpi
                label="Valeur projetée"
                value={formatEuro(projectedValue)}
                theme={t}
              />
              <MiniKpi
                label="Valeur réelle"
                value={formatEuro(realValue)}
                color="#0ea5e9"
                theme={t}
              />
            </View>

            <DataRow
              label="Valeur actuelle"
              value={formatEuro(startValue)}
              theme={t}
            />
            <DataRow
              label="Revalorisation"
              value={`${(revalo * 100).toFixed(1)}% / an`}
              theme={t}
            />
            <DataRow
              label="Loyer net annuel"
              value={formatEuro(netAnnualRent)}
              valueColor={netAnnualRent > 0 ? t.success : t.danger}
              theme={t}
            />
            <DataRow
              label={`Loyers nets cumulés (${horizonYears} ans)`}
              value={formatEuro(cumulativeRent)}
              valueColor={cumulativeRent > 0 ? t.success : t.danger}
              theme={t}
            />
            {property.montantEmprunte > 0 && (
              <DataRow
                label="Capital restant dû"
                value={formatEuro(capitalRestant)}
                theme={t}
              />
            )}
            <View
              style={[
                shared.separator,
                { backgroundColor: t.cardBorder },
              ]}
            />
            <DataRow
              label={`Équité estimée à ${horizonYears} ans`}
              value={formatEuro(projectedValue - capitalRestant)}
              valueColor={t.success}
              bold
              theme={t}
            />
          </View>
        );
      })}
    </View>
  );
}

function computeRemainingLoan(
  property: {
    montantEmprunte: number;
    tauxCredit: number;
    dureeMois: number;
    tauxAssurance: number;
    dateDebutCredit?: Date;
  },
  horizonYears: number,
): number {
  if (property.montantEmprunte <= 0) return 0;
  const monthlyRate = property.tauxCredit / 12;
  const n = property.dureeMois;
  if (monthlyRate <= 0 || n <= 0) return 0;

  const monthlyPayment =
    (property.montantEmprunte * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -n));

  const now = new Date();
  const startDate = property.dateDebutCredit ?? now;
  const elapsedMonths = Math.max(
    0,
    (now.getFullYear() - startDate.getFullYear()) * 12 +
      (now.getMonth() - startDate.getMonth()),
  );
  const futureMonths = horizonYears * 12;
  const totalPaid = elapsedMonths + futureMonths;

  if (totalPaid >= n) return 0;

  let remaining = property.montantEmprunte;
  for (let m = 0; m < Math.min(totalPaid, n); m++) {
    const interest = remaining * monthlyRate;
    const principal = monthlyPayment - interest;
    remaining -= principal;
  }
  return Math.max(0, remaining);
}

function EnvelopeCard({
  projection,
  advice,
  horizonYears,
  rateInput,
  monthlyInput,
  onRateChange,
  onMonthlyChange,
  theme: t,
}: {
  projection: {
    envelope: Envelope;
    currentValue: number;
    monthly: number;
    rate: number;
    plafond?: number;
    result: ReturnType<typeof projectInvestment>;
  };
  advice?: EnvelopeAdvice;
  horizonYears: number;
  rateInput: string;
  monthlyInput: string;
  onRateChange: (value: string) => void;
  onMonthlyChange: (value: string) => void;
  theme: Theme;
}) {
  const { envelope, currentValue, plafond, result } = projection;
  const label = ENVELOPE_LABELS[envelope] ?? envelope;
  const gain = result.finalValue - currentValue;

  return (
    <View
      style={[shared.card, { backgroundColor: t.card, marginBottom: 8 }]}
    >
      <Text
        style={{
          color: t.text,
          fontSize: 15,
          fontWeight: "600",
          marginBottom: 10,
        }}
      >
        {label}
      </Text>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={fieldLabelStyle(t)}>Rendement (% / an)</Text>
          <TextInput
            value={rateInput}
            onChangeText={onRateChange}
            keyboardType="decimal-pad"
            style={inputStyle(t)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={fieldLabelStyle(t)}>Versement (€ / mois)</Text>
          <TextInput
            value={monthlyInput}
            onChangeText={onMonthlyChange}
            keyboardType="decimal-pad"
            style={inputStyle(t)}
          />
        </View>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={metaLabelStyle(t)}>Valeur actuelle</Text>
          <Text style={{ color: t.text, fontSize: 14 }}>
            {formatEuro(currentValue)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={metaLabelStyle(t)}>
            Projeté ({horizonYears} ans)
          </Text>
          <Text
            style={{ color: t.text, fontSize: 16, fontWeight: "600" }}
          >
            {formatEuro(result.finalValue)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={metaLabelStyle(t)}>Valeur réelle</Text>
          <Text style={{ color: "#0ea5e9", fontSize: 13 }}>
            {formatEuro(result.finalRealValue)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={metaLabelStyle(t)}>Plus-value</Text>
          <Text
            style={{
              color: t.success,
              fontSize: 14,
              fontWeight: "500",
            }}
          >
            +{formatEuro(gain)}
          </Text>
        </View>
      </View>

      {advice && (
        <View
          style={{
            flexDirection: "row",
            marginTop: 6,
            marginBottom: 6,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: t.cardBorder,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={metaLabelStyle(t)}>
              Impôt ({Math.round(advice.taxRateOnGain * 100)}%)
            </Text>
            <Text style={{ color: "#ef4444", fontSize: 13 }}>
              −{formatEuro(advice.grossGain - advice.netGain)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={metaLabelStyle(t)}>Net après impôt</Text>
            <Text style={{ color: t.success, fontSize: 16, fontWeight: "600" }}>
              {formatEuro(advice.netFinalValue)}
            </Text>
          </View>
        </View>
      )}

      {plafond !== undefined && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 6,
            marginTop: 6,
          }}
        >
          {result.plafondReachedMonth !== null ? (
            <PillBadge
              label={`Plafond atteint en ${Math.ceil(result.plafondReachedMonth / 12)} an${Math.ceil(result.plafondReachedMonth / 12) > 1 ? "s" : ""}`}
              color="#f59e0b"
              bg="#f59e0b20"
            />
          ) : (
            <PillBadge
              label={`Plafond ${formatEuro(plafond)}`}
              color={t.textMuted}
              bg={t.cardBorder}
            />
          )}
        </View>
      )}
    </View>
  );
}

function KpiCard({
  label,
  value,
  sub,
  valueColor,
  theme: t,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  theme: Theme;
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: t.card,
        borderRadius: 12,
        padding: 14,
      }}
    >
      <Text
        style={{
          color: t.textSecondary,
          fontSize: 11,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: valueColor ?? t.text,
          fontSize: 18,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
      {sub && (
        <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function MiniKpi({
  label,
  value,
  color,
  theme: t,
}: {
  label: string;
  value: string;
  color?: string;
  theme: Theme;
}) {
  return (
    <View style={{ flex: 1, minWidth: "40%" }}>
      <Text style={metaLabelStyle(t)}>{label}</Text>
      <Text
        style={{
          color: color ?? t.text,
          fontSize: 16,
          fontWeight: "600",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function DataRow({
  label,
  value,
  valueColor,
  bold,
  theme: t,
}: {
  label: string;
  value: string;
  valueColor?: string;
  bold?: boolean;
  theme: Theme;
}) {
  return (
    <View style={[shared.row, { paddingVertical: 5 }]}>
      <Text
        style={{
          color: t.textSecondary,
          fontSize: 13,
          flex: 1,
          fontWeight: bold ? "600" : "400",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: valueColor ?? t.text,
          fontSize: 14,
          fontWeight: bold ? "700" : "500",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function PillBadge({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color, fontSize: 11, fontWeight: "500" }}>
        {label}
      </Text>
    </View>
  );
}

function SectionLabel({
  text,
  theme: t,
}: {
  text: string;
  theme: Theme;
}) {
  return (
    <Text
      style={{
        color: t.textSecondary,
        fontSize: 11,
        fontWeight: "600",
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 4,
      }}
    >
      {text}
    </Text>
  );
}

function TabBar({
  tab,
  setTab,
  theme: t,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  theme: Theme;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "envelopes", label: "Par enveloppe" },
    { key: "immobilier", label: "Immobilier" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: t.card,
        borderRadius: 10,
        padding: 3,
        marginBottom: 16,
      }}
    >
      {tabs.map((item) => (
        <TouchableOpacity
          key={item.key}
          onPress={() => setTab(item.key)}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: "center",
            backgroundColor:
              tab === item.key ? t.accentBg : "transparent",
          }}
        >
          <Text
            style={{
              color: tab === item.key ? "#fff" : t.textSecondary,
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
  theme: t,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginRight: 6,
        backgroundColor: selected ? t.accentBg : "transparent",
        borderWidth: 1,
        borderColor: selected ? t.accentBg : t.cardBorder,
      }}
    >
      <Text
        style={{
          color: selected ? "#fff" : t.text,
          fontSize: 13,
          fontWeight: "500",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function inputStyle(t: Theme) {
  return {
    backgroundColor: t.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: t.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: t.cardBorder,
  };
}

function smallInputStyle(t: Theme) {
  return {
    backgroundColor: t.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: t.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: t.cardBorder,
    width: 48,
    textAlign: "center" as const,
  };
}

function fieldLabelStyle(t: Theme) {
  return {
    color: t.textSecondary,
    fontSize: 11,
    fontWeight: "500" as const,
    marginBottom: 4,
  };
}

function metaLabelStyle(t: Theme) {
  return {
    color: t.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  };
}
