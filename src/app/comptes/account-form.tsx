"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Account, Envelope } from "@/lib/schema";

type AccountTypeValue = Account["type"];

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

type Props = {
  accountTypes: readonly AccountTypeValue[];
  envelopes: readonly Envelope[];
  account?: Account;
  trigger?: "primary" | "icon";
};

export function AccountForm({ accountTypes, envelopes, account, trigger = "primary" }: Props) {
  const router = useRouter();
  const isEdit = Boolean(account);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState(account?.label ?? "");
  const [type, setType] = useState<AccountTypeValue>(account?.type ?? accountTypes[0]);
  const [envelope, setEnvelope] = useState<Envelope>(account?.envelope ?? envelopes[0]);
  const [openDate, setOpenDate] = useState(toDateInput(account?.openDate));

  const isLoading = busy || pending;

  function reset() {
    setLabel(account?.label ?? "");
    setType(account?.type ?? accountTypes[0]);
    setEnvelope(account?.envelope ?? envelopes[0]);
    setOpenDate(toDateInput(account?.openDate));
    setError(null);
  }

  function close() {
    setOpen(false);
    setError(null);
    if (!isEdit) reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Le libellé est requis.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/accounts", {
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: account!.id } : {}),
          label: trimmedLabel,
          type,
          envelope,
          openDate: openDate ? new Date(`${openDate}T00:00:00Z`).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? (isEdit ? "Échec de la mise à jour" : "Échec de la création"));
      }
      close();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    if (trigger === "icon") {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Éditer le compte"
          title="Éditer"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      );
    }
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Nouveau compte
        </button>
      </div>
    );
  }

  const card = (
    <Card className={trigger === "icon" ? "w-full max-w-3xl" : undefined}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{isEdit ? `Éditer ${account?.label}` : "Nouveau compte"}</CardTitle>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Libellé" className="sm:col-span-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Kraken"
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountTypeValue)}
                className={inputClasses}
              >
                {accountTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Enveloppe">
              <select
                value={envelope}
                onChange={(e) => setEnvelope(e.target.value as Envelope)}
                className={inputClasses}
              >
                {envelopes.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date d'ouverture" className="sm:col-span-2 lg:col-span-4">
              <input
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                className={inputClasses}
              />
              <span className="text-xs font-normal normal-case tracking-normal text-zinc-400">
                Optionnelle. Sert au calcul fiscal des PEA (5 ans) et AV (8 ans).
              </span>
            </Field>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isLoading}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEdit ? "Mettre à jour" : "Ajouter à l’Excel"}
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );

  if (trigger === "icon") {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-10">
        <button
          type="button"
          aria-label="Fermer"
          onClick={close}
          className="absolute inset-0 cursor-default bg-zinc-950/50"
        />
        <div className="relative z-10 w-full max-w-3xl">{card}</div>
      </div>
    );
  }

  return card;
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
    <div className={cn("flex flex-col gap-1 text-xs", className)}>
      <span className="font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function toDateInput(value: Date | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
