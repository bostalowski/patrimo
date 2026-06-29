"use client";

import { useId, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  FolderOpen,
  Loader2,
  AlertTriangle,
  Upload,
} from "lucide-react";
import { clampInflationRate } from "@/lib/inflation";
import {
  clampSyncIntervalMinutes,
  SYNC_INTERVAL_PRESETS,
} from "@/lib/prices/schedule";

declare global {
  interface Window {
    fingraphs?: {
      isElectron: boolean;
      pickExcelFile: () => Promise<string | null>;
      pickNewExcelLocation: (defaultName?: string) => Promise<string | null>;
    };
  }
}

export type SettingsStatus = {
  excelPath: string | null;
  configured: boolean;
  valid: boolean;
  reason?: "not_found" | "missing_sheets" | "read_error" | "parse_error";
  detail?: string;
};

const REASON_LABELS: Record<NonNullable<SettingsStatus["reason"]>, string> = {
  not_found: "Fichier introuvable",
  missing_sheets: "Onglets manquants",
  read_error: "Erreur de lecture",
  parse_error: "Données invalides",
};

const inputClasses =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono dark:border-zinc-800 dark:bg-zinc-950";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";

type Props = {
  initialStatus: SettingsStatus;
};

function subscribeNoop(): () => void {
  return () => {};
}

function isElectronClient(): boolean {
  return typeof window !== "undefined" && Boolean(window.fingraphs);
}

export function SettingsClient({ initialStatus }: Props) {
  const router = useRouter();
  const manualPathId = useId();
  const isElectron = useSyncExternalStore(
    subscribeNoop,
    isElectronClient,
    () => false,
  );
  const [status, setStatus] = useState<SettingsStatus>(initialStatus);
  const [manualPath, setManualPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function applyResponse(res: Response, successMessage: string) {
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Une erreur est survenue.");
    }
    const next = (await res.json()) as SettingsStatus;
    setStatus(next);
    setSuccess(successMessage);
    setManualPath("");
    router.refresh();
  }

  async function chooseExisting() {
    setError(null);
    setSuccess(null);
    let chosen: string | null = null;
    if (isElectron && window.fingraphs) {
      chosen = await window.fingraphs.pickExcelFile();
      if (!chosen) return;
    } else {
      chosen = manualPath.trim();
      if (!chosen) {
        setError("Indique le chemin absolu du fichier .xlsx.");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ excelPath: chosen }),
      });
      await applyResponse(res, "Fichier source mis à jour.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function createNew() {
    setError(null);
    setSuccess(null);
    let target: string | null = null;
    if (isElectron && window.fingraphs) {
      target = await window.fingraphs.pickNewExcelLocation("Investissement.xlsx");
      if (!target) return;
    } else {
      target = manualPath.trim();
      if (!target) {
        setError("Indique le chemin absolu où créer le fichier.");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch("/api/settings/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ excelPath: target }),
      });
      await applyResponse(res, "Nouveau classeur créé et défini comme source.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <StatusBanner status={status} />

      {status.valid && (
        <Link
          href="/transactions/import"
          className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-800 transition-colors hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 dark:hover:bg-emerald-950/50"
        >
          <span className="flex items-center gap-3">
            <Upload className="h-4 w-4 shrink-0" />
            <span>
              <span className="block font-medium">
                Importer tes transactions depuis un broker
              </span>
              <span className="block text-xs text-emerald-700/80 dark:text-emerald-300/80">
                Trade Republic ou n&apos;importe quel CSV — actifs et comptes
                créés automatiquement.
              </span>
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0" />
        </Link>
      )}

      <div className="space-y-2">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Choisis un fichier <code>.xlsx</code> existant ou crée un nouveau
          classeur vierge structuré avec les 4 onglets requis (Transactions,
          Actifs, Comptes, Budget).
        </p>

        {!isElectron && (
          <div className="space-y-1">
            <label
              htmlFor={manualPathId}
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
            >
              Chemin absolu (mode navigateur)
            </label>
            <input
              id={manualPathId}
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              placeholder="/Users/.../Investissement.xlsx"
              className={inputClasses}
            />
            <p className="text-xs text-zinc-500">
              Dans l&apos;app Mac, un sélecteur de fichier natif s&apos;ouvrira
              à la place.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={chooseExisting}
          disabled={busy}
          className={secondaryButton}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FolderOpen className="h-4 w-4" />
          )}
          Choisir un fichier existant
        </button>
        <button
          type="button"
          onClick={createNew}
          disabled={busy}
          className={primaryButton}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FilePlus2 className="h-4 w-4" />
          )}
          Créer un nouveau fichier
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </p>
      )}
    </div>
  );
}

