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
import { buildFiscalAdvice, type EnvelopeInfo } from "@/lib/fiscal-advice";
import { cn, formatEuro, formatPercent, signClass } from "@/lib/utils";

export type SerializedEnvelope = {
  envelope: EnvelopeInfo["envelope"];
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

export function RestantProjection({
  defaultMonthly,
  envelopes,
}: {
  defaultMonthly: number;
  envelopes: SerializedEnvelope[];
}) {
  const [monthly, setMonthly] = useState(
    String(Math.max(0, Math.round(defaultMonthly))),
  );
  const [capital, setCapital] = useState("0");
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

  const monthlyValue = Math.max(0, parseNumber(monthly));
  const capitalValue = Math.max(0, parseNumber(capital));
  const horizonYears = Math.max(0, parseNumber(years));

  const projections = useMemo(() => {
    return SCENARIO_PRESETS.map((preset) => ({
      preset,
      result: projectInvestment({
        startBalance: capitalValue,
        monthlyContribution: monthlyValue,
        annualRate: parseNumber(rates[preset.key]) / 100,
        years: horizonYears,
      }),
    }));
  }, [capitalValue, monthlyValue, horizonYears, rates]);

  const chartData = useMemo(() => {
    const base = projections[0]?.result.points ?? [];
    return base.map((point, index) => {
      const row: ScenarioPoint = {
        date: point.date,
        invested: point.invested,
      };
      for (const { preset, result } of projections) {
        row[preset.key] = result.points[index]?.value ?? 0;
      }
      return row;
    });
  }, [projections]);

  const series: ScenarioSeries[] = SCENARIO_PRESETS.map((preset) => ({
    key: preset.key,
    label: preset.label,
    color: SCENARIO_COLORS[preset.key],
  }));

  const adviceProjection = projections.find(
    (p) => p.preset.key === ADVICE_SCENARIO,
  )?.result;

  const advice = useMemo(() => {
    if (!adviceProjection || envelopes.length === 0) return [];
    const infos: EnvelopeInfo[] = envelopes.map((e) => ({
      envelope: e.envelope,
      openDate: e.openDate ? new Date(e.openDate) : undefined,
      plafond: e.plafond,
    }));
    return buildFiscalAdvice({
      envelopes: infos,
      grossGain: adviceProjection.gain,
      totalContributed: adviceProjection.totalContributed,
      horizonYears,
    });
  }, [adviceProjection, envelopes, horizonYears]);

  if (defaultMonthly <= 0) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Ton budget n&apos;a pas de restant non alloué pour le moment. Ajoute des
          revenus ou réduis tes dépenses dans la page Budget pour dégager une
          capacité à investir, puis reviens projeter ce surplus ici.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Restant mensuel à investir (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Capital de départ (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Horizon (années)">
              <input
                type="text"
                inputMode="decimal"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={inputClasses}
              />
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

          <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Le restant non alloué de ton budget ({formatEuro(defaultMonthly)} / mois)
            est préchargé. Capitalisation mensuelle des intérêts composés.
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {projections.map(({ preset, result }) => (
          <Card key={preset.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: SCENARIO_COLORS[preset.key] }}
                />
                {preset.label}
              </CardTitle>
              <CardValue>{formatEuro(result.finalValue)}</CardValue>
              <p className={cn("text-xs", signClass(result.gain))}>
                Plus-value {formatEuro(result.gain)}
              </p>
            </CardHeader>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Total versé</CardTitle>
            <CardValue>
              {formatEuro(projections[0]?.result.totalContributed ?? 0)}
            </CardValue>
            <p className="text-xs text-zinc-500">sur {horizonYears} an(s)</p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Croissance projetée</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Valeur par scénario de rendement vs total versé (pointillé).
          </p>
        </CardHeader>
        <CardBody>
          <ScenarioCurve data={chartData} series={series} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Optimisation fiscale</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Gain net d&apos;impôts à l&apos;horizon selon l&apos;enveloppe, sur la
            base du scénario {SCENARIO_PRESETS.find((p) => p.key === ADVICE_SCENARIO)?.label.toLowerCase()}{" "}
            ({formatEuro(adviceProjection?.gain ?? 0)} de plus-value brute). Ordre de
            remplissage conseillé du plus au moins avantageux fiscalement.
          </p>
        </CardHeader>
        <CardBody className="px-0">
          {advice.length === 0 ? (
            <p className="px-6 py-4 text-sm text-zinc-500">
              Ajoute des comptes (PEA, assurance-vie, livret, CTO...) dans la page
              Comptes pour obtenir des conseils fiscaux personnalisés.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-12">#</TH>
                  <TH>Enveloppe</TH>
                  <TH>Fiscalité du gain</TH>
                  <TH className="text-right">Gain net</TH>
                  <TH className="text-right">Valeur nette</TH>
                  <TH>Conseils</TH>
                </TR>
              </THead>
              <TBody>
                {advice.map((row) => (
                  <TR key={row.envelope}>
                    <TD className="font-mono tabular-nums text-zinc-500">
                      {row.priority}
                    </TD>
                    <TD>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {row.label}
                      </span>
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
                    <TD>
                      <ul className="list-disc space-y-0.5 pl-4 text-xs text-zinc-500">
                        {row.tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
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
