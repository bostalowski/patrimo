"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import type { Asset, DcaConfig } from "@/lib/schema";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { DcaConfigCard } from "./dca-config-card";

type Draft = { config: DcaConfig; isDraft: true };
type Saved = { config: DcaConfig; isDraft: false };
type Item = Draft | Saved;

type Props = {
  configs: DcaConfig[];
  portfolioByEnvelope: Record<string, Record<string, number>>;
  assets: Asset[];
  seedConfig: DcaConfig | null;
};

function makeDraft(): DcaConfig {
  return {
    id: `dca-${Date.now()}`,
    label: "Nouveau plan",
    envelope: "PEA",
    monthlyAmount: 200,
    lines: [{ label: undefined, assetIds: [], targetPct: 1 }],
  };
}

export function DcaPlanner({
  configs,
  portfolioByEnvelope,
  assets,
  seedConfig,
}: Props) {
  const [drafts, setDrafts] = useState<DcaConfig[]>([]);

  const items: Item[] = [
    ...configs.map((config) => ({ config, isDraft: false as const })),
    ...drafts.map((config) => ({ config, isDraft: true as const })),
  ];

  const showSeed =
    configs.length === 0 && drafts.length === 0 && seedConfig !== null;

  function addDraft(seed?: DcaConfig) {
    setDrafts((current) => [...current, seed ?? makeDraft()]);
  }

  function removeDraft(id: string) {
    setDrafts((current) => current.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => addDraft()}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Nouveau plan
        </button>
      </div>

      {showSeed && seedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Démarrer avec un preset PEA
            </CardTitle>
          </CardHeader>
          <CardBody className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">
              75% MSCI World ({seedConfig.lines[0].assetIds.join(", ")}) +
              25% Émergents ({seedConfig.lines[1].assetIds.join(", ")}), 500
              €/mois. Modifiable après — tu peux ajouter un 2e ETF dans le
              panier &laquo;&nbsp;Mondes&nbsp;&raquo;.
            </p>
            <button
              type="button"
              onClick={() => addDraft(seedConfig)}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
            >
              Utiliser ce preset
            </button>
          </CardBody>
        </Card>
      )}

      {items.length === 0 && !showSeed && (
        <Card>
          <CardBody>
            <p className="py-6 text-center text-sm text-zinc-500">
              Aucun plan DCA. Clique sur <strong>Nouveau plan</strong> pour
              démarrer.
            </p>
          </CardBody>
        </Card>
      )}

      {items.map((item) => (
        <DcaConfigCard
          key={`${item.isDraft ? "draft" : "saved"}-${item.config.id}`}
          initialConfig={item.config}
          isDraft={item.isDraft}
          assets={assets}
          portfolioByEnvelope={portfolioByEnvelope}
          onDraftDiscarded={() => removeDraft(item.config.id)}
          onDraftSaved={
            item.isDraft ? () => removeDraft(item.config.id) : undefined
          }
        />
      ))}
    </div>
  );
}
