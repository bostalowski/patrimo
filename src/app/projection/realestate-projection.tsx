"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { Table, TBody, TD, TR } from "@/components/ui/table";
import {
  ScenarioCurve,
  type ScenarioPoint,
  type ScenarioSeries,
} from "@/components/charts/scenario-curve";
import {
  currentEquity,
  projectProperty,
} from "@/lib/realestate/projection";
import type { Detention, Property, PropertyRegime } from "@/lib/schema";
import { cn, formatEuro, formatPercent, signClass } from "@/lib/utils";
import type { InflationView } from "./projection-client";

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

const REGIME_LABELS: Record<PropertyRegime, string> = {
  IR_REEL: "Revenus fonciers (réel)",
  IR_MICRO: "Revenus fonciers (micro-foncier)",
  LMNP_REEL: "LMNP meublé (réel)",
  LMNP_MICRO: "LMNP meublé (micro-BIC)",
  IS: "Impôt sur les sociétés (IS)",
  RESIDENCE_PRINCIPALE: "Résidence principale",
};

const DETENTION_LABELS: Record<Detention, string> = {
  SCI: "SCI",
  DIRECT: "Direct",
};

export type SerializedProperty = Omit<
  Property,
  "dateAcquisition" | "dateDebutCredit"
> & {
  dateAcquisition?: string;
  dateDebutCredit?: string;
};

function deserialize(p: SerializedProperty): Property {
  return {
    ...p,
    dateAcquisition: p.dateAcquisition ? new Date(p.dateAcquisition) : undefined,
    dateDebutCredit: p.dateDebutCredit ? new Date(p.dateDebutCredit) : undefined,
  };
}

