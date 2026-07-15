"use client";

import { useCallback, useMemo, useState } from "react";
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
import { projectInvestment, type ContributionStream } from "@/lib/projection";
import { computePerOutcome } from "@/lib/per";
import {
  buildEnvelopeProjectionAdvice,
  ENVELOPE_LABELS,
  RECOMMENDED_ENVELOPES,
  type EnvelopeInfo,
} from "@/lib/fiscal-advice";
import type { Envelope } from "@/lib/schema";
import { cn, formatEuro, formatPercent, signClass } from "@/lib/utils";
import type { InflationView } from "./projection-client";

export type EnvelopeProjectionInput = {
  envelope: EnvelopeInfo["envelope"];
  currentValue: number;
  monthlyDefault: number;
  extraContributions: ContributionStream[];
  openDate?: string;
  plafond?: number;
};

const FREQUENCY_SUFFIX: Record<ContributionStream["frequency"], string> = {
  MENSUEL: "/mois",
  TRIMESTRIEL: "/trim.",
  ANNUEL: "/an",
};

const MONTH_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function formatStream(stream: ContributionStream): string {
  const base = `${formatEuro(stream.amount)}${FREQUENCY_SUFFIX[stream.frequency]}`;
  if (stream.frequency === "MENSUEL" || !stream.paymentMonth) return base;
  return `${base} · ${MONTH_SHORT[stream.paymentMonth - 1]}`;
}

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

const NOMINAL_COLOR = "#10b981";
const REAL_COLOR = "#0ea5e9";

const TMI_OPTIONS = [0, 0.11, 0.3, 0.41, 0.45];

const PER_LABEL = ENVELOPE_LABELS.PER;

