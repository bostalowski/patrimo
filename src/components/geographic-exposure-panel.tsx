"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GeographicWorldMap } from "@/components/geographic-world-map";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { geographicCountryLabel } from "@/lib/geographic-country-label";
import {
  geographicCountryOptions,
  geographicRegionOptions,
} from "@/lib/geographic-key-options";
import { formatEuro, formatPercent } from "@/lib/utils";
import type { GeographicAllocation } from "@patrimo/core/schema";
import {
  aggregateGeographicExposure,
  geographicAllocationGranularity,
  regionLabel,
  type GeographicSlice,
} from "@patrimo/core/geographic-exposure";
import {
  isIncompleteGeographicDraftSum,
  isValidGeographicWeightSum,
  sumGeographicDraftWeightPercents,
} from "@patrimo/core/geographic-allocation";

const primaryButton =
  "rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
const secondaryButton =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200";

type DraftRow = { country: string; weightPercent: string };
type EntryMode = "countries" | "regions";

function emptyDraft(): DraftRow[] {
  return [{ country: "", weightPercent: "" }];
}

function incompleteSumLabel(draft: DraftRow[]): string | null {
  const sum = sumGeographicDraftWeightPercents(
    draft.map((row) => row.weightPercent),
  );
  if (!isIncompleteGeographicDraftSum(sum)) return null;
  return `${Math.round(sum * 10) / 10} % renseignés`;
}

function draftWeightRows(
  draft: DraftRow[],
): Array<{ country: string; weight: number }> {
  return draft
    .filter((row) => row.country.trim() && row.weightPercent.trim())
    .map((row) => ({
      country: row.country.trim().toUpperCase(),
      weight: Number(row.weightPercent.replace(",", ".")) / 100,
    }))
    .filter(
      (row) =>
        row.country &&
        Number.isFinite(row.weight) &&
        row.weight >= 0,
    );
}

function exposureFromDraft(
  assetId: string,
  draft: DraftRow[],
  marketValue: number,
): { countries: GeographicSlice[]; regions: GeographicSlice[] } | null {
  const weights = draftWeightRows(draft);
  if (weights.length === 0) return null;
  const sum = weights.reduce((total, row) => total + row.weight, 0);
  if (!isValidGeographicWeightSum(sum)) return null;

  try {
    geographicAllocationGranularity(weights.map((row) => row.country));
  } catch {
    return null;
  }

  return aggregateGeographicExposure(
    [{ assetId, marketValue: marketValue > 0 ? marketValue : 1 }],
    weights.map((row) => ({
      assetId,
      country: row.country,
      weight: row.weight,
      source: "manual",
    })),
  );
}

function draftFromAllocations(allocations: GeographicAllocation[]): DraftRow[] {
  if (allocations.length === 0) return emptyDraft();
  return allocations.map((row) => ({
    country: row.country,
    weightPercent: String(Math.round(row.weight * 1000) / 10),
  }));
}

function entryModeFromAllocations(
  allocations: GeographicAllocation[],
): EntryMode {
  if (allocations.length === 0) return "countries";
  return geographicAllocationGranularity(allocations.map((row) => row.country)) ===
    "region"
    ? "regions"
    : "countries";
}

function initialDraftsByMode(allocations: GeographicAllocation[]): Record<
  EntryMode,
  DraftRow[]
> {
  const mode = entryModeFromAllocations(allocations);
  const filled = draftFromAllocations(allocations);
  return {
    countries: mode === "countries" ? filled : emptyDraft(),
    regions: mode === "regions" ? filled : emptyDraft(),
  };
}

