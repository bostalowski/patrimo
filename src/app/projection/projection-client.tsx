"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import { ProjectionCurve } from "@/components/charts/projection-curve";
import { projectLivret } from "@/lib/livret";
import { cn, formatDate, formatEuro, formatPercent } from "@/lib/utils";

export type LivretOption = {
  id: string;
  label: string;
  rate: number;
  plafond: number | null;
  balance: number;
};

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

export function ProjectionClient({ livrets }: { livrets: LivretOption[] }) {
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
    });
  }, [selected, monthlyDeposit, years]);

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

  const annualInterest = selected.balance * selected.rate;

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
            <CardTitle>Intérêts cumulés</CardTitle>
            <CardValue className="text-emerald-600 dark:text-emerald-400">
              {formatEuro(projection?.totalInterest ?? 0)}
            </CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Intérêts annuels actuels</CardTitle>
            <CardValue>{formatEuro(annualInterest)}</CardValue>
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
            Valeur (zone verte, intérêts composés capitalisés au 31/12) vs total
            versé (pointillé).
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