function parseNumber(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function EnvelopeProjection({
  envelopes,
  monthlyRestant,
  inflation,
  monthly,
  setMonthly,
  rates,
  setRates,
}: {
  envelopes: EnvelopeProjectionInput[];
  monthlyRestant: number;
  inflation: InflationView;
  monthly: Record<string, string>;
  setMonthly: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  rates: Record<string, string>;
  setRates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [years, setYears] = useState("10");
  const [reste, setReste] = useState(
    String(Math.max(0, Math.round(monthlyRestant))),
  );
  const [perEncours, setPerEncours] = useState("0");
  const [perMonthly, setPerMonthly] = useState("0");
  const [tmiNow, setTmiNow] = useState("0.3");
  const [tmiExit, setTmiExit] = useState("0.11");

  const horizonYears = Math.max(0, parseNumber(years));
  const resteValue = Math.max(0, parseNumber(reste));
  const perEncoursValue = Math.max(0, parseNumber(perEncours));
  const perMonthlyValue = Math.max(0, parseNumber(perMonthly));
  const tmiNowValue = parseNumber(tmiNow);
  const tmiExitValue = parseNumber(tmiExit);
  const perActive = perEncoursValue > 0 || perMonthlyValue > 0;

  const rateOf = useCallback(
    (envelope: Envelope): number => parseNumber(rates[envelope] ?? "0") / 100,
    [rates],
  );

  const monthlyOf = useCallback(
    (input: EnvelopeProjectionInput): number => {
      const raw = monthly[input.envelope];
      const value = raw === undefined ? input.monthlyDefault : parseNumber(raw);
      return Math.max(0, value);
    },
    [monthly],
  );

  const candidateEnvelopes = useMemo<Envelope[]>(() => {
    const set = new Set<Envelope>([
      ...envelopes.map((e) => e.envelope),
      ...RECOMMENDED_ENVELOPES,
    ]);
    return Array.from(set);
  }, [envelopes]);

  const projections = useMemo(() => {
    return envelopes.map((envelope) => ({
      envelope,
      result: projectInvestment({
        startBalance: envelope.currentValue,
        contributions: [
          { amount: monthlyOf(envelope), frequency: "MENSUEL" as const },
          ...envelope.extraContributions,
        ],
        annualRate: rateOf(envelope.envelope),
        years: horizonYears,
        inflationRate: inflation.rate,
        plafond: envelope.plafond,
      }),
    }));
  }, [envelopes, monthlyOf, rateOf, horizonYears, inflation.rate]);

  const perResult = useMemo(
    () =>
      projectInvestment({
        startBalance: perEncoursValue,
        monthlyContribution: perMonthlyValue,
        annualRate: rateOf("PER"),
        years: horizonYears,
        inflationRate: inflation.rate,
      }),
    [perEncoursValue, perMonthlyValue, rateOf, horizonYears, inflation.rate],
  );

  const perOutcome = useMemo(
    () =>
      computePerOutcome({
        encoursActuel: perEncoursValue,
        versementsFuturs: perResult.totalContributed - perEncoursValue,
        valeurFinale: perResult.finalValue,
        tmiNow: tmiNowValue,
        tmiExit: tmiExitValue,
      }),
    [perResult, perEncoursValue, tmiNowValue, tmiExitValue],
  );

  const allResults = useMemo(
    () => [...projections.map((p) => p.result), perResult],
    [projections, perResult],
  );

  const chartData = useMemo<ScenarioPoint[]>(() => {
    const base = allResults[0]?.points ?? [];
    return base.map((point, index) => ({
      date: point.date,
      invested: allResults.reduce(
        (sum, r) => sum + (r.points[index]?.invested ?? 0),
        0,
      ),
      value: allResults.reduce(
        (sum, r) => sum + (r.points[index]?.value ?? 0),
        0,
      ),
      value_real: allResults.reduce(
        (sum, r) => sum + (r.points[index]?.realValue ?? 0),
        0,
      ),
    }));
  }, [allResults]);

  const series: ScenarioSeries[] = [
    { key: "value", label: "Patrimoine projeté", color: NOMINAL_COLOR },
    {
      key: "value_real",
      label: "Après inflation",
      color: REAL_COLOR,
      dashed: true,
    },
  ];

  const projectedNominal = allResults.reduce((s, r) => s + r.finalValue, 0);
  const projectedReal = allResults.reduce((s, r) => s + r.finalRealValue, 0);
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
        grossGain: p.result.gain,
        totalContributed: p.result.totalContributed,
      })),
    });
  }, [projections, horizonYears]);

  const projectedValueByEnvelope = useMemo(() => {
    const map = new Map<string, { current: number; projected: number; plafondReachedMonth: number | null; plafond: number | undefined }>();
    for (const p of projections) {
      map.set(p.envelope.envelope, {
        current: p.envelope.currentValue,
        projected: p.result.finalValue,
        plafondReachedMonth: p.result.plafondReachedMonth,
        plafond: p.envelope.plafond,
      });
    }
    return map;
  }, [projections]);

  const monthlyByEnvelope = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of envelopes) map.set(e.envelope, monthlyOf(e));
    return map;
  }, [envelopes, monthlyOf]);

  const resteAdvice = useMemo(() => {
    if (resteValue <= 0) return [];
    const held = new Map(envelopes.map((e) => [e.envelope, e]));
    const candidates = candidateEnvelopes.map((envelope) => {
      const info = held.get(envelope);
      const result = projectInvestment({
        startBalance: 0,
        monthlyContribution: resteValue,
        annualRate: rateOf(envelope),
        years: horizonYears,
        inflationRate: inflation.rate,
      });
      return {
        envelope,
        openDate: info?.openDate ? new Date(info.openDate) : undefined,
        plafond: info?.plafond,
        grossGain: result.gain,
        totalContributed: result.totalContributed,
      };
    });
    return buildEnvelopeProjectionAdvice({
      envelopes: candidates,
      horizonYears,
      sort: true,
    });
  }, [
    resteValue,
    candidateEnvelopes,
    envelopes,
    rateOf,
    horizonYears,
    inflation.rate,
  ]);

  const perProjectedValue = perResult.finalValue;
  const perNetValue = perOutcome.valeurNetteAvecEconomie;
  const perNetGain = perNetValue - perOutcome.capitalVerse;
  const perVersementsFuturs = Math.round(perMonthlyValue * horizonYears * 12);

  if (envelopes.length === 0 && monthlyRestant <= 0 && !perActive) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Aucune enveloppe valorisée ni capacité à investir pour le moment.
          Ajoute des positions dans un CTO, PEA, PEE ou une assurance-vie, ou
          dégage un reste à allouer dans ton budget pour projeter ta croissance
          ici.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Horizon (années)">
              <input
                type="text"
                inputMode="decimal"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Reste à allouer du budget (EUR / mois)">
              <input
                type="text"
                inputMode="decimal"
                value={reste}
                onChange={(e) => setReste(e.target.value)}
                className={inputClasses}
              />
            </Field>
          </div>

          {envelopes.length > 0 ? (
            <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Versement mensuel par enveloppe (EUR / mois)
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {envelopes.map((envelope) => (
                  <Field
                    key={envelope.envelope}
                    label={ENVELOPE_LABELS[envelope.envelope]}
                  >
                    <input
                      type="text"
                      inputMode="decimal"
                      value={
                        monthly[envelope.envelope] ??
                        String(Math.max(0, envelope.monthlyDefault))
                      }
                      onChange={(e) =>
                        setMonthly((prev) => ({
                          ...prev,
                          [envelope.envelope]: e.target.value,
                        }))
                      }
                      className={inputClasses}
                    />
                    {envelope.extraContributions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {envelope.extraContributions.map((stream, i) => (
                          <span
                            key={`${envelope.envelope}-${i}`}
                            className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
                          >
                            + {formatStream(stream)}
                          </span>
                        ))}
                      </div>
                    )}
                  </Field>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Taux de rendement estimé par enveloppe
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {candidateEnvelopes.map((envelope) => (
                <Field key={envelope} label={`${ENVELOPE_LABELS[envelope]} (%)`}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rates[envelope] ?? "0"}
                    onChange={(e) =>
                      setRates((prev) => ({
                        ...prev,
                        [envelope]: e.target.value,
                      }))
                    }
                    className={inputClasses}
                  />
                </Field>
              ))}
            </div>
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
            Investissements engagés ({formatEuro(currentTotal)} aujourd&apos;hui)
            projetés au taux estimé propre à chaque enveloppe. Les versements
            mensuels sont pré-remplis depuis tes plans DCA mais restent
            ajustables ici, et les plafonds (Livret A, PEA) sont respectés. Le
            PER se simule à part avec sa fiscalité propre. Capitalisation
            mensuelle.
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Patrimoine projeté</CardTitle>
            <CardValue>{formatEuro(projectedNominal)}</CardValue>
            <p className="text-xs text-zinc-500">à {horizonYears} an(s)</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Après inflation</CardTitle>
            <CardValue className="text-sky-600 dark:text-sky-400">
              {formatEuro(projectedReal)}
            </CardValue>
            <p className="text-xs text-zinc-500">
              à {formatPercent(inflation.rate)} d&apos;inflation
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Croissance</CardTitle>
            <CardValue
              className={signClass(projectedNominal - currentTotal)}
            >
              {formatEuro(projectedNominal - currentTotal)}
            </CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valeur actuelle</CardTitle>
            <CardValue>{formatEuro(currentTotal)}</CardValue>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Patrimoine projeté</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Valeur totale des enveloppes engagées : trait plein = nominal,
            pointillé = après inflation ({formatPercent(inflation.rate)}). Total
            versé en gris.
          </p>
        </CardHeader>
        <CardBody>
          <ScenarioCurve data={chartData} series={series} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Détail par enveloppe (engagé)</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Projection à l&apos;horizon de tes investissements déjà engagés (DCA),
            avec le gain net après la fiscalité propre à chaque enveloppe.
          </p>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>Enveloppe</TH>
                <TH className="text-right">Versement / mois</TH>
                <TH className="text-right">Valeur actuelle</TH>
                <TH className="text-right">Valeur projetée</TH>
                <TH className="text-right">Plus-value brute</TH>
                <TH>Fiscalité du gain</TH>
                <TH className="text-right">Gain net</TH>
                <TH className="text-right">Valeur nette</TH>
                <TH>Plafond</TH>
              </TR>
            </THead>
            <TBody>
              {advice.map((row) => {
                const values = projectedValueByEnvelope.get(row.envelope);
                const plafondMonth = values?.plafondReachedMonth ?? null;
                const plafondValue = values?.plafond;
                return (
                  <TR key={row.envelope}>
                    <TD>
                      <span className="font-medium text-zinc-900 dark:text-zinc-50">
                        {row.label}
                      </span>
                    </TD>
                    <TD className="text-right font-mono tabular-nums">
                      {formatEuro(monthlyByEnvelope.get(row.envelope) ?? 0)}
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
                    <TD>
                      {plafondValue ? (
                        <Badge variant={plafondMonth !== null ? "warning" : "default"}>
                          {plafondMonth !== null
                            ? `Atteint en ${Math.ceil(plafondMonth / 12)} an${Math.ceil(plafondMonth / 12) > 1 ? "s" : ""}`
                            : formatEuro(plafondValue)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TD>
                  </TR>
                );
              })}
              {perActive ? (
                <TR>
                  <TD>
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">
                      {PER_LABEL}
                    </span>
                  </TD>
                  <TD className="text-right font-mono tabular-nums">
                    {formatEuro(perMonthlyValue)}
                  </TD>
                  <TD className="text-right font-mono tabular-nums">
                    {formatEuro(perEncoursValue)}
                  </TD>
                  <TD className="text-right font-mono tabular-nums">
                    {formatEuro(perProjectedValue)}
                  </TD>
                  <TD className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatEuro(perOutcome.plusValue)}
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
                  <TD>
                    <span className="text-xs text-zinc-400">—</span>
                  </TD>
                </TR>
              ) : null}
              <TR className="border-t-2 border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/50">
                <TD>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    Total
                  </span>
                </TD>
                <TD className="text-right font-mono font-semibold tabular-nums">
                  {formatEuro(
                    advice.reduce(
                      (sum, row) =>
                        sum + (monthlyByEnvelope.get(row.envelope) ?? 0),
                      perActive ? perMonthlyValue : 0,
                    ),
                  )}
                </TD>
                <TD className="text-right font-mono font-semibold tabular-nums">
                  {formatEuro(
                    advice.reduce(
                      (sum, row) =>
                        sum +
                        (projectedValueByEnvelope.get(row.envelope)?.current ??
                          0),
                      perActive ? perEncoursValue : 0,
                    ),
                  )}
                </TD>
                <TD className="text-right font-mono font-semibold tabular-nums">
                  {formatEuro(
                    advice.reduce(
                      (sum, row) =>
                        sum +
                        (projectedValueByEnvelope.get(row.envelope)
                          ?.projected ?? 0),
                      perActive ? perProjectedValue : 0,
                    ),
                  )}
                </TD>
                <TD className="text-right font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatEuro(
                    advice.reduce(
                      (sum, row) => sum + row.grossGain,
                      perActive ? perOutcome.plusValue : 0,
                    ),
                  )}
                </TD>
                <TD />
                <TD className="text-right font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatEuro(
                    advice.reduce(
                      (sum, row) => sum + row.netGain,
                      perActive ? perNetGain : 0,
                    ),
                  )}
                </TD>
                <TD className="text-right font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatEuro(
                    advice.reduce(
                      (sum, row) => sum + row.netFinalValue,
                      perActive ? perNetValue : 0,
                    ),
                  )}
                </TD>
                <TD />
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

      <Card>
        <CardHeader>
          <CardTitle>Où placer le reste à allouer ?</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Projection de {formatEuro(resteValue)} / mois supplémentaires selon
            l&apos;enveloppe choisie, au taux estimé de chacune, nette de
            fiscalité et de plafond. Classement du plus au moins avantageux.
          </p>
        </CardHeader>
        <CardBody className="px-0">
          {resteAdvice.length === 0 ? (
            <p className="px-6 py-4 text-sm text-zinc-500">
              Renseigne un reste à allouer pour comparer les enveloppes.
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
                {resteAdvice.map((row) => (
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
                        {row.tips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {perActive ? (
        <Card>
          <CardHeader>
            <CardTitle>Bilan fiscal PER</CardTitle>
            <p className="text-xs leading-relaxed text-zinc-500">
              L&apos;économie d&apos;impôt est encaissée au fil des versements ;
              les impôts ci-dessous sont dus au moment de la sortie en capital.
            </p>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <TBody>
                <BilanRow
                  label="Économie d'impôt cumulée"
                  value={perOutcome.economieImpot}
                  positive
                />
                <BilanRow
                  label="Valeur brute projetée"
                  value={perProjectedValue}
                />
                <BilanRow
                  label="Impôt sortie — capital (IR au TMI)"
                  value={-perOutcome.impotSortieCapital}
                />
                <BilanRow
                  label="Impôt sortie — plus-values (PFU 30 %)"
                  value={-perOutcome.impotSortiePlusValue}
                />
                <BilanRow
                  label="Valeur nette à la sortie"
                  value={perOutcome.valeurNetteSortie}
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
                        perOutcome.avantageNetVsCto >= 0 ? "success" : "warning"
                      }
                    >
                      {formatEuro(perOutcome.avantageNetVsCto)}
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