function SliceList({
  slices,
  labelFor,
}: {
  slices: GeographicSlice[];
  labelFor: (key: string) => string;
}) {
  return (
    <ul className="space-y-1 text-sm">
      {slices.map((slice) => (
        <li
          key={slice.key}
          className="flex items-center justify-between gap-4"
        >
          <span>{labelFor(slice.key)}</span>
          <span className="font-mono text-zinc-600 dark:text-zinc-300">
            {formatEuro(slice.marketValue)} · {formatPercent(slice.weight)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ExposureBody({
  countries,
  regions = [],
  crypto,
  unmapped,
  showMap = true,
}: {
  countries: GeographicSlice[];
  regions?: GeographicSlice[];
  crypto?: { marketValue: number; weight: number } | null;
  unmapped?: { marketValue: number; weight: number } | null;
  showMap?: boolean;
}) {
  const hasGeo = countries.length > 0 || regions.length > 0;

  if (!hasGeo && !crypto && !unmapped) {
    return (
      <p className="text-sm text-zinc-500">
        Aucune répartition disponible pour les positions liquides.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {crypto && (
        <ul className="space-y-1 text-sm">
          <li className="flex items-center justify-between gap-4">
            <span>Crypto</span>
            <span className="font-mono text-zinc-600 dark:text-zinc-300">
              {formatEuro(crypto.marketValue)} · {formatPercent(crypto.weight)}
            </span>
          </li>
        </ul>
      )}
      {hasGeo ? (
        <>
          {countries.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Pays
              </p>
              {showMap && <GeographicWorldMap countries={countries} />}
              <SliceList slices={countries} labelFor={geographicCountryLabel} />
            </div>
          )}
          {regions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                Régions
              </p>
              <SliceList slices={regions} labelFor={regionLabel} />
            </div>
          )}
        </>
      ) : (
        !unmapped && (
          <p className="text-sm text-zinc-500">
            Aucune répartition géographique pour les positions couvertes.
          </p>
        )
      )}
      {unmapped && (
        <ul className="space-y-1 text-sm">
          <li className="flex items-center justify-between gap-4">
            <span>Non renseigné</span>
            <span className="font-mono text-zinc-600 dark:text-zinc-300">
              {formatEuro(unmapped.marketValue)} ·{" "}
              {formatPercent(unmapped.weight)}
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}

export function GeographicExposurePanel({
  title,
  countries,
  regions = [],
  crypto,
  unmapped,
  showMap = true,
}: {
  title: string;
  regions?: GeographicSlice[];
  countries: GeographicSlice[];
  crypto?: { marketValue: number; weight: number } | null;
  unmapped?: { marketValue: number; weight: number } | null;
  showMap?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        <ExposureBody
          countries={countries}
          regions={regions}
          crypto={crypto}
          unmapped={unmapped}
          showMap={showMap}
        />
      </CardBody>
    </Card>
  );
}

export function AssetGeographicSection({
  assetId,
  assetLabel,
  hasIsin = false,
  allocations,
  marketValue = 0,
  regions = [],
  countries,
}: {
  assetId: string;
  assetLabel: string;
  hasIsin?: boolean;
  allocations: GeographicAllocation[];
  marketValue?: number;
  regions?: GeographicSlice[];
  countries: GeographicSlice[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<EntryMode>(() =>
    entryModeFromAllocations(allocations),
  );
  const [draftByMode, setDraftByMode] = useState(() =>
    initialDraftsByMode(allocations),
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [localAllocations, setLocalAllocations] =
    useState<GeographicAllocation[]>(allocations);
  const draft = draftByMode[mode];
  const draftExposure = exposureFromDraft(assetId, draft, marketValue);
  const shownCountries = draftExposure?.countries ?? countries;
  const shownRegions = draftExposure?.regions ?? regions;
  const hasExposure =
    shownCountries.length > 0 || shownRegions.length > 0;

  function applyAllocations(next: GeographicAllocation[]) {
    setLocalAllocations(next);
    setMode(entryModeFromAllocations(next));
    setDraftByMode(initialDraftsByMode(next));
  }

  async function saveManual() {
    setPending(true);
    setError(null);
    setInfo(null);
    try {
      const weights = draftWeightRows(draft);
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
      applyAllocations(
        weights.map((row) => ({
          assetId,
          country: row.country,
          weight: row.weight,
          source: "manual" as const,
        })),
      );
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
    setInfo(null);
    try {
      const response = await fetch("/api/geography/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetId, restore }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        updated?: boolean;
        skippedManual?: boolean;
        allocations?: GeographicAllocation[];
      } | null;
      if (!response.ok) {
        throw new Error(body?.error ?? "Sync JustETF impossible");
      }
      if (body?.skippedManual) {
        setInfo(
          "Répartition manuelle conservée. Utilise « Rétablir depuis JustETF » pour écraser.",
        );
        return;
      }
      if (body?.allocations) {
        applyAllocations(body.allocations);
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
        {hasExposure ? (
          <ExposureBody countries={shownCountries} regions={shownRegions} />
        ) : (
          <p className="text-sm text-zinc-500">
            Aucune répartition géographique renseignée pour {assetLabel}.
          </p>
        )}
        {hasIsin && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primaryButton}
              disabled={pending}
              onClick={() => void syncJustEtf(false)}
            >
              {localAllocations.length === 0
                ? "Récupérer depuis JustETF"
                : "Sync JustETF"}
            </button>
            {localAllocations.length > 0 && (
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
          mode={mode}
          onModeChange={setMode}
          draft={draft}
          onChange={(next) =>
            setDraftByMode((previous) => ({ ...previous, [mode]: next }))
          }
          onSave={() => void saveManual()}
          pending={pending}
          error={error}
          info={info}
        />
      </CardBody>
    </Card>
  );
}

function ManualWeightEditor({
  mode,
  onModeChange,
  draft,
  onChange,
  onSave,
  pending,
  error,
  info,
}: {
  mode: "countries" | "regions";
  onModeChange: (mode: "countries" | "regions") => void;
  draft: Array<{ country: string; weightPercent: string }>;
  onChange: (next: Array<{ country: string; weightPercent: string }>) => void;
  onSave: () => void;
  pending: boolean;
  error: string | null;
  info: string | null;
}) {
  const keyOptions =
    mode === "regions"
      ? geographicRegionOptions()
      : geographicCountryOptions();
  const sumLabel = incompleteSumLabel(draft);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={mode === "countries" ? primaryButton : secondaryButton}
          onClick={() => onModeChange("countries")}
        >
          Pays
        </button>
        <button
          type="button"
          className={mode === "regions" ? primaryButton : secondaryButton}
          onClick={() => onModeChange("regions")}
        >
          Régions
        </button>
      </div>
      <p className="text-sm font-medium">
        Saisie manuelle ({mode === "regions" ? "régions" : "pays"} + %)
      </p>
      {draft.map((row, index) => (
        <div key={index} className="flex gap-2">
          <select
            aria-label={`Clé géographique ${index + 1}`}
            className="min-w-0 flex-1 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            value={row.country}
            onChange={(event) => {
              const next = [...draft];
              next[index] = { ...row, country: event.target.value };
              onChange(next);
            }}
          >
            <option value="">Choisir…</option>
            {keyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
      {sumLabel && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{sumLabel}</p>
      )}
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
      {info && <p className="text-sm text-zinc-600 dark:text-zinc-300">{info}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
