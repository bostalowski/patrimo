"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  BudgetCategory,
  BudgetFrequency,
  BudgetKind,
  BudgetLine,
} from "@/lib/schema";
import {
  CATEGORY_LABELS,
  DEPENSE_CATEGORIES,
  EPARGNE_CATEGORIES,
  FREQUENCY_LABELS,
  REVENU_CATEGORIES,
} from "@/lib/budget";

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

const FREQUENCIES: BudgetFrequency[] = ["MENSUEL", "TRIMESTRIEL", "ANNUEL"];

type Props = {
  line?: BudgetLine;
  defaultKind?: BudgetKind;
  trigger?: "primary" | "icon";
};

function parseDecimal(value: string): number {
  const normalised = value.trim().replace(",", ".").replace(/\s/g, "");
  const n = Number(normalised);
  return Number.isFinite(n) ? n : NaN;
}

function categoriesFor(kind: BudgetKind): BudgetCategory[] {
  if (kind === "REVENU") return REVENU_CATEGORIES;
  if (kind === "EPARGNE") return EPARGNE_CATEGORIES;
  return DEPENSE_CATEGORIES;
}

function defaultCategoryFor(kind: BudgetKind): BudgetCategory {
  return categoriesFor(kind)[0];
}

export function BudgetForm({ line, defaultKind = "REVENU", trigger = "primary" }: Props) {
  const router = useRouter();
  const isEdit = Boolean(line);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initialKind = line?.kind ?? defaultKind;
  const [label, setLabel] = useState(line?.label ?? "");
  const [kind, setKind] = useState<BudgetKind>(initialKind);
  const [amount, setAmount] = useState(line ? String(line.amount) : "");
  const [frequency, setFrequency] = useState<BudgetFrequency>(line?.frequency ?? "MENSUEL");
  const [category, setCategory] = useState<BudgetCategory>(
    line?.category ?? defaultCategoryFor(initialKind),
  );
  const [notes, setNotes] = useState(line?.notes ?? "");

  const isLoading = busy || pending;
  const availableCategories = categoriesFor(kind);

  function reset() {
    setLabel(line?.label ?? "");
    setKind(initialKind);
    setAmount(line ? String(line.amount) : "");
    setFrequency(line?.frequency ?? "MENSUEL");
    setCategory(line?.category ?? defaultCategoryFor(initialKind));
    setNotes(line?.notes ?? "");
    setError(null);
  }

  function close() {
    setOpen(false);
    setError(null);
    if (!isEdit) reset();
  }

  function handleKindChange(next: BudgetKind) {
    setKind(next);
    const nextCategories = categoriesFor(next);
    if (!nextCategories.includes(category)) {
      setCategory(nextCategories[0]);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Le libellé est requis.");
      return;
    }
    const parsedAmount = parseDecimal(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Le montant doit être un nombre supérieur à 0.");
      return;
    }

    setBusy(true);
    try {
      const id = line?.id ?? crypto.randomUUID();
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          label: trimmedLabel,
          kind,
          amount: parsedAmount,
          frequency,
          category,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(
          body?.error ?? (isEdit ? "Échec de la mise à jour" : "Échec de la création"),
        );
      }
      close();
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!line) return;
    if (!window.confirm(`Supprimer « ${line.label} » ?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/budget", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: line.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Échec de la suppression");
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
          aria-label="Éditer la ligne"
          title="Éditer"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      );
    }
    const buttonLabel =
      defaultKind === "REVENU"
        ? "Nouveau revenu"
        : defaultKind === "EPARGNE"
          ? "Nouvelle épargne"
          : "Nouvelle dépense";
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
      >
        <Plus className="h-4 w-4" />
        {buttonLabel}
      </button>
    );
  }

  const title = isEdit
    ? `Éditer ${line?.label}`
    : kind === "REVENU"
      ? "Nouveau revenu"
      : kind === "EPARGNE"
        ? "Nouvelle épargne"
        : "Nouvelle dépense";

  const card = (
    <Card className={trigger === "icon" ? "w-full max-w-3xl" : undefined}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
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
            <Field label="Type">
              <select
                value={kind}
                onChange={(e) => handleKindChange(e.target.value as BudgetKind)}
                className={inputClasses}
              >
                <option value="REVENU">Revenu</option>
                <option value="DEPENSE">Dépense</option>
                <option value="EPARGNE">Épargne / Investissement</option>
              </select>
            </Field>

            <Field label="Libellé" className="sm:col-span-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={
                  kind === "REVENU"
                    ? "Salaire net"
                    : kind === "EPARGNE"
                      ? "PEA, Livret A, Bitcoin..."
                      : "Loyer"
                }
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Catégorie">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BudgetCategory)}
                className={inputClasses}
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Montant (€)">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1200"
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Fréquence">
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BudgetFrequency)}
                className={inputClasses}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Notes" className="sm:col-span-2">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optionnel"
                className={inputClasses}
              />
            </Field>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-2">
            {isEdit ? (
              <button
                type="button"
                onClick={remove}
                disabled={isLoading}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-rose-950/30"
              >
                Supprimer
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
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
                {isEdit ? "Mettre à jour" : "Ajouter"}
              </button>
            </div>
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