export function InflationSettings({ initialRate }: { initialRate: number }) {
  const router = useRouter();
  const fieldId = useId();
  const [value, setValue] = useState(
    String(Math.round(initialRate * 1000) / 10),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSuccess(null);
    const parsed = Number(value.replace(",", ".").replace(/\s/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Indique un taux valide (en %).");
      return;
    }
    const rate = clampInflationRate(parsed / 100);
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inflationRate: rate }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Une erreur est survenue.");
      }
      const next = (await res.json()) as { inflationRate?: number };
      if (typeof next.inflationRate === "number") {
        setValue(String(Math.round(next.inflationRate * 1000) / 10));
      }
      setSuccess("Taux d'inflation mis à jour.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Ce taux sert à convertir les montants futurs et la plus-value en euros
        d&apos;aujourd&apos;hui (pouvoir d&apos;achat constant). La cible long
        terme de la BCE est de 2 %.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label
            htmlFor={fieldId}
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Inflation annuelle (%)
          </label>
          <input
            id={fieldId}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-32 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className={primaryButton}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </p>
      )}
    </div>
  );
}

export function SyncIntervalSettings({
  initialMinutes,
}: {
  initialMinutes: number;
}) {
  const router = useRouter();
  const fieldId = useId();
  const [value, setValue] = useState(String(clampSyncIntervalMinutes(initialMinutes)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function save() {
    setError(null);
    setSuccess(null);
    const minutes = clampSyncIntervalMinutes(Number(value));
    setBusy(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ syncIntervalMinutes: minutes }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Une erreur est survenue.");
      }
      const next = (await res.json()) as { syncIntervalMinutes?: number };
      if (typeof next.syncIntervalMinutes === "number") {
        setValue(String(next.syncIntervalMinutes));
      }
      setSuccess("Fréquence de synchronisation mise à jour.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        À quelle fréquence l&apos;application rafraîchit automatiquement les
        cours en arrière-plan. Le bouton « Sync cours » reste disponible pour
        forcer une synchronisation immédiate.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label
            htmlFor={fieldId}
            className="text-xs font-medium uppercase tracking-wider text-zinc-500"
          >
            Fréquence de synchronisation
          </label>
          <select
            id={fieldId}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-48 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            {SYNC_INTERVAL_PRESETS.map((preset) => (
              <option key={preset.minutes} value={preset.minutes}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className={primaryButton}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Enregistrer
        </button>
      </div>
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}
      {success && !error && (
        <p className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </p>
      )}
    </div>
  );
}

function StatusBanner({ status }: { status: SettingsStatus }) {
  if (!status.configured) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
        <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          Aucun fichier configuré
        </div>
        <p className="mt-1 text-amber-700 dark:text-amber-300/80">
          L&apos;app ne peut pas afficher tes données tant qu&apos;aucun fichier
          source n&apos;est défini.
        </p>
      </div>
    );
  }

  if (!status.valid) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm dark:border-rose-900 dark:bg-rose-950/30">
        <div className="flex items-center gap-2 font-medium text-rose-800 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4" />
          {status.reason ? REASON_LABELS[status.reason] : "Fichier invalide"}
        </div>
        <p className="mt-1 break-all font-mono text-xs text-rose-700 dark:text-rose-300/80">
          {status.excelPath}
        </p>
        {status.detail && (
          <p className="mt-1 text-rose-700 dark:text-rose-300/80">
            {status.detail}
          </p>
        )}
        <p className="mt-2 text-rose-700/90 dark:text-rose-300/70">
          Corrige le fichier puis recharge, ou choisis un autre fichier
          ci-dessous.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex items-center gap-2 font-medium text-emerald-800 dark:text-emerald-300">
        <CheckCircle2 className="h-4 w-4" />
        Fichier source configuré
      </div>
      <p className="mt-1 break-all font-mono text-xs text-emerald-700 dark:text-emerald-300/80">
        {status.excelPath}
      </p>
    </div>
  );
}
