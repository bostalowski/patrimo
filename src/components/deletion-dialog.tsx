"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { DeletionImpact } from "@patrimo/core/deletion";

export type { DeletionImpact } from "@patrimo/core/deletion";

type Props = {
  kind: "account" | "asset";
  id: string;
  label: string;
  impact: DeletionImpact;
  redirectTo?: string;
};

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function DeletionDialog({
  kind,
  id,
  label,
  impact,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"cascade" | "detach">("cascade");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAccount = kind === "account";
  const isEmptyAccount = isAccount && impact.transactionCount === 0;

  async function confirmDeletion() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        isAccount ? "/api/accounts" : "/api/assets",
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id,
            ...(isAccount ? { mode: isEmptyAccount ? "cascade" : mode } : {}),
          }),
        },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Échec de la suppression");
      }

      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center rounded-md p-1 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
        aria-label={isAccount ? "Supprimer le compte" : "Supprimer l'actif"}
        title="Supprimer"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Supprimer {label} ?
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Cette action est irréversible et modifie le fichier Excel source.
            </p>

            {!isEmptyAccount && (
              <div className="mt-4 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <p>
                  {countLabel(
                    impact.transactionCount,
                    "transaction",
                    "transactions",
                  )}
                </p>
                {impact.assetCount > 0 && (
                  <p>
                    {countLabel(impact.assetCount, "actif", "actifs")}
                  </p>
                )}
                {impact.priceCount > 0 && (
                  <p>
                    {countLabel(
                      impact.priceCount,
                      "historique de prix",
                      "historiques de prix",
                    )}
                  </p>
                )}
                {impact.investmentPlanCount > 0 && (
                  <p>
                    {countLabel(
                      impact.investmentPlanCount,
                      "plan d’investissement",
                      "plans d’investissement",
                    )}
                  </p>
                )}
              </div>
            )}

            {isAccount && !isEmptyAccount && (
              <fieldset className="mt-5 space-y-3">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <input
                    type="radio"
                    name={`delete-mode-${id}`}
                    value="cascade"
                    checked={mode === "cascade"}
                    onChange={() => setMode("cascade")}
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Supprimer les données liées
                    </span>
                    <span className="block text-xs text-zinc-500">
                      Supprime les transactions et les actifs devenus inutilisés.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <input
                    type="radio"
                    name={`delete-mode-${id}`}
                    value="detach"
                    checked={mode === "detach"}
                    onChange={() => setMode("detach")}
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Rattacher à Aucun compte
                    </span>
                    <span className="block text-xs text-zinc-500">
                      Conserve les transactions, actifs et valeurs dans le patrimoine.
                    </span>
                  </span>
                </label>
              </fieldset>
            )}

            {error && (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeletion}
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
