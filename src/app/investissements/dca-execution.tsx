"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { computeDcaExecution, computeDcaPlan, type DcaExecution } from "@/lib/dca";
import type { Asset, DcaConfig, Envelope } from "@/lib/schema";
import { formatEuro } from "@/lib/utils";

const DEFAULT_MIN_ORDERS: Partial<Record<Envelope, number>> = {
  PEA: 200,
};

const ENVELOPE_LABELS: Record<Envelope, string> = {
  CTO: "CTO",
  PEA: "PEA",
  PEE: "PEE",
  AV: "Assurance-vie",
  LIVRET: "Livret",
  PER: "PER",
};

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

type Props = {
  configs: DcaConfig[];
  priceMap: Record<string, number>;
  portfolioByEnvelope: Record<string, Record<string, number>>;
  assets: Asset[];
};

export function DcaExecutionCalculator({
  configs,
  priceMap,
  portfolioByEnvelope,
  assets,
}: Props) {
  const [minOrders, setMinOrders] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const [env, value] of Object.entries(DEFAULT_MIN_ORDERS)) {
      initial[env] = String(value);
    }
    return initial;
  });

  const priceMapObj = useMemo(
    () => new Map(Object.entries(priceMap)),
    [priceMap],
  );

  const assetMap = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const envelopesUsed = useMemo(
    () => [...new Set(configs.map((c) => c.envelope))],
    [configs],
  );

  const parsedMinOrders = useMemo(() => {
    const result: Partial<Record<Envelope, number>> = {};
    for (const [env, raw] of Object.entries(minOrders)) {
      const n = Number(raw.replace(",", "."));
      if (Number.isFinite(n) && n > 0) result[env as Envelope] = n;
    }
    return result;
  }, [minOrders]);

  function getMinOrder(envelope: Envelope): number {
    return parsedMinOrders[envelope] ?? 0;
  }

  const executions = useMemo<DcaExecution[]>(() => {
    return configs.map((config) => {
      const currentValues = portfolioByEnvelope[config.envelope] ?? {};
      const plan = computeDcaPlan(config, currentValues);
      return computeDcaExecution(plan, priceMapObj, parsedMinOrders[config.envelope] ?? 0);
    });
  }, [configs, portfolioByEnvelope, priceMapObj, parsedMinOrders]);

  if (configs.length === 0) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Minimum par ordre</CardTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Montant minimum exigé par ton courtier pour passer un ordre, par
            enveloppe. Laisse vide ou à 0 si pas de contrainte.
          </p>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {envelopesUsed.map((envelope) => (
              <label
                key={envelope}
                className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                {ENVELOPE_LABELS[envelope]}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={minOrders[envelope] ?? ""}
                    onChange={(e) =>
                      setMinOrders((prev) => ({
                        ...prev,
                        [envelope]: e.target.value,
                      }))
                    }
                    placeholder="0"
                    className={`w-20 ${inputClasses}`}
                  />
                  <span className="text-xs text-zinc-400">€</span>
                </div>
              </label>
            ))}
          </div>
        </CardBody>
      </Card>

      {executions.map((execution, i) => {
        const config = configs[i];
        const minOrder = getMinOrder(config.envelope);
        return (
          <Card key={execution.configId}>
            <CardHeader>
              <CardTitle className="text-base">{config.label}</CardTitle>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>
                  Budget:{" "}
                  <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                    {formatEuro(execution.totalBudget)}
                  </span>
                </span>
                <span>
                  Total ordres:{" "}
                  <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                    {formatEuro(execution.totalOrderAmount)}
                  </span>
                </span>
                {execution.totalRemainder > 0 && (
                  <span>
                    Reste:{" "}
                    <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                      {formatEuro(execution.totalRemainder)}
                    </span>
                  </span>
                )}
              </div>
            </CardHeader>
            <CardBody className="space-y-4 px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Actif</TH>
                    <TH className="text-right">Prix</TH>
                    <TH className="text-right">Cible</TH>
                    <TH className="text-right">Parts</TH>
                    <TH className="text-right">Ordre</TH>
                    <TH>Statut</TH>
                  </TR>
                </THead>
                <TBody>
                  {execution.lines.map((line) => {
                    const asset = assetMap.get(line.assetId);
                    return (
                      <TR key={line.assetId}>
                        <TD>
                          <span className="font-medium text-zinc-900 dark:text-zinc-50">
                            {asset?.label ?? line.assetId}
                          </span>
                        </TD>
                        <TD className="text-right font-mono tabular-nums">
                          {line.sharePrice > 0
                            ? formatEuro(line.sharePrice)
                            : "—"}
                        </TD>
                        <TD className="text-right font-mono tabular-nums">
                          {formatEuro(line.targetAmount)}
                        </TD>
                        <TD className="text-right font-mono tabular-nums font-semibold">
                          {line.shares > 0
                            ? line.shares
                            : line.fractionalShares
                              ? line.fractionalShares.toFixed(6).replace(/0+$/, "").replace(/\.$/, "")
                              : "—"}
                        </TD>
                        <TD className="text-right font-mono tabular-nums">
                          {line.orderAmount > 0
                            ? formatEuro(line.orderAmount)
                            : "—"}
                        </TD>
                        <TD>
                          {line.status === "BUY" && (
                            <Badge variant="success">Acheter</Badge>
                          )}
                          {line.status === "BUY_FRACTIONAL" && (
                            <Badge variant="success">Fractionné</Badge>
                          )}
                          {line.status === "BELOW_MIN" && (
                            <Badge variant="warning">
                              Sous le minimum
                            </Badge>
                          )}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>

              {execution.rotation && (
                <div className="mx-6 flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-900 dark:bg-sky-950/30">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-sky-900 dark:text-sky-100">
                      Conseil : rotation sur {execution.rotation.rotationMonths}{" "}
                      mois
                    </p>
                    <p className="text-sky-700 dark:text-sky-300">
                      {execution.rotation.rotationMonths > 1 ? (
                        <>
                          Concentre tout le budget sur{" "}
                          <strong>
                            {assetMap.get(execution.rotation.focusAssetId)?.label ??
                              execution.rotation.focusAssetId}
                          </strong>{" "}
                          ce mois-ci ({execution.rotation.focusShares} part
                          {execution.rotation.focusShares > 1 ? "s" : ""} ={" "}
                          {formatEuro(execution.rotation.focusOrderAmount)}), puis
                          alterne avec les autres actifs le mois suivant.
                        </>
                      ) : (
                        <>
                          Accumule pendant{" "}
                          {execution.rotation.rotationMonths} mois pour{" "}
                          <strong>
                            {assetMap.get(execution.rotation.focusAssetId)?.label ??
                              execution.rotation.focusAssetId}
                          </strong>{" "}
                          ({execution.rotation.focusShares} part
                          {execution.rotation.focusShares > 1 ? "s" : ""} ={" "}
                          {formatEuro(execution.rotation.focusOrderAmount)}).
                        </>
                      )}
                      {minOrder > 0 && (
                        <>{" "}Minimum de {formatEuro(minOrder)} respecté
                        sur {ENVELOPE_LABELS[config.envelope]}.</>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
