"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Info } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RealizedPnLBars } from "@/components/charts/realized-pnl-bars";
import {
  formatDate,
  formatEuro,
  formatPercent,
  signClass,
} from "@/lib/utils";
import {
  summarizeEventsByEnvelope,
  type EnvelopeYearlySummary,
  type RealizedEvent,
  type RealizedEventKind,
} from "@/lib/fiscalite";
import type { Envelope } from "@/lib/schema";
import {
  estimateAllTaxes,
  type TaxEstimate,
  type TaxRegime,
} from "@/lib/tax-rules";

export type SerializedEvent = Omit<RealizedEvent, "date"> & { date: string };

type YearlyTotal = {
  year: number;
  realizedPnL: number;
  income: number;
  total: number;
};

type MissingOpenDate = {
  label: string;
  envelope: Envelope;
};

type Props = {
  events: SerializedEvent[];
  yearlyTotals: YearlyTotal[];
  openDates: Partial<Record<Envelope, string>>;
  missingOpenDates: MissingOpenDate[];
};

const EVENT_KIND_LABEL: Record<RealizedEventKind, string> = {
  PV: "Vente",
  DIVIDENDE: "Dividende",
  INTERET: "Intérêt",
  RETRAIT: "Retrait",
};

const EVENT_KIND_VARIANT: Record<RealizedEventKind, "success" | "danger" | "info" | "warning"> = {
  PV: "success",
  DIVIDENDE: "info",
  INTERET: "info",
  RETRAIT: "warning",
};

const REGIME_VARIANT: Record<TaxRegime, "success" | "danger" | "info" | "warning" | "default"> = {
  PFU_FULL: "danger",
  PFU_RETRAIT: "warning",
  PS_ONLY: "info",
  HOLD: "default",
  EXEMPT: "default",
};

