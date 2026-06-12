"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/lib/schema";

type Option = { id: string; label: string };

const TYPES: TransactionType[] = [
  "ACHAT",
  "VENTE",
  "DIVIDENDE",
  "INTERET",
  "TRANSFERT",
  "DEPOT",
  "RETRAIT",
];

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function NewTransactionForm({
  assets,
  accounts,
}: {
  assets: Option[];
  accounts: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(todayIso);
  const [type, setType] = useState<TransactionType>("ACHAT");
  const [compte, setCompte] = useState(accounts[0]?.id ?? "");
  const [compteDestination, setCompteDestination] = useState("");
  const [actif, setActif] = useState(assets[0]?.id ?? "");
  const [quantite, setQuantite] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [devise, setDevise] = useState("EUR");
  const [frais, setFrais] = useState("");
  const [fraisDevise, setFraisDevise] = useState("EUR");
  const [notes, setNotes] = useState("");

  const isTransfert = type === "TRANSFERT";
  const isLoading = busy || pending;

  useEffect(() => {
    if (!isTransfert) setCompteDestination("");
  }, [isTransfert]);

  function reset() {
    setDate(todayIso());
    setType("ACHAT");
    setCompte(accounts[0]?.id ?? "");
    setCompteDestination("");
    setActif(assets[0]?.id ?? "");
    setQuantite("");
    setPrixUnitaire("");
    setDevise("EUR");
    setFrais("");
    setFraisDevise("EUR");
    setNotes("");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const quantiteNum = parseDecimal(quantite);
    if (quantiteNum === null || quantiteNum < 0) {
      setError("Quantité invalide.");
      return;
    }

    const prixNum =
      prixUnitaire.trim() === "" ? null : parseDecimal(prixUnitaire);
    if (prixUnitaire.trim() !== "" && prixNum === null) {
      setError("Prix unitaire invalide.");
      return;
    }

    const fraisNum = frais.trim() === "" ? 0 : parseDecimal(frais);
    if (fraisNum === null || fraisNum < 0) {
      setError("Frais invalides.");
      return;
    }

    if (isTransfert && !compteDestination) {
      setError("Sélectionne un compte de destination.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date,
          type,
          compte,
          compteDestination: compteDestination || undefined,
          actif,
          quantite: quantiteNum,
          prixUnitaire: prixNum,
          devise,
          frais: fraisNum,
          fraisDevise,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Échec de l’ajout");
      }
      reset();
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Nouvelle transaction
        </button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Nouvelle transaction</CardTitle>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Date">
              <input
                type="date"
                value={date}
                max={todayIso()}
                onChange={(e) => setDate(e.target.value)}
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Type">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                className={inputClasses}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Compte">
              <select
                value={compte}
                onChange={(e) => setCompte(e.target.value)}
                className={inputClasses}
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>

            {isTransfert && (
              <Field label="Compte destination">
                <select
                  value={compteDestination}
                  onChange={(e) => setCompteDestination(e.target.value)}
                  className={inputClasses}
                  required
                >
                  <option value="">— Choisir —</option>
                  {accounts
                    .filter((a) => a.id !== compte)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                </select>
              </Field>
            )}

            <Field label="Actif">
              <select
                value={actif}
                onChange={(e) => setActif(e.target.value)}
                className={inputClasses}
                required
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quantité">
              <input
                type="text"
                inputMode="decimal"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                placeholder="0"
                className={inputClasses}
                required
              />
            </Field>

            <Field label="Prix unitaire">
              <input
                type="text"
                inputMode="decimal"
                value={prixUnitaire}
                onChange={(e) => setPrixUnitaire(e.target.value)}
                placeholder="—"
                className={inputClasses}
              />
            </Field>

            <Field label="Devise">
              <select
                value={devise}
                onChange={(e) => setDevise(e.target.value)}
                className={inputClasses}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Frais">
              <input
                type="text"
                inputMode="decimal"
                value={frais}
                onChange={(e) => setFrais(e.target.value)}
                placeholder="0"
                className={inputClasses}
              />
            </Field>

            <Field label="Frais devise">
              <select
                value={fraisDevise}
                onChange={(e) => setFraisDevise(e.target.value)}
                className={inputClasses}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
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

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              disabled={isLoading}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50",
              )}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Ajouter à l’Excel
            </button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
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
