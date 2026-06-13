"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  ScenarioCurve,
  type ScenarioPoint,
  type ScenarioSeries,
} from "@/components/charts/scenario-curve";
import { projectInvestment, SCENARIO_PRESETS, type ScenarioKey } from "@/lib/projection";
import {
  buildEnvelopeProjectionAdvice,
  type EnvelopeInfo,
} from "@/lib/fiscal-advice";
import { cn, formatEuro, formatPercent, signClass } from "@/lib/utils";

export type EnvelopeProjectionInput = {
  envelope: EnvelopeInfo["envelope"];
  currentValue: number;
  monthlyDefault: number;
  openDate?: string;
  plafond?: number;
};

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  prudent: "#0ea5e9",
  modere: "#10b981",
  dynamique: "#8b5cf6",
};

const ADVICE_SCENARIO: ScenarioKey = "modere";

function parseNumber(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function EnvelopeProjection({
  envelopes,
}: {
  envelopes: EnvelopeProjectionInput[];
}) {
  const [years, setYears] = useState("10");
  const [rates, setRates] = useState<Record<ScenarioKey, string>>(() =>
    SCENARIO_PRESETS.reduce(
      (acc, preset) => {
        acc[preset.key] = String(Math.round(preset.rate * 1000) / 10);
        return acc;
      },
      {} as Record<ScenarioKey, string>,
    ),
  );
  const [monthly, setMonthly] = useState<Record<string, string>>(() =>
    envelopes.reduce(
      (acc, envelope) => {
        acc[envelope.envelope] = String(Math.round(envelope.monthlyDefault));
        return acc;
      },
      {} as Record<string, string>,
    ),
  );

  const horizonYears = Math.max(0, parseNumber(years));

  const projections = useMemo(() => {
    return envelopes.map((envelope) => {
      const monthlyContribution = Math.max(
        0,
        parseNumber(monthly[envelope.envelope] ?? "0"),
      );
      const byScenario = SCENARIO_PRESETS.reduce(
        (acc, preset) => {
          acc[preset.key] = projectInvestment({
            startBalance: envelope.currentValue,
            monthlyContribution,
            annualRate: parseNumber(rates[preset.key]) / 100,
            years: horizonYears,
          });
          return acc;
        },
        {} as Record<ScenarioKey, ReturnType<typeof projectInvestment>>,
      );
      return { envelope, byScenario };
    });
  }, [envelopes, monthly, rates, horizonYears]);

  const chartData = useMemo(() => {
    const base = projections[0]?.byScenario.prudent.points ?? [];
    return base.map((point, index) => {
      const row: ScenarioPoint = {
        date: point.date,
        invested: projections.reduce(
          (sum, p) => sum + (p.byScenario.prudent.points[index]?.invested ?? 0),
          0,
        ),
      };
      for (const preset of SCENARIO_PRESETS) {
        row[preset.key] = projections.reduce(
          (sum, p) => sum + (p.byScenario[preset.key].points[index]?.value ?? 0),
          0,
        );
      }
      return row;
    });
  }, [projections]);

  const series: ScenarioSeries[] = SCENARIO_PRESETS.map((preset) => ({
    key: preset.key,
    label: preset.label,
    color: SCENARIO_COLORS[preset.key],
  }));

  const totals = useMemo(() => {
    return SCENARIO_PRESETS.reduce(
      (acc, preset) => {
        acc[preset.key] = projections.reduce(
          (sum, p) => sum + p.byScenario[preset.key].finalValue,
          0,
        );
        return acc;
      },
      {} as Record<ScenarioKey, number>,
    );
  }, [projections]);

  const currentTotal = envelopes.reduce((s, e) => s + e.currentValue, 0);

  const advice = useMemo(() => {
    if (projections.length === 0) return [];
    return buildEnvelopeProjectionAdvice({
      horizonYears,
      envelopes: projections.map((p) => ({
        envelope: p.envelope.envelope,
        openDate: p.envelope.openDate
          ? new Date(p.envelope.openDate)
          : undefined,
        plafond: p.envelope.plafond,
        grossGain: p.byScenario[ADVICE_SCENARIO].gain,
        totalContributed: p.byScenario[ADVICE_SCENARIO].totalContributed,
      })),
    });
  }, [projections, horizonYears]);

  const projectedValueByEnvelope = useMemo(() => {
    const map = new Map<string, { current: number; projected: number }>();
    for (const p of projections) {
      map.set(p.envelope.envelope, {
        current: p.envelope.currentValue,
        projected: p.byScenario[ADVICE_SCENARIO].finalValue,
      });
    }
    return map;
  }, [projections]);

  if (envelopes.length === 0) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Aucune enveloppe de marché valorisée pour le moment. Ajoute des
          positions dans un CTO, PEA, PEE ou une assurance-vie pour projeter leur
          croissance ici.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Horizon (années)">
              <input
                type="text"
                inputMode="decimal"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={inputClasses}
              />
            </Field>
            {SCENARIO_PRESETS.map((preset) => (
              <Field key={preset.key} label={`Rendement ${preset.label} (%)`}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SCENARIO_COLORS[preset.key] }}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rates[preset.key]}
                    onChange={(e) =>
                      setRates((prev) => ({ ...prev, [preset.key]: e.target.value }))
                    }
                    className={cn(inputClasses, "w-full")}
                  />
                </div>
              </Field>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {envelopes.map((envelope) => (
              <Field
                key={envelope.envelope}
                label={`Versement ${envelope.envelope} (EUR / mois)`}
              >
                <input
                  type="text"
                  inputMode="decimal"
                  value={monthly[envelope.envelope] ?? "0"}
                  onChange={(e) =>
                    setMonthly((prev) => ({
                      ...prev,
                      [envelope.envelope]: e.target.value,
                    }))
                  }
                  className={inputClasses}
                />
              </Field>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Valeur actuelle des enveloppes ({formatEuro(currentTotal)}) projetée
            sous les 3 scénarios de rendement. Les versements mensuels sont
            préchargés depuis tes plans DCA. Capitalisation mensuelle.
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SCENARIO_PRESETS.map((preset) => (
          <Card key={preset.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SCENARIO_COLORS[preset.key] }}
                />
                {preset.label}
              </CardTitle>
              <CardValue>{formatEuro(totals[preset.key] ?? 0)}</CardValue>
              <p className={cn("text-xs", signClass((totals[preset.key] ?? 0) - currentTotal))}>
                {formatEuro((totals[preset.key] ?? 0) - currentTotal)} de croissance
              </p>
            </CardHeader>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Valeur actuelle</CardTitle>
            <CardValue>{formatEuro(currentTotal)}</CardValue>
            <p className="text-xs text-zinc-500">sur {horizonYears} an(s)</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patrimoine projeté</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Valeur totale des enveloppes par scénario de rendement vs total versé
            (pointillé).
          </p>
        </CardHeader>
        <CardBody>
          <ScenarioCurve data={chartData} series={series} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail par enveloppe</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Projection à l&apos;horizon sur la base du scénario{" "}
            {SCENARIO_PRESETS.find((p) => p.key === ADVICE_SCENARIO)?.label.toLowerCase()},
            avec le gain net après la fiscalité propre à chaque enveloppe.
          </p>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>Enveloppe</TH>
                <TH className="text-right">Valeur actuelle</TH>
                <TH className="text-right">Valeur projetée</TH>
                <TH className="text-right">Plus-value brute</TH>
                <TH>Fiscalité du gain</TH>
                <TH className="text-right">Gain net</TH>
                <TH className="text-right">Valeur nette</TH>
              </TR>
            </THead>
            <TBody>
              {advice.map((row) => {
                const values = projectedValueByEnvelope.get(row.envelope);
                return (
                  <TR key={row.envelope}>
                    <TD>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {row.label}
                      </span>
                    </TD>
                    <TD className="text-right font-mono tabular-nums">
                      {formatEuro(values?.current ?? 0)}
                    </TD>
                    <TD className="text-right font-mono tabular-nums">
                      {formatEuro(values?.projected ?? 0)}
                    </TD>
                    <TD className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatEuro(row.grossGain)}
                    </TD>
                    <TD>
                      <Badge
                        variant={
                          row.taxRateOnGain === 0
                            ? "success"
                            : row.taxRateOnGain <= 0.172
                              ? "info"
                              : "warning"
                        }
                      >
                        {row.taxRateOnGain === 0
                          ? "Exonéré"
                          : `${formatPercent(row.taxRateOnGain)} sur le gain`}
                      </Badge>
                    </TD>
                    <TD className="text-right font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatEuro(row.netGain)}
                    </TD>
                    <TD className="text-right font-mono tabular-nums">
                      {formatEuro(row.netFinalValue)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <p className="px-6 pt-4 text-xs leading-relaxed text-zinc-400">
            Hypothèse PFU 30 % (12,8 % IR + 17,2 % PS). L&apos;option pour le barème
            progressif et les abattements d&apos;assurance-vie ne sont pas chiffrés.
            Conseils indicatifs, ne constituent pas un conseil en investissement.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 text-xs", className)}>
      <span className="font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  );
}
