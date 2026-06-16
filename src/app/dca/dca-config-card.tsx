"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import type { Asset, DcaConfig, DcaLine } from "@/lib/schema";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { computeDcaPlan } from "@/lib/dca";
import { cn, formatEuro, formatPercent } from "@/lib/utils";

const ENVELOPES = ["CTO", "PEA", "PEE", "AV", "PER"] as const;
type Envelope = (typeof ENVELOPES)[number];

type LineWithUid = DcaLine & { _uid: string };

type EditableConfig = Omit<DcaConfig, "lines"> & { lines: LineWithUid[] };

type Props = {
  initialConfig: DcaConfig;
  isDraft: boolean;
  assets: Asset[];
  portfolioByEnvelope: Record<string, Record<string, number>>;
  onDraftDiscarded: () => void;
  onDraftSaved?: () => void;
};

function parseDecimal(value: string): number {
  const normalised = value.trim().replace(",", ".").replace(/\s/g, "");
  const n = Number(normalised);
  return Number.isFinite(n) ? n : 0;
}

let uidCounter = 0;
function nextUid(): string {
  uidCounter += 1;
  return `line-${Date.now()}-${uidCounter}`;
}

function withUids(config: DcaConfig): EditableConfig {
  return {
    ...config,
    lines: config.lines.map((line) => ({ ...line, _uid: nextUid() })),
  };
}

function stripUids(config: EditableConfig): DcaConfig {
  return {
    ...config,
    lines: config.lines.map((line) => ({
      label: line.label,
      assetIds: line.assetIds,
      targetPct: line.targetPct,
    })),
  };
}

