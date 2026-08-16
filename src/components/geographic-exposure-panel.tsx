"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AllocationDonut } from "@/components/charts/allocation-donut";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatEuro, formatPercent } from "@/lib/utils";
import type { GeographicAllocation } from "@patrimo/core/schema";
import {
  regionLabel,
  type GeographicSlice,
} from "@patrimo/core/geographic-exposure";

const primaryButton =
  "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const secondaryButton =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200";

function slicesToDonut(slices: GeographicSlice[]) {
  return slices.map((slice) => ({
    name: regionLabel(slice.key),
    value: slice.marketValue,
  }));
}

function ExposureBody({
  regions,
  countries,
}: {
  regions: GeographicSlice[];
  countries: GeographicSlice[];
}) {
  const preferred = regions.length > 0 ? regions : countries;
  const donutData = slicesToDonut(preferred);
  if (donutData.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucune répartition géographique pour les positions couvertes.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <AllocationDonut data={donutData} />
      <ul className="space-y-1 text-sm">
        {preferred.map((slice) => (
          <li
            key={slice.key}
            className="flex items-center justify-between gap-4"
          >
            <span>
              {regions.length > 0 ? regionLabel(slice.key) : slice.key}
            </span>
            <span className="font-mono text-zinc-600 dark:text-zinc-300">
              {formatEuro(slice.marketValue)} · {formatPercent(slice.weight)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GeographicExposurePanel({
  title,
  regions,
  countries,
}: {
  title: string;
  regions: GeographicSlice[];
  countries: GeographicSlice[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <ExposureBody regions={regions} countries={countries} />
      </CardBody>
    </Card>
  );
}

export function AssetGeographicSection({
  assetId,
  assetLabel,
  hasIsin,
  allocations,
  regions,
  countries,
}: {
  assetId: string;
  assetLabel: string;
  hasIsin: boolean;
  allocations: GeographicAllocation[];
  regions: GeographicSlice[];
  countries: GeographicSlice[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(
    allocations.length > 0
      ? allocations.map((row) => ({
          country: row.country,
          weightPercent: String(Math.round(row.weight * 1000) / 10),
        }))
      : [{ country: "", weightPercent: "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveManual() {
    setPending(true);
    setError(null);
    try {
      const weights = draft
        .filter((row) => row.country.trim() && row.weightPercent.trim())
        .map((row) => ({
          country: row.country.trim().toUpperCase(),
          weight: Number(row.weightPercent.replace(",", ".")) / 100,
        }));
      const response = await fetch("/api/geography", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId,
          source: "manual",
          weights,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Enregistrement impossible");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPending(false);
    }
  }

  async function syncJustEtf(restore = false) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/geography/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, restore }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Sync JustETF impossible");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition géographique</CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {allocations.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aucune répartition géographique renseignée pour {assetLabel}.
          </p>
        ) : (
          <ExposureBody regions={regions} countries={countries} />
        )}
        {hasIsin && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButton}
              disabled={pending}
              onClick={() => void syncJustEtf(false)}
            >
              {allocations.length === 0
                ? "Récupérer depuis JustETF"
                : "Sync JustETF"}
            </button>
            {allocations.length > 0 && (
              <button
                type="button"
                className={secondaryButton}
                disabled={pending}
                onClick={() => void syncJustEtf(true)}
              >
                Rétablir depuis JustETF
              </button>
            )}
          </div>
        )}
        <ManualWeightEditor
          draft={draft}
          onChange={setDraft}
          onSave={() => void saveManual()}
          pending={pending}
          error={error}
        />
      </CardBody>
    </Card>
  );
}

function ManualWeightEditor({
  draft,
  onChange,
  onSave,
  pending,
  error,
}: {
  draft: Array<{ country: string; weightPercent: string }>;
  onChange: (next: Array<{ country: string; weightPercent: string }>) => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Saisie manuelle (pays ISO + %)</p>
      {draft.map((row, index) => (
        <div key={index} className="flex gap-2">
          <input
            className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="US"
            value={row.country}
            onChange={(event) => {
              const next = [...draft];
              next[index] = { ...row, country: event.target.value };
              onChange(next);
            }}
          />
          <input
            className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="70"
            value={row.weightPercent}
            onChange={(event) => {
              const next = [...draft];
              next[index] = { ...row, weightPercent: event.target.value };
              onChange(next);
            }}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButton}
          onClick={() =>
            onChange([...draft, { country: "", weightPercent: "" }])
          }
        >
          Ajouter une ligne
        </button>
        <button
          type="button"
          className={primaryButton}
          disabled={pending}
          onClick={onSave}
        >
          Enregistrer
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
