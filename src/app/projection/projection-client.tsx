"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import type { Envelope } from "@/lib/schema";
import { cn, formatEuro, formatPercent } from "@/lib/utils";
import {
  EnvelopeProjection,
  type EnvelopeProjectionInput,
} from "./envelope-projection";
import {
  RealEstateProjection,
  type SerializedProperty,
} from "./realestate-projection";

type RetirementData = {
  horizonYears: number;
  targetRetirementAge: number;
  monthlyRealEstateNet: number;
  estimatedPublicPension?: number;
};

type Tab = "envelopes" | "immobilier";

const TABS: { key: Tab; label: string }[] = [
  { key: "envelopes", label: "Par enveloppe" },
  { key: "immobilier", label: "Immobilier" },
];

function parseNumber(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export type InflationView = { rate: number };

export function ProjectionClient({
  monthlyRestant,
  envelopeInputs,
  envelopeRates,
  properties,
  inflationRate,
  retirement,
}: {
  monthlyRestant: number;
  envelopeInputs: EnvelopeProjectionInput[];
  envelopeRates: Record<Envelope, number>;
  properties: SerializedProperty[];
  inflationRate: number;
  retirement: RetirementData | null;
}) {
  const [tab, setTab] = useState<Tab>("envelopes");
  const [rateInput, setRateInput] = useState(
    String(Math.round(inflationRate * 1000) / 10),
  );

  const effectiveRate = Math.max(0, parseNumber(rateInput) / 100);
  const inflation: InflationView = { rate: effectiveRate };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === t.key
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs text-zinc-500">
          Inflation
          <input
            type="text"
            inputMode="decimal"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
          %
        </label>
      </div>

      {tab === "envelopes" && (
        <div className="space-y-8">
          <EnvelopeProjection
            envelopes={envelopeInputs}
            defaultRates={envelopeRates}
            monthlyRestant={monthlyRestant}
            inflation={inflation}
          />

          {retirement && (
            <RetirementIncomeCard
              retirement={retirement}
              envelopeInputs={envelopeInputs}
              envelopeRates={envelopeRates}
              inflation={inflation}
            />
          )}
        </div>
      )}

      {tab === "immobilier" && (
        <RealEstateProjection properties={properties} inflation={inflation} />
      )}
    </div>
  );
}

function RetirementIncomeCard({
  retirement,
  envelopeInputs,
  envelopeRates,
  inflation,
}: {
  retirement: RetirementData;
  envelopeInputs: EnvelopeProjectionInput[];
  envelopeRates: Record<Envelope, number>;
  inflation: InflationView;
}) {
  const projectedCapital = envelopeInputs.reduce((sum, env) => {
    const rate = envelopeRates[env.envelope] ?? 0;
    const monthly = env.monthlyDefault;
    const months = Math.round(retirement.horizonYears * 12);
    let balance = env.currentValue;
    const monthlyRate = rate / 12;
    for (let m = 0; m < months; m++) {
      balance = balance * (1 + monthlyRate) + monthly;
    }
    return sum + balance;
  }, 0);

  const weightedRate = envelopeInputs.reduce((sum, env) => {
    return sum + env.currentValue * (envelopeRates[env.envelope] ?? 0);
  }, 0) / Math.max(1, envelopeInputs.reduce((s, e) => s + e.currentValue, 0));

  const annualReturns = projectedCapital * weightedRate;
  const monthlyFromCapital = annualReturns / 12;

  const realMonthlyFromCapital =
    monthlyFromCapital / Math.pow(1 + inflation.rate, retirement.horizonYears);

  const pension = retirement.estimatedPublicPension ?? 0;
  const totalMonthly = monthlyFromCapital + pension + retirement.monthlyRealEstateNet;
  const totalReal = realMonthlyFromCapital + pension + retirement.monthlyRealEstateNet;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenu mensuel à la retraite (sans toucher au capital)</CardTitle>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          À {retirement.targetRetirementAge} ans (dans{" "}
          {Math.round(retirement.horizonYears)} ans) : combien tu peux retirer
          chaque mois en vivant uniquement sur les rendements de ton capital,
          sans l&apos;entamer.
        </p>
      </CardHeader>
      <CardBody>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Capital projeté
            </p>
            <p className="text-xl font-semibold tabular-nums">
              {formatEuro(projectedCapital)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Rendement moyen pondéré
            </p>
            <p className="text-xl font-semibold tabular-nums">
              {formatPercent(weightedRate)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Intérêts mensuels (nominal)
            </p>
            <p className="text-xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              {formatEuro(monthlyFromCapital)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Intérêts mensuels (réel)
            </p>
            <p className="text-xl font-semibold tabular-nums text-sky-600 dark:text-sky-400">
              {formatEuro(realMonthlyFromCapital)}
            </p>
            <p className="text-xs text-zinc-400">
              ajusté de l&apos;inflation à {formatPercent(inflation.rate)}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
            Décomposition du revenu mensuel total
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 dark:text-zinc-300">
                Rendements du capital
              </span>
              <span className="font-mono font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatEuro(monthlyFromCapital)}
              </span>
            </div>
            {pension > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Pension publique estimée
                </span>
                <span className="font-mono font-medium tabular-nums">
                  {formatEuro(pension)}
                </span>
              </div>
            )}
            {retirement.monthlyRealEstateNet > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-300">
                  Loyers nets
                </span>
                <span className="font-mono font-medium tabular-nums">
                  {formatEuro(retirement.monthlyRealEstateNet)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                Total mensuel
              </span>
              <span className="font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatEuro(totalMonthly)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                En pouvoir d&apos;achat (après {formatPercent(inflation.rate)} d&apos;inflation × {Math.round(retirement.horizonYears)} ans)
              </span>
              <span className="font-mono tabular-nums text-sky-600 dark:text-sky-400">
                {formatEuro(totalReal)}
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
