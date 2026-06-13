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
import { cn, formatEuro, formatPercent, signClass } from "@/lib/utils";

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  prudent: "#0ea5e9",
  modere: "#10b981",
  dynamique: "#8b5cf6",
};

const ADVICE_SCENARIO: ScenarioKey = "modere";

const TMI_OPTIONS = [0, 0.11, 0.3, 0.41, 0.45];

function parseNumber(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function PerProjection() {
  const [encours, setEncours] = useState("0");
  const [monthly, setMonthly] = useState("200");
  const [years, setYears] = useState("20");
  const [tmiNow, setTmiNow] = useState("0.3");
  const [tmiExit, setTmiExit] = useState("0.11");
  const [rates, setRates] = useState<Record<ScenarioKey, string>>(() =>
    SCENARIO_PRESETS.reduce(
      (acc, preset) => {
        acc[preset.key] = String(Math.round(preset.rate * 1000) / 10);
        return acc;
      },
      {} as Record<ScenarioKey, string>,
    ),
  );

  const encoursValue = Math.max(0, parseNumber(encours));
  const monthlyValue = Math.max(0, parseNumber(monthly));
  const horizonYears = Math.max(0, parseNumber(years));
  const tmiNowValue = parseNumber(tmiNow);
  const tmiExitValue = parseNumber(tmiExit);

  const projections = useMemo(() => {
    return SCENARIO_PRESETS.map((preset) => ({
      preset,
      result: projectInvestment({
        startBalance: encoursValue,
        monthlyContribution: monthlyValue,
        annualRate: parseNumber(rates[preset.key]) / 100,
        years: horizonYears,
      }),
    }));
  }, [encoursValue, monthlyValue, horizonYears, rates]);

  const versementsFuturs = Math.round(monthlyValue * horizonYears * 12);

  const outcomes = useMemo(() => {
    const map = new Map<ScenarioKey, ReturnType<typeof computePerOutcome>>();
    for (const { preset, result } of projections) {
      map.set(
        preset.key,
        computePerOutcome({
          encoursActuel: encoursValue,
          versementsFuturs: result.totalContributed - encoursValue,
          valeurFinale: result.finalValue,
          tmiNow: tmiNowValue,
          tmiExit: tmiExitValue,
        }),
      );
    }
    return map;
  }, [projections, encoursValue, tmiNowValue, tmiExitValue]);

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

  const adviceOutcome = outcomes.get(ADVICE_SCENARIO);

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Encours PER actuel (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={encours}
                onChange={(e) => setEncours(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Versement mensuel (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
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
            Les versements sont déduits de ton revenu imposable : ils génèrent une
            économie d&apos;impôt égale à ton TMI. À la sortie en capital, la part
            versée est imposée à l&apos;IR (approché par le TMI à la retraite) et les
            plus-values au PFU 30 %. Capitalisation mensuelle.
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {projections.map(({ preset, result }) => {
          const outcome = outcomes.get(preset.key);
          return (
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
                <p className="text-xs text-zinc-500">
                  Net après sortie{" "}
                  {formatEuro(outcome?.valeurNetteSortie ?? 0)}
                </p>
              </CardHeader>
            </Card>
          );
        })}
        <Card>
          <CardHeader>
            <CardTitle>Économie d&apos;impôt cumulée</CardTitle>
            <CardValue className="text-emerald-600 dark:text-emerald-400">
              {formatEuro(adviceOutcome?.economieImpot ?? 0)}
            </CardValue>
            <p className="text-xs text-zinc-500">
              {formatEuro(versementsFuturs)} versés × {formatPercent(tmiNowValue)}
            </p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Croissance projetée</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Capital brut du PER par scénario de rendement vs total versé
            (pointillé). La fiscalité s&apos;applique à la sortie.
          </p>
        </CardHeader>
        <CardBody>
          <ScenarioCurve data={chartData} series={series} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bilan fiscal</CardTitle>
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
                value={adviceOutcome?.economieImpot ?? 0}
                positive
              />
              <BilanRow
                label="Valeur brute projetée"
                value={projections.find((p) => p.preset.key === ADVICE_SCENARIO)?.result.finalValue ?? 0}
              />
              <BilanRow
                label="Impôt sortie — capital (IR au TMI)"
                value={-(adviceOutcome?.impotSortieCapital ?? 0)}
              />
              <BilanRow
                label="Impôt sortie — plus-values (PFU 30 %)"
                value={-(adviceOutcome?.impotSortiePlusValue ?? 0)}
              />
              <BilanRow
                label="Valeur nette à la sortie"
                value={adviceOutcome?.valeurNetteSortie ?? 0}
                strong
              />
              <TR>
                <TD>
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    Avantage net vs CTO
                  </span>
                  <p className="text-xs text-zinc-500">
                    Économie d&apos;impôt incluse, à versements identiques.
                  </p>
                </TD>
                <TD className="text-right">
                  <Badge
                    variant={
                      (adviceOutcome?.avantageNetVsCto ?? 0) >= 0
                        ? "success"
                        : "warning"
                    }
                  >
                    {formatEuro(adviceOutcome?.avantageNetVsCto ?? 0)}
                  </Badge>
                </TD>
              </TR>
            </TBody>
          </Table>
          <p className="px-6 pt-4 text-xs leading-relaxed text-zinc-400">
            Hypothèses : versements supposés intégralement déductibles (plafond
            d&apos;épargne retraite non vérifié), sortie en capital de versements
            déduits, IR de sortie approché par le TMI à la retraite. Les abattements,
            la sortie en rente et le barème progressif exact ne sont pas modélisés.
            Indicatif, ne constitue pas un conseil en investissement.
          </p>
        </CardBody>
      </Card>
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