export function FiscaliteReport({
  events,
  yearlyTotals,
  openDates,
  missingOpenDates,
}: Props) {
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const event of events) years.add(event.year);
    return Array.from(years).sort((a, b) => b - a);
  }, [events]);

  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    availableYears[0],
  );

  const yearEvents = useMemo(
    () => events.filter((e) => e.year === selectedYear),
    [events, selectedYear],
  );

  const summariesByEnvelope = useMemo(
    () => summarizeEventsByEnvelope(yearEvents.map(deserialize)),
    [yearEvents],
  );

  const taxContext = useMemo(
    () => ({
      year: selectedYear ?? new Date().getUTCFullYear(),
      openDates: parseOpenDates(openDates),
    }),
    [selectedYear, openDates],
  );

  const estimates = useMemo(
    () => estimateAllTaxes(summariesByEnvelope, taxContext),
    [summariesByEnvelope, taxContext],
  );

  const totals = useMemo(() => {
    const realizedPnL = Array.from(summariesByEnvelope.values()).reduce(
      (sum, s) => sum + s.realizedPnL,
      0,
    );
    const income = Array.from(summariesByEnvelope.values()).reduce(
      (sum, s) => sum + s.dividends + s.interest,
      0,
    );
    const ir = estimates.reduce((sum, e) => sum + e.ir, 0);
    const ps = estimates.reduce((sum, e) => sum + e.ps, 0);
    const total = estimates.reduce((sum, e) => sum + e.total, 0);
    return { realizedPnL, income, ir, ps, total };
  }, [summariesByEnvelope, estimates]);

  const sortedDetail = useMemo(() => {
    return [...yearEvents]
      .map(deserialize)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [yearEvents]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fiscalité</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Plus-values réalisées et estimation flat tax / prélèvements sociaux
            par enveloppe.
          </p>
        </div>
        <YearSelector
          years={availableYears}
          value={selectedYear}
          onChange={setSelectedYear}
        />
      </header>

      {missingOpenDates.length > 0 && (
        <MissingOpenDateBanner accounts={missingOpenDates} />
      )}

      <Disclaimer />

      {availableYears.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center text-sm text-zinc-500">
            Aucun fait générateur (vente, dividende, intérêt, retrait) trouvé
            dans tes transactions.
          </CardBody>
        </Card>
      ) : (
        <>
          <KpiGrid totals={totals} />

          <Card>
            <CardHeader>
              <CardTitle>Plus-values & revenus réalisés par année</CardTitle>
              <p className="text-xs text-zinc-500">
                Clique sur une année du graphe (ou utilise le sélecteur en haut)
                pour afficher son détail.
              </p>
            </CardHeader>
            <CardBody>
              <RealizedPnLBars
                data={yearlyTotals}
                activeYear={selectedYear}
                onSelectYear={setSelectedYear}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estimation par enveloppe — {selectedYear}</CardTitle>
              <p className="text-xs text-zinc-500">
                Hypothèse : option PFU. Abattements PEA / AV non modélisés
                hormis l&apos;exonération d&apos;IR du PEA après 5 ans.
              </p>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Enveloppe</TH>
                    <TH>Régime</TH>
                    <TH className="text-right">Base imposable</TH>
                    <TH className="text-right">IR (12,8 %)</TH>
                    <TH className="text-right">PS (17,2 %)</TH>
                    <TH className="text-right">Total estimé</TH>
                  </TR>
                </THead>
                <TBody>
                  {estimates.map((estimate) => (
                    <EstimateRow
                      key={estimate.bucket}
                      estimate={estimate}
                      summary={summariesByEnvelope.get(estimate.envelope)}
                    />
                  ))}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Détail des faits générateurs — {selectedYear}
              </CardTitle>
              <p className="text-xs text-zinc-500">
                Utile pour la déclaration : ventes (formulaire 2074),
                cessions crypto (formulaire 2086), dividendes & intérêts (2042).
              </p>
            </CardHeader>
            <CardBody className="px-0">
              {sortedDetail.length === 0 ? (
                <p className="px-6 py-4 text-sm text-zinc-500">
                  Aucun fait générateur pour cette année.
                </p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Date</TH>
                      <TH>Type</TH>
                      <TH>Compte</TH>
                      <TH>Actif</TH>
                      <TH className="text-right">Produit</TH>
                      <TH className="text-right">Prix de revient</TH>
                      <TH className="text-right">Gain</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {sortedDetail.map((event, index) => (
                      <TR key={`${event.date.toISOString()}-${index}`}>
                        <TD className="whitespace-nowrap font-mono text-xs text-zinc-500">
                          {formatDate(event.date)}
                        </TD>
                        <TD>
                          <Badge variant={EVENT_KIND_VARIANT[event.kind]}>
                            {EVENT_KIND_LABEL[event.kind]}
                          </Badge>
                          {event.assetType === "CRYPTO" &&
                            event.kind === "PV" && (
                              <Badge variant="warning" className="ml-1">
                                crypto
                              </Badge>
                            )}
                        </TD>
                        <TD className="text-zinc-600 dark:text-zinc-400">
                          {event.accountLabel}
                          <span className="ml-1 text-xs text-zinc-400">
                            ({event.envelope})
                          </span>
                        </TD>
                        <TD className="font-medium">{event.assetLabel}</TD>
                        <TD className="text-right font-mono text-xs">
                          {formatEuro(event.proceeds)}
                        </TD>
                        <TD className="text-right font-mono text-xs text-zinc-500">
                          {event.kind === "PV" || event.kind === "RETRAIT"
                            ? formatEuro(event.costBasis)
                            : "—"}
                        </TD>
                        <TD
                          className={`text-right font-mono text-xs ${signClass(event.gain)}`}
                        >
                          {formatEuro(event.gain)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiGrid({
  totals,
}: {
  totals: { realizedPnL: number; income: number; ir: number; ps: number; total: number };
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Plus-values réalisées</CardTitle>
          <CardValue className={signClass(totals.realizedPnL)}>
            {formatEuro(totals.realizedPnL)}
          </CardValue>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Dividendes + intérêts</CardTitle>
          <CardValue className={signClass(totals.income)}>
            {formatEuro(totals.income)}
          </CardValue>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Impôt sur le revenu</CardTitle>
          <CardValue className="text-zinc-900 dark:text-zinc-50">
            {formatEuro(totals.ir)}
          </CardValue>
          <p className="text-xs text-zinc-500">12,8 % sur la base imposable</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Prélèvements sociaux</CardTitle>
          <CardValue className="text-zinc-900 dark:text-zinc-50">
            {formatEuro(totals.ps)}
          </CardValue>
          <p className="text-xs text-zinc-500">
            17,2 % • Total estimé {formatEuro(totals.total)}
          </p>
        </CardHeader>
      </Card>
    </div>
  );
}

function EstimateRow({
  estimate,
  summary,
}: {
  estimate: TaxEstimate;
  summary: EnvelopeYearlySummary | undefined;
}) {
  const totalRate =
    estimate.base > 0 ? estimate.total / estimate.base : 0;
  const realizedHint = summary
    ? `${formatSignedEuro(summary.realizedPnL)} PV • ${formatSignedEuro(
        summary.dividends + summary.interest,
      )} revenus`
    : "—";

  return (
    <TR>
      <TD>
        <div className="font-medium">{estimate.label}</div>
        <div className="mt-0.5 text-xs text-zinc-500">{realizedHint}</div>
      </TD>
      <TD>
        <Badge variant={REGIME_VARIANT[estimate.regime]}>
          {estimate.rateLabel}
        </Badge>
        {estimate.notes.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-[11px] leading-snug text-zinc-500">
            {estimate.notes.map((note) => (
              <li key={note}>· {note}</li>
            ))}
          </ul>
        )}
      </TD>
      <TD className="text-right font-mono text-xs">
        {formatEuro(estimate.base)}
      </TD>
      <TD className="text-right font-mono text-xs text-zinc-500">
        {estimate.ir > 0 ? formatEuro(estimate.ir) : "—"}
      </TD>
      <TD className="text-right font-mono text-xs text-zinc-500">
        {estimate.ps > 0 ? formatEuro(estimate.ps) : "—"}
      </TD>
      <TD className="text-right font-mono text-xs font-semibold">
        {estimate.total > 0 ? formatEuro(estimate.total) : "—"}
        {estimate.base > 0 && (
          <div className="text-[11px] font-normal text-zinc-400">
            {formatPercent(totalRate)}
          </div>
        )}
      </TD>
    </TR>
  );
}

function YearSelector({
  years,
  value,
  onChange,
}: {
  years: number[];
  value: number | undefined;
  onChange: (year: number) => void;
}) {
  if (years.length === 0) return null;
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
      <span className="font-medium uppercase tracking-wider text-zinc-500">
        Année
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 font-mono text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}

function MissingOpenDateBanner({ accounts }: { accounts: MissingOpenDate[] }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">Date d&apos;ouverture manquante</p>
        <p className="text-xs leading-relaxed">
          {accounts.length === 1
            ? "Ce compte n'a pas de date d'ouverture renseignée"
            : "Ces comptes n'ont pas de date d'ouverture renseignée"}{" "}
          : {accounts.map((a) => `${a.label} (${a.envelope})`).join(", ")}. Sans
          elle, un retrait est estimé au taux le plus prudent (PEA &lt; 5 ans /
          AV &lt; 8 ans). Renseigne-la depuis la page{" "}
          <Link
            href="/comptes"
            className="font-medium underline underline-offset-2"
          >
            Comptes
          </Link>{" "}
          pour bénéficier de l&apos;exonération d&apos;IR.
        </p>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="space-y-1">
        <p className="font-medium">Estimation indicative</p>
        <p className="text-xs leading-relaxed">
          Les calculs supposent l&apos;option PFU (12,8 % IR + 17,2 % PS). Le
          barème progressif, l&apos;abattement annuel d&apos;assurance-vie
          (4 600 € / 9 200 € après 8 ans) et la base de cession globale crypto
          (formulaire 2086) ne sont pas modélisés. Pour les enveloppes PEA /
          PEE / AV, le gain inclus dans un retrait est estimé au prorata du
          gain enregistré dans l&apos;enveloppe.
        </p>
      </div>
    </div>
  );
}

function deserialize(event: SerializedEvent): RealizedEvent {
  return { ...event, date: new Date(event.date) };
}

function parseOpenDates(
  raw: Partial<Record<Envelope, string>>,
): Partial<Record<Envelope, Date | undefined>> {
  const result: Partial<Record<Envelope, Date | undefined>> = {};
  for (const key of ["CTO", "PEA", "PEE", "AV"] as Envelope[]) {
    const value = raw[key];
    if (value) result[key] = new Date(value);
  }
  return result;
}

function formatSignedEuro(value: number): string {
  if (value === 0) return "0 €";
  return `${value > 0 ? "+" : ""}${formatEuro(value)}`;
}
