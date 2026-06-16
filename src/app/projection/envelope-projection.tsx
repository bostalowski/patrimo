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
import { computePerOutcome } from "@/lib/per";
import {
  buildEnvelopeProjectionAdvice,
  type EnvelopeInfo,
} from "@/lib/fiscal-advice";
import { cn, formatEuro, formatPercent, signClass } from "@/lib/utils";
import type { InflationView } from "./projection-client";

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

const TMI_OPTIONS = [0, 0.11, 0.3, 0.41, 0.45];

const PER_LABEL = "PER (plan épargne retraite)";

function parseNumber(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function EnvelopeProjection({
  envelopes,
  inflation,
}: {
  envelopes: EnvelopeProjectionInput[];
  inflation: InflationView;
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
  const [perEncours, setPerEncours] = useState("0");
  const [perMonthly, setPerMonthly] = useState("0");
  const [tmiNow, setTmiNow] = useState("0.3");
  const [tmiExit, setTmiExit] = useState("0.11");

  const horizonYears = Math.max(0, parseNumber(years));
  const perEncoursValue = Math.max(0, parseNumber(perEncours));
  const perMonthlyValue = Math.max(0, parseNumber(perMonthly));
  const tmiNowValue = parseNumber(tmiNow);
  const tmiExitValue = parseNumber(tmiExit);
  const perActive = perEncoursValue > 0 || perMonthlyValue > 0;

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
            inflationRate: inflation.rate,
          });
          return acc;
        },
        {} as Record<ScenarioKey, ReturnType<typeof projectInvestment>>,
      );
      return { envelope, byScenario };
    });
  }, [envelopes, monthly, rates, horizonYears, inflation.rate]);

  const perByScenario = useMemo(() => {
    return SCENARIO_PRESETS.reduce(
      (acc, preset) => {
        acc[preset.key] = projectInvestment({
          startBalance: perEncoursValue,
          monthlyContribution: perMonthlyValue,
          annualRate: parseNumber(rates[preset.key]) / 100,
          years: horizonYears,
          inflationRate: inflation.rate,
        });
        return acc;
      },
      {} as Record<ScenarioKey, ReturnType<typeof projectInvestment>>,
    );
  }, [perEncoursValue, perMonthlyValue, rates, horizonYears, inflation.rate]);

  const perOutcomes = useMemo(() => {
    const map = new Map<ScenarioKey, ReturnType<typeof computePerOutcome>>();
    for (const preset of SCENARIO_PRESETS) {
      const result = perByScenario[preset.key];
      map.set(
        preset.key,
        computePerOutcome({
          encoursActuel: perEncoursValue,
          versementsFuturs: result.totalContributed - perEncoursValue,
          valeurFinale: result.finalValue,
          tmiNow: tmiNowValue,
          tmiExit: tmiExitValue,
        }),
      );
    }
    return map;
  }, [perByScenario, perEncoursValue, tmiNowValue, tmiExitValue]);

  const aggregateSets = useMemo(
    () => [...projections.map((p) => p.byScenario), perByScenario],
    [projections, perByScenario],
  );

  const chartData = useMemo(() => {
    const base = aggregateSets[0]?.prudent.points ?? [];
    return base.map((point, index) => {
      const row: ScenarioPoint = {
        date: point.date,
        invested: aggregateSets.reduce(
          (sum, set) => sum + (set.prudent.points[index]?.invested ?? 0),
          0,
        ),
      };
      for (const preset of SCENARIO_PRESETS) {
        row[preset.key] = aggregateSets.reduce(
          (sum, set) => sum + (set[preset.key].points[index]?.value ?? 0),
          0,
        );
        row[`${preset.key}_real`] = aggregateSets.reduce(
          (sum, set) => sum + (set[preset.key].points[index]?.realValue ?? 0),
          0,
        );
      }
      return row;
    });
  }, [aggregateSets]);

  const series: ScenarioSeries[] = [
    ...SCENARIO_PRESETS.map((preset) => ({
      key: preset.key,
      label: preset.label,
      color: SCENARIO_COLORS[preset.key],
    })),
    ...SCENARIO_PRESETS.map((preset) => ({
      key: `${preset.key}_real`,
      label: `${preset.label} après inflation`,
      color: SCENARIO_COLORS[preset.key],
      dashed: true,
    })),
  ];

  const totals = useMemo(() => {
    return SCENARIO_PRESETS.reduce(
      (acc, preset) => {
        acc[preset.key] = {
          nominal: aggregateSets.reduce(
            (sum, set) => sum + set[preset.key].finalValue,
            0,
          ),
          real: aggregateSets.reduce(
            (sum, set) => sum + set[preset.key].finalRealValue,
            0,
          ),
        };
        return acc;
      },
      {} as Record<ScenarioKey, { nominal: number; real: number }>,
    );
  }, [aggregateSets]);

  const currentTotal =
    envelopes.reduce((s, e) => s + e.currentValue, 0) + perEncoursValue;

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

  const perResult = perByScenario[ADVICE_SCENARIO];
  const perOutcome = perOutcomes.get(ADVICE_SCENARIO);
  const perProjectedValue = perResult?.finalValue ?? 0;
  const perNetValue = perOutcome?.valeurNetteAvecEconomie ?? 0;
  const perNetGain = perNetValue - (perOutcome?.capitalVerse ?? 0);
  const perVersementsFuturs = Math.round(perMonthlyValue * horizonYears * 12);

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

          <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Simulation PER
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Encours PER (EUR)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={perEncours}
                  onChange={(e) => setPerEncours(e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field label="Versement PER (EUR / mois)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={perMonthly}
                  onChange={(e) => setPerMonthly(e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field label="TMI aujourd'hui">
                <select
                  value={tmiNow}
                  onChange={(e) => setTmiNow(e.target.value)}
                  className={inputClasses}
                >
                  {TMI_OPTIONS.map((tmi) => (
                    <option key={tmi} value={String(tmi)}>
                      {formatPercent(tmi)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="TMI à la sortie">
                <select
                  value={tmiExit}
                  onChange={(e) => setTmiExit(e.target.value)}
                  className={inputClasses}
                >
                  {TMI_OPTIONS.map((tmi) => (
                    <option key={tmi} value={String(tmi)}>
                      {formatPercent(tmi)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Valeur actuelle des enveloppes ({formatEuro(currentTotal)}) projetée
            sous les 3 scénarios de rendement. Les versements mensuels sont
            préchargés depuis tes plans DCA. Le PER se simule à part (encours et
            versement saisis ci-dessus) avec sa fiscalité propre. Capitalisation
            mensuelle.
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
              <CardValue>{formatEuro(totals[preset.key]?.nominal ?? 0)}</CardValue>
              <p className={cn("text-xs", signClass((totals[preset.key]?.nominal ?? 0) - currentTotal))}>
                {formatEuro((totals[preset.key]?.nominal ?? 0) - currentTotal)} de croissance
              </p>
              <p className="text-xs text-sky-600 dark:text-sky-400">
                ≈ {formatEuro(totals[preset.key]?.real ?? 0)} après inflation
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
            Valeur totale par scénario : trait plein = nominal, pointillé = après
            inflation ({formatPercent(inflation.rate)}). Total versé en gris.
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
              <TR>
                <TD>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {PER_LABEL}
                  </span>
                </TD>
                <TD className="text-right font-mono tabular-nums">
                  {formatEuro(perEncoursValue)}
                </TD>
                <TD className="text-right font-mono tabular-nums">
                  {formatEuro(perProjectedValue)}
                </TD>
                <TD className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatEuro(perOutcome?.plusValue ?? 0)}
                </TD>
                <TD>
                  <Badge variant="info">IR capital + PFU plus-values</Badge>
                </TD>
                <TD className="text-right font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatEuro(perNetGain)}
                </TD>
                <TD className="text-right font-mono tabular-nums">
                  {formatEuro(perNetValue)}
                </TD>
              </TR>
            </TBody>
          </Table>
          <p className="px-6 pt-4 text-xs leading-relaxed text-zinc-400">
            Hypothèse PFU 30 % (12,8 % IR + 17,2 % PS). L&apos;option pour le barème
            progressif et les abattements d&apos;assurance-vie ne sont pas chiffrés.
            Pour le PER, la valeur nette intègre l&apos;économie d&apos;impôt à
            l&apos;entrée et l&apos;IR sur le capital à la sortie (détail ci-dessous).
            Conseils indicatifs, ne constituent pas un conseil en investissement.
          </p>
        </CardBody>
      </Card>

      {perActive ? (
        <Card>
          <CardHeader>
            <CardTitle>Bilan fiscal PER</CardTitle>
            <p className="text-xs leading-relaxed text-zinc-500">
              Sur la base du scénario{" "}
              {SCENARIO_PRESETS.find((p) => p.key === ADVICE_SCENARIO)?.label.toLowerCase()}.
              L&apos;économie d&apos;impôt est encaissée au fil des versements ; les
              impôts ci-dessous sont dus au moment de la sortie en capital.
            </p>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <TBody>
                <BilanRow
                  label="Économie d'impôt cumulée"
                  value={perOutcome?.economieImpot ?? 0}
                  positive
                />
                <BilanRow
                  label="Valeur brute projetée"
                  value={perProjectedValue}
                />
                <BilanRow
                  label="Impôt sortie — capital (IR au TMI)"
                  value={-(perOutcome?.impotSortieCapital ?? 0)}
                />
                <BilanRow
                  label="Impôt sortie — plus-values (PFU 30 %)"
                  value={-(perOutcome?.impotSortiePlusValue ?? 0)}
                />
                <BilanRow
                  label="Valeur nette à la sortie"
                  value={perOutcome?.valeurNetteSortie ?? 0}
                  strong
                />
                <TR>
                  <TD>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      Avantage net vs CTO
                    </span>
                    <p className="text-xs text-zinc-500">
                      À effort d&apos;épargne identique : le PER investit le brut, le
                      CTO le net après impôt.
                    </p>
                  </TD>
                  <TD className="text-right">
                    <Badge
                      variant={
                        (perOutcome?.avantageNetVsCto ?? 0) >= 0
                          ? "success"
                          : "warning"
                      }
                    >
                      {formatEuro(perOutcome?.avantageNetVsCto ?? 0)}
                    </Badge>
                  </TD>
                </TR>
              </TBody>
            </Table>
            <p className="px-6 pt-4 text-xs leading-relaxed text-zinc-400">
              {formatEuro(perVersementsFuturs)} versés × {formatPercent(tmiNowValue)}{" "}
              d&apos;économie d&apos;impôt. L&apos;avantage vs CTO compare à effort
              d&apos;épargne identique : le CTO n&apos;investit que le net (après
              impôt sur le revenu), faute de déduction. Hypothèses : versements
              supposés intégralement déductibles (plafond non vérifié), sortie en
              capital, IR de sortie approché par le TMI à la retraite. La sortie en
              rente et le barème progressif exact ne sont pas modélisés.
            </p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function BilanRow({
  label,
  value,
  positive,
  strong,
}: {
  label: string;
  value: number;
  positive?: boolean;
  strong?: boolean;
}) {
  return (
    <TR>
      <TD>
        <span
          className={cn(
            "text-zinc-700 dark:text-zinc-200",
            strong && "font-semibold text-zinc-900 dark:text-zinc-50",
          )}
        >
          {label}
        </span>
      </TD>
      <TD
        className={cn(
          "text-right font-mono tabular-nums",
          strong && "font-semibold",
          positive
            ? "text-emerald-600 dark:text-emerald-400"
            : signClass(value),
        )}
      >
        {formatEuro(value)}
      </TD>
    </TR>
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
