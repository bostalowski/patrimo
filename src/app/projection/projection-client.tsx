"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { ProjectionCurve } from "@/components/charts/projection-curve";
import { projectLivret } from "@/lib/livret";
import { cn, formatDate, formatEuro, formatPercent } from "@/lib/utils";
import {
  RestantProjection,
  type SerializedEnvelope,
} from "./restant-projection";
import {
  EnvelopeProjection,
  type EnvelopeProjectionInput,
} from "./envelope-projection";
import { PerProjection } from "./per-projection";
import {
  RealEstateProjection,
  type SerializedProperty,
} from "./realestate-projection";

export type LivretOption = {
  id: string;
  label: string;
  rate: number;
  plafond: number | null;
  balance: number;
};

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

type Mode = "livrets" | "enveloppe" | "restant" | "per" | "immobilier";

const TABS: { key: Mode; label: string }[] = [
  { key: "livrets", label: "Livrets" },
  { key: "enveloppe", label: "Par enveloppe" },
  { key: "restant", label: "Restant à investir" },
  { key: "per", label: "PER" },
  { key: "immobilier", label: "Immobilier" },
];

function parseNumber(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function ProjectionClient({
  livrets,
  monthlyRestant,
  envelopes,
  envelopeInputs,
  properties,
  inflationRate,
}: {
  livrets: LivretOption[];
  monthlyRestant: number;
  envelopes: SerializedEnvelope[];
  envelopeInputs: EnvelopeProjectionInput[];
  properties: SerializedProperty[];
  inflationRate: number;
}) {
  const [mode, setMode] = useState<Mode>("livrets");
  const [rateInput, setRateInput] = useState(
    String(Math.round(inflationRate * 1000) / 10),
  );

  const effectiveRate = Math.max(0, parseNumber(rateInput) / 100);
  const inflation: InflationView = { rate: effectiveRate };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key)}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                mode === tab.key
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
              )}
            >
              {tab.label}
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

      {mode === "livrets" ? (
        <LivretProjection livrets={livrets} inflation={inflation} />
      ) : mode === "enveloppe" ? (
        <EnvelopeProjection envelopes={envelopeInputs} inflation={inflation} />
      ) : mode === "per" ? (
        <PerProjection inflation={inflation} />
      ) : mode === "immobilier" ? (
        <RealEstateProjection properties={properties} inflation={inflation} />
      ) : (
        <RestantProjection
          defaultMonthly={monthlyRestant}
          envelopes={envelopes}
          inflation={inflation}
        />
      )}
    </div>
  );
}

export type InflationView = { rate: number };

function LivretProjection({
  livrets,
  inflation,
}: {
  livrets: LivretOption[];
  inflation: InflationView;
}) {
  const [selectedId, setSelectedId] = useState(livrets[0]?.id ?? "");
  const [monthlyDeposit, setMonthlyDeposit] = useState("100");
  const [years, setYears] = useState("10");

  const selected =
    livrets.find((l) => l.id === selectedId) ?? livrets[0] ?? null;

  const projection = useMemo(() => {
    if (!selected) return null;
    const monthly = Math.max(0, Number(monthlyDeposit.replace(",", ".")) || 0);
    const horizon = Math.max(0, Number(years.replace(",", ".")) || 0);
    return projectLivret({
      startBalance: selected.balance,
      rate: selected.rate,
      plafond: selected.plafond ?? undefined,
      monthlyDeposit: monthly,
      years: horizon,
      inflationRate: inflation.rate,
    });
  }, [selected, monthlyDeposit, years, inflation.rate]);

  if (!selected) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Aucun livret pour le moment. Créez un actif de type{" "}
          <code>LIVRET</code> (avec un taux) dans la page Actifs pour lancer une
          projection.
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Livret">
              <select
                value={selected.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className={inputClasses}
              >
                {livrets.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Versement mensuel (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(e.target.value)}
                placeholder="100"
                className={inputClasses}
              />
            </Field>

            <Field label="Horizon (années)">
              <input
                type="text"
                inputMode="decimal"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="10"
                className={inputClasses}
              />
            </Field>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            Solde actuel {formatEuro(selected.balance)} • Taux{" "}
            {formatPercent(selected.rate)}
            {selected.plafond
              ? ` • Plafond ${formatEuro(selected.plafond)}`
              : ""}
            .
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Valeur projetée</CardTitle>
            <CardValue>{formatEuro(projection?.finalValue ?? 0)}</CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valeur après inflation</CardTitle>
            <CardValue>{formatEuro(projection?.finalRealValue ?? 0)}</CardValue>
            <p className="text-xs text-zinc-500">
              Pouvoir d&apos;achat à {formatPercent(inflation.rate)} d&apos;inflation
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Intérêts cumulés</CardTitle>
            <CardValue className="text-emerald-600 dark:text-emerald-400">
              {formatEuro(projection?.totalInterest ?? 0)}
            </CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plafond atteint</CardTitle>
            <CardValue>
              {selected.plafond
                ? projection?.plafondReachedDate
                  ? formatDate(projection.plafondReachedDate)
                  : "Non atteint"
                : "—"}
            </CardValue>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Croissance projetée</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Valeur nominale (zone verte) vs valeur après inflation à{" "}
            {formatPercent(inflation.rate)} (bleu pointillé) vs total versé (gris).
            L&apos;écart entre les deux courbes est l&apos;érosion du pouvoir
            d&apos;achat.
          </p>
        </CardHeader>
        <CardBody>
          <ProjectionCurve
            data={projection?.points ?? []}
            plafond={selected.plafond}
          />
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