export function DcaConfigCard({
  initialConfig,
  isDraft,
  assets,
  portfolioByEnvelope,
  onDraftDiscarded,
  onDraftSaved,
}: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<EditableConfig>(() => withUids(initialConfig));
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedConfig, setSavedConfig] = useState<DcaConfig | null>(
    isDraft ? null : initialConfig,
  );

  const persistableConfig = useMemo(() => stripUids(config), [config]);
  const currentValues = useMemo(
    () => portfolioByEnvelope[config.envelope] ?? {},
    [portfolioByEnvelope, config.envelope],
  );

  const plan = useMemo(
    () => computeDcaPlan(persistableConfig, currentValues),
    [persistableConfig, currentValues],
  );

  const targetSumPct = plan.targetSum;
  const targetValid = plan.targetValid;
  const dirty =
    savedConfig === null ||
    JSON.stringify(savedConfig) !== JSON.stringify(persistableConfig);
  const isLoading = busy || pending;

  const assetMap = useMemo(
    () => new Map(assets.map((a) => [a.id, a])),
    [assets],
  );

  const usedAssetIds = useMemo(
    () => new Set(config.lines.flatMap((line) => line.assetIds)),
    [config.lines],
  );

  function updateLine(uid: string, patch: Partial<DcaLine>) {
    setConfig((c) => ({
      ...c,
      lines: c.lines.map((line) =>
        line._uid === uid ? { ...line, ...patch } : line,
      ),
    }));
  }

  function addLine() {
    setConfig((c) => ({
      ...c,
      lines: [
        ...c.lines,
        { label: undefined, assetIds: [], targetPct: 0, _uid: nextUid() },
      ],
    }));
  }

  function removeLine(uid: string) {
    setConfig((c) => ({
      ...c,
      lines: c.lines.filter((line) => line._uid !== uid),
    }));
  }

  function addAssetToBasket(uid: string, assetId: string) {
    if (!assetId) return;
    setConfig((c) => ({
      ...c,
      lines: c.lines.map((line) =>
        line._uid === uid && !line.assetIds.includes(assetId)
          ? { ...line, assetIds: [...line.assetIds, assetId] }
          : line,
      ),
    }));
  }

  function removeAssetFromBasket(uid: string, assetId: string) {
    setConfig((c) => ({
      ...c,
      lines: c.lines.map((line) =>
        line._uid === uid
          ? { ...line, assetIds: line.assetIds.filter((id) => id !== assetId) }
          : line,
      ),
    }));
  }

  function distributeRemaining(uid: string) {
    const others = config.lines.filter((l) => l._uid !== uid);
    const usedByOthers = others.reduce((s, l) => s + l.targetPct, 0);
    const remaining = Math.max(0, 1 - usedByOthers);
    updateLine(uid, { targetPct: remaining });
  }

  async function save() {
    setError(null);
    if (!targetValid) {
      setError(`Σ cibles doit valoir 100% (actuellement ${formatPercent(targetSumPct)}).`);
      return;
    }
    if (persistableConfig.lines.some((l) => l.assetIds.length === 0)) {
      setError("Chaque panier doit contenir au moins un actif.");
      return;
    }
    const flatAssets = persistableConfig.lines.flatMap((l) => l.assetIds);
    if (new Set(flatAssets).size !== flatAssets.length) {
      setError("Un actif ne peut apparaître que dans un seul panier.");
      return;
    }
    if (
      persistableConfig.monthlyAmount < 0 ||
      !Number.isFinite(persistableConfig.monthlyAmount)
    ) {
      setError("Montant mensuel invalide.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/dca", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(persistableConfig),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Échec de la sauvegarde");
      }
      setSavedConfig(persistableConfig);
      startTransition(() => router.refresh());
      if (isDraft) onDraftSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (isDraft || !savedConfig) {
      onDraftDiscarded();
      return;
    }
    if (!window.confirm(`Supprimer le plan « ${config.label} » ?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dca", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: config.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const compatibleAssets = assets.filter((a) => a.type !== "CASH");

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_160px]">
          <input
            type="text"
            value={config.label}
            onChange={(e) =>
              setConfig((c) => ({ ...c, label: e.target.value }))
            }
            placeholder="Nom du plan"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-950"
          />
          <select
            value={config.envelope}
            onChange={(e) =>
              setConfig((c) => ({ ...c, envelope: e.target.value as Envelope }))
            }
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {ENVELOPES.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={
                Number.isFinite(config.monthlyAmount)
                  ? String(config.monthlyAmount)
                  : ""
              }
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  monthlyAmount: parseDecimal(e.target.value),
                }))
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            />
            <span className="text-sm text-zinc-500">€/mois</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-zinc-500">
            <span>
              Total actuel ({config.envelope}):{" "}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {formatEuro(plan.totalCurrent)}
              </span>
            </span>
            <span>•</span>
            <span>
              Après DCA:{" "}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                {formatEuro(plan.totalAfter)}
              </span>
            </span>
          </div>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-mono",
              targetValid
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
            )}
          >
            Σ cibles: {formatPercent(targetSumPct)}
          </span>
        </div>
      </CardHeader>

      <CardBody className="space-y-4">
        <Table>
          <THead>
            <TR>
              <TH>Panier</TH>
              <TH className="text-right">Cible</TH>
              <TH className="text-right">Valeur actuelle</TH>
              <TH className="text-right">% actuel</TH>
              <TH className="text-right">À investir</TH>
              <TH className="text-right">Valeur après</TH>
              <TH className="text-right">% après</TH>
              <TH className="w-8"></TH>
            </TR>
          </THead>
          <TBody>
            {config.lines.map((line, i) => {
              const allocation = plan.allocations[i];
              const drift = allocation.postPct - line.targetPct;
              const showSubRows = line.assetIds.length > 1;
              const availableAssets = compatibleAssets.filter(
                (a) => !usedAssetIds.has(a.id) || line.assetIds.includes(a.id),
              );
              return (
                <BasketRowGroup
                  key={line._uid}
                  line={line}
                  allocation={allocation}
                  drift={drift}
                  showSubRows={showSubRows}
                  availableAssets={availableAssets}
                  assetMap={assetMap}
                  canRemoveLine={config.lines.length > 1}
                  onLabelChange={(label) => updateLine(line._uid, { label })}
                  onTargetChange={(targetPct) =>
                    updateLine(line._uid, { targetPct })
                  }
                  onTargetDoubleClick={() => distributeRemaining(line._uid)}
                  onAddAsset={(assetId) => addAssetToBasket(line._uid, assetId)}
                  onRemoveAsset={(assetId) =>
                    removeAssetFromBasket(line._uid, assetId)
                  }
                  onRemoveLine={() => removeLine(line._uid)}
                />
              );
            })}
          </TBody>
        </Table>

        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-700 dark:text-zinc-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un panier
        </button>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={remove}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="h-4 w-4" />
            {isDraft && !savedConfig ? "Annuler" : "Supprimer"}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isLoading || !dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {dirty ? "Sauvegarder" : "Sauvegardé"}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

type BasketRowProps = {
  line: LineWithUid;
  allocation: ReturnType<typeof computeDcaPlan>["allocations"][number];
  drift: number;
  showSubRows: boolean;
  availableAssets: Asset[];
  assetMap: Map<string, Asset>;
  canRemoveLine: boolean;
  onLabelChange: (label: string) => void;
  onTargetChange: (targetPct: number) => void;
  onTargetDoubleClick: () => void;
  onAddAsset: (assetId: string) => void;
  onRemoveAsset: (assetId: string) => void;
  onRemoveLine: () => void;
};

function BasketRowGroup({
  line,
  allocation,
  drift,
  showSubRows,
  availableAssets,
  assetMap,
  canRemoveLine,
  onLabelChange,
  onTargetChange,
  onTargetDoubleClick,
  onAddAsset,
  onRemoveAsset,
  onRemoveLine,
}: BasketRowProps) {
  const targetPctDisplay = Number.isFinite(line.targetPct)
    ? String(Math.round(line.targetPct * 10000) / 100)
    : "";

  return (
    <>
      <TR>
        <TD>
          <div className="space-y-2">
            <input
              type="text"
              value={line.label ?? ""}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder={
                line.assetIds.length > 0
                  ? line.assetIds.join(" + ")
                  : "Nom du panier"
              }
              className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-950"
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {line.assetIds.map((id) => {
                const asset = assetMap.get(id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {asset?.label ?? id}
                    <button
                      type="button"
                      onClick={() => onRemoveAsset(id)}
                      className="rounded-full text-emerald-700/70 hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:text-emerald-200"
                      aria-label={`Retirer ${asset?.label ?? id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) onAddAsset(e.target.value);
                }}
                className="rounded-md border border-dashed border-zinc-300 bg-transparent px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              >
                <option value="">+ ajouter un actif</option>
                {availableAssets
                  .filter((a) => !line.assetIds.includes(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </TD>
        <TD className="text-right align-top">
          <div className="inline-flex items-center gap-1">
            <input
              type="text"
              inputMode="decimal"
              value={targetPctDisplay}
              onChange={(e) =>
                onTargetChange(parseDecimal(e.target.value) / 100)
              }
              onDoubleClick={onTargetDoubleClick}
              title="Double-clic pour utiliser le pourcentage restant"
              className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-right font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950"
            />
            <span className="text-xs text-zinc-500">%</span>
          </div>
        </TD>
        <TD className="text-right align-top font-mono text-xs">
          {formatEuro(allocation.currentValue)}
        </TD>
        <TD className="text-right align-top font-mono text-xs text-zinc-500">
          {formatPercent(allocation.currentPct)}
        </TD>
        <TD className="text-right align-top font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          {formatEuro(allocation.contribution)}
        </TD>
        <TD className="text-right align-top font-mono text-xs">
          {formatEuro(allocation.postValue)}
        </TD>
        <TD className="text-right align-top font-mono text-xs text-zinc-500">
          {formatPercent(allocation.postPct)}
          {line.assetIds.length > 0 && (
            <span
              className={cn(
                "ml-1",
                Math.abs(drift) < 0.005
                  ? "text-emerald-500"
                  : drift > 0
                    ? "text-amber-500"
                    : "text-sky-500",
              )}
            >
              {drift > 0.005 ? "↑" : drift < -0.005 ? "↓" : "✓"}
            </span>
          )}
        </TD>
        <TD className="align-top">
          {canRemoveLine && (
            <button
              type="button"
              onClick={onRemoveLine}
              className="rounded-md p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              aria-label="Retirer le panier"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </TD>
      </TR>
      {showSubRows &&
        allocation.sub.map((sub) => {
          const asset = assetMap.get(sub.assetId);
          return (
            <TR
              key={`${line._uid}-sub-${sub.assetId}`}
              className="bg-zinc-50/40 text-zinc-500 dark:bg-zinc-900/30"
            >
              <TD className="pl-8 text-xs">
                <span className="text-zinc-400">↳</span>{" "}
                {asset?.label ?? sub.assetId}
              </TD>
              <TD></TD>
              <TD className="text-right font-mono text-xs">
                {formatEuro(sub.currentValue)}
              </TD>
              <TD></TD>
              <TD className="text-right font-mono text-xs">
                {formatEuro(sub.contribution)}
              </TD>
              <TD className="text-right font-mono text-xs">
                {formatEuro(sub.postValue)}
              </TD>
              <TD className="text-right font-mono text-xs">
                {formatPercent(sub.postPct)}
              </TD>
              <TD></TD>
            </TR>
          );
        })}
    </>
  );
}
