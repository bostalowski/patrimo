"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import { FeesBars } from "@/components/charts/fees-bars";
import { formatEuro, formatPercent } from "@/lib/utils";
import type {
  AccountFees,
  AssetFees,
  FeeTypeBreakdown,
  TerEstimate,
  YearlyFees,
} from "@/lib/fees";

type BreakdownView = "asset" | "account" | "type";

export function FeesReport({
  totalFees,
  ytdFees,
  ratio,
  terTotal,
  terPerAsset,
  yearlyFees,
  assetFees,
  accountFees,
  typeFees,
  netInvested,
}: {
  totalFees: number;
  ytdFees: number;
  ratio: number;
  terTotal: number;
  terPerAsset: TerEstimate[];
  yearlyFees: YearlyFees[];
  assetFees: AssetFees[];
  accountFees: AccountFees[];
  typeFees: FeeTypeBreakdown[];
  netInvested: number;
}) {
  const [breakdownView, setBreakdownView] = useState<BreakdownView>("asset");

  const donutData = donutSlices(breakdownView, assetFees, accountFees, typeFees);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Frais</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Suivi détaillé des frais de transaction, frais réseau et coûts
          embarqués (TER).
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Frais totaux (all-time)</CardTitle>
            <CardValue>{formatEuro(totalFees)}</CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Frais cette année</CardTitle>
            <CardValue>{formatEuro(ytdFees)}</CardValue>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ratio frais / capital</CardTitle>
            <CardValue>{formatPercent(ratio)}</CardValue>
            <p className="text-xs text-zinc-500">
              Sur {formatEuro(netInvested)} investis
            </p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Coût TER annuel estimé</CardTitle>
            <CardValue>
              {terTotal > 0 ? formatEuro(terTotal) : "—"}
            </CardValue>
            {terTotal > 0 && (
              <p className="text-xs text-zinc-500">
                {terPerAsset.length} actif{terPerAsset.length > 1 ? "s" : ""}{" "}
                avec TER renseigné
              </p>
            )}
            {terTotal === 0 && (
              <p className="text-xs text-zinc-500">
                Renseigne le TER sur tes actifs (ETF, FCPE) pour voir
                l&apos;estimation
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Évolution des frais par année</CardTitle>
        </CardHeader>
        <CardBody>
          <FeesBars data={yearlyFees} />
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Répartition des frais</CardTitle>
              <div className="flex gap-1 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
                {(
                  [
                    { key: "asset", label: "Actif" },
                    { key: "account", label: "Compte" },
                    { key: "type", label: "Type" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setBreakdownView(key)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      breakdownView === key
                        ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <AllocationDonut data={donutData} />
          </CardBody>
        </Card>

        {terPerAsset.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Détail TER par actif</CardTitle>
            </CardHeader>
            <CardBody>
              <Table>
                <THead>
                  <tr>
                    <TH>Actif</TH>
                    <TH className="text-right">TER</TH>
                    <TH className="text-right">Valorisation</TH>
                    <TH className="text-right">Coût annuel</TH>
                  </tr>
                </THead>
                <TBody>
                  {terPerAsset.map((row) => (
                    <TR key={row.assetId}>
                      <TD className="font-medium">
                        <Link
                          href={`/actifs/${encodeURIComponent(row.assetId)}`}
                          className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
                        >
                          {row.label}
                        </Link>
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums">
                        {formatPercent(row.ter)}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums">
                        {formatEuro(row.marketValue)}
                      </TD>
                      <TD className="text-right font-mono text-xs tabular-nums text-amber-600 dark:text-amber-400">
                        {formatEuro(row.annualCost)}
                      </TD>
                    </TR>
                  ))}
                  <TR>
                    <TD className="font-semibold">Total</TD>
                    <TD />
                    <TD />
                    <TD className="text-right font-mono text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                      {formatEuro(terTotal)}
                    </TD>
                  </TR>
                </TBody>
              </Table>
            </CardBody>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Détail des frais par actif</CardTitle>
        </CardHeader>
        <CardBody>
          <Table>
            <THead>
              <tr>
                <TH>Actif</TH>
                <TH className="text-right">Frais payés</TH>
                <TH className="text-right">% du total</TH>
              </tr>
            </THead>
            <TBody>
              {assetFees.map((row) => (
                <TR key={row.assetId}>
                  <TD className="font-medium">
                    <Link
                      href={`/actifs/${encodeURIComponent(row.assetId)}`}
                      className="underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
                    >
                      {row.label}
                    </Link>
                  </TD>
                  <TD className="text-right font-mono text-xs tabular-nums">
                    {formatEuro(row.fees)}
                  </TD>
                  <TD className="text-right font-mono text-xs tabular-nums text-zinc-500">
                    {totalFees > 0 ? formatPercent(row.fees / totalFees) : "—"}
                  </TD>
                </TR>
              ))}
              {assetFees.length === 0 && (
                <TR>
                  <TD colSpan={3} className="text-center text-zinc-500">
                    Aucun frais enregistré.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

const MAX_DONUT_SLICES = 7;

function donutSlices(
  view: BreakdownView,
  assetFees: AssetFees[],
  accountFees: AccountFees[],
  typeFees: FeeTypeBreakdown[],
): Array<{ name: string; value: number }> {
  let items: Array<{ name: string; value: number }>;

  switch (view) {
    case "asset":
      items = assetFees.map((f) => ({ name: f.label, value: f.fees }));
      break;
    case "account":
      items = accountFees.map((f) => ({
        name: `${f.label} (${f.envelope})`,
        value: f.fees,
      }));
      break;
    case "type":
      items = typeFees.map((f) => ({ name: f.label, value: f.fees }));
      break;
  }

  if (items.length <= MAX_DONUT_SLICES) return items;

  const top = items.slice(0, MAX_DONUT_SLICES - 1);
  const rest = items.slice(MAX_DONUT_SLICES - 1);
  const otherTotal = rest.reduce((sum, i) => sum + i.value, 0);
  return [...top, { name: "Autres", value: otherTotal }];
}