function parseNumber(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function RealEstateProjection({
  properties,
  inflation,
}: {
  properties: SerializedProperty[];
  inflation: InflationView;
}) {
  const [selectedId, setSelectedId] = useState(properties[0]?.id ?? "");
  const [years, setYears] = useState("20");
  const [revalo, setRevalo] = useState("");

  const selected = useMemo(() => {
    const found = properties.find((p) => p.id === selectedId) ?? properties[0];
    return found ? deserialize(found) : null;
  }, [properties, selectedId]);

  const horizon = Math.max(1, parseNumber(years));
  const revaloOverride =
    revalo.trim() === "" ? undefined : parseNumber(revalo) / 100;

  const projection = useMemo(() => {
    if (!selected) return null;
    return projectProperty(selected, {
      horizonYears: horizon,
      revaloAnnuelle: revaloOverride,
      inflationRate: inflation.rate,
    });
  }, [selected, horizon, revaloOverride, inflation.rate]);

  if (!selected || !projection) {
    return (
      <Card>
        <CardBody className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Aucun bien immobilier. Ajoute un bien dans la page Immobilier pour
          lancer une projection.
        </CardBody>
      </Card>
    );
  }

  const now = new Date();
  const startValue = selected.valeurActuelle * selected.partDetenue;
  const startEquity = currentEquity(selected, now);
  const chartData: ScenarioPoint[] = [
    {
      date: now.toISOString().slice(0, 10),
      value: startValue,
      value_real: startValue,
      equity: startEquity,
      equity_real: startEquity,
      invested: projection.apport,
    },
    ...projection.years.map((y) => ({
      date: new Date(
        Date.UTC(now.getUTCFullYear() + y.year, now.getUTCMonth(), 1),
      )
        .toISOString()
        .slice(0, 10),
      value: y.propertyValue,
      value_real: y.realPropertyValue,
      equity: y.equity,
      equity_real: y.realEquity,
      invested: projection.apport,
    })),
  ];

  const series: ScenarioSeries[] = [
    { key: "value", label: "Valeur du bien", color: "#8b5cf6" },
    {
      key: "value_real",
      label: "Valeur après inflation",
      color: "#8b5cf6",
      dashed: true,
    },
    { key: "equity", label: "Équité", color: "#10b981" },
    {
      key: "equity_real",
      label: "Équité après inflation",
      color: "#10b981",
      dashed: true,
    },
  ];

  const totalInterest = projection.years.reduce(
    (s, y) => s + y.loanInterest + y.loanInsurance,
    0,
  );
  const totalTaxFoncier = projection.years.reduce((s, y) => s + y.tax, 0);
  const isIS = selected.regime === "IS";
  const isResidence = selected.regime === "RESIDENCE_PRINCIPALE";
  const isLmnpReel = selected.regime === "LMNP_REEL";

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Bien">
              <select
                value={selected.id}
                onChange={(e) => setSelectedId(e.target.value)}
                className={inputClasses}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
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
            <Field label="Revalorisation annuelle (%)">
              <input
                type="text"
                inputMode="decimal"
                value={revalo}
                onChange={(e) => setRevalo(e.target.value)}
                placeholder={String(
                  Math.round(selected.revaloAnnuelle * 1000) / 10,
                )}
                className={inputClasses}
              />
            </Field>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {DETENTION_LABELS[selected.detention]} •{" "}
            {REGIME_LABELS[selected.regime]} • Apport{" "}
            {formatEuro(projection.apport)} • Mensualité{" "}
            {formatEuro(projection.monthlyPayment)} (crédit + assurance).
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Équité à {horizon} ans</CardTitle>
            <CardValue>{formatEuro(projection.finalEquity)}</CardValue>
            <p className="text-xs text-sky-600 dark:text-sky-400">
              ≈ {formatEuro(projection.finalRealEquity)} après inflation
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {isResidence ? "Coût de détention cumulé" : "Loyers nets cumulés"}
            </CardTitle>
            <CardValue className={signClass(projection.cumulativeNetCashFlow)}>
              {formatEuro(projection.cumulativeNetCashFlow)}
            </CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Valeur de revente nette</CardTitle>
            <CardValue>{formatEuro(projection.resale.netProceeds)}</CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gain total / an</CardTitle>
            <CardValue className={signClass(projection.totalReturn)}>
              {formatEuro(projection.totalReturn)}
            </CardValue>
            <p className="text-xs text-zinc-500">
              {formatPercent(projection.annualizedReturn)} annualisé sur apport
            </p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valeur du bien et équité</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Valeur revalorisée (violet) et équité (vert) ; en pointillé, les mêmes
            après inflation ({formatPercent(inflation.rate)}). L&apos;apport est en
            gris.
          </p>
        </CardHeader>
        <CardBody>
          <ScenarioCurve data={chartData} series={series} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bilan sur {horizon} ans</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Cash-flow locatif net d&apos;impôt cumulé et produit net en cas de
            revente à l&apos;horizon.
          </p>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <TBody>
              <BilanRow label="Apport initial" value={-projection.apport} />
              <BilanRow
                label={
                  isResidence
                    ? "Coût de détention cumulé"
                    : "Loyers nets d'impôt cumulés"
                }
                value={projection.cumulativeNetCashFlow}
              />
              {!isResidence && (
                <BilanRow
                  label="Dont impôts fonciers cumulés"
                  value={-totalTaxFoncier}
                />
              )}
              <BilanRow
                label="Coût total intérêts + assurance"
                value={-totalInterest}
              />
              <BilanRow
                label="Valeur de revente brute"
                value={projection.resale.salePrice}
              />
              <BilanRow
                label="Capital restant dû à la revente"
                value={-projection.resale.remainingLoan}
              />
              <BilanRow
                label={
                  isResidence
                    ? "Plus-value exonérée (résidence principale)"
                    : isIS
                      ? "Impôt sur la plus-value (IS)"
                      : "Impôt plus-value (IR 19 % + PS 17,2 %)"
                }
                value={-projection.resale.capitalGainTax}
              />
              {isIS && (
                <BilanRow
                  label="Impôt distribution (flat tax 30 %)"
                  value={-projection.resale.distributionTax}
                />
              )}
              <BilanRow
                label="Produit net de revente"
                value={projection.resale.netProceeds}
                strong
              />
              <BilanRow
                label="Net si revente (loyers + revente)"
                value={projection.netIfSold}
                strong
              />
            </TBody>
          </Table>
          <p className="px-6 pt-4 text-xs leading-relaxed text-zinc-400">
            Hypothèses simplifiées : loyers constants, charges déductibles selon
            le régime, abattements PV immobilière des particuliers pour l&apos;IR,
            réintégration des amortissements et flat tax sur distribution pour
            l&apos;IS.
            {isLmnpReel
              ? " En LMNP réel, les amortissements déduits sont réintégrés dans la plus-value de revente (réforme 2025)."
              : ""}{" "}
            Indicatif, ne constitue pas un conseil fiscal.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

function BilanRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
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
          signClass(value),
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
