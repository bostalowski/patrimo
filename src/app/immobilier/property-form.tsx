"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Detention, Property, PropertyRegime } from "@/lib/schema";

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

const REGIME_LABELS: Record<PropertyRegime, string> = {
  IR_REEL: "Revenus fonciers (régime réel)",
  IR_MICRO: "Revenus fonciers (micro-foncier)",
  IS: "Impôt sur les sociétés (IS)",
  RESIDENCE_PRINCIPALE: "Résidence principale / usage perso",
};

const DETENTION_LABELS: Record<Detention, string> = {
  SCI: "SCI",
  DIRECT: "En direct (nom propre)",
};

const REGIMES_BY_DETENTION: Record<Detention, PropertyRegime[]> = {
  SCI: ["IR_REEL", "IR_MICRO", "IS"],
  DIRECT: ["IR_REEL", "IR_MICRO", "RESIDENCE_PRINCIPALE"],
};

const TMI_OPTIONS = [0, 0.11, 0.3, 0.41, 0.45];

type Props = {
  property?: Property;
  trigger?: "primary" | "icon";
};

function pct(value: number | undefined): string {
  if (value === undefined) return "";
  return String(Math.round(value * 10000) / 100);
}

function toDateInput(value: Date | string | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function PropertyForm({ property, trigger = "primary" }: Props) {
  const router = useRouter();
  const isEdit = Boolean(property);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState(property?.label ?? "");
  const [detention, setDetention] = useState<Detention>(
    property?.detention ?? "SCI",
  );
  const [regime, setRegime] = useState<PropertyRegime>(
    property?.regime ?? "IR_REEL",
  );
  const [partDetenue, setPartDetenue] = useState(pct(property?.partDetenue ?? 1));
  const [dateAcquisition, setDateAcquisition] = useState(
    toDateInput(property?.dateAcquisition),
  );
  const [prixAchat, setPrixAchat] = useState(numStr(property?.prixAchat));
  const [fraisNotaire, setFraisNotaire] = useState(numStr(property?.fraisNotaire));
  const [travaux, setTravaux] = useState(numStr(property?.travaux));
  const [valeurActuelle, setValeurActuelle] = useState(
    numStr(property?.valeurActuelle),
  );
  const [revaloAnnuelle, setRevaloAnnuelle] = useState(
    pct(property?.revaloAnnuelle ?? 0.01),
  );
  const [montantEmprunte, setMontantEmprunte] = useState(
    numStr(property?.montantEmprunte),
  );
  const [tauxCredit, setTauxCredit] = useState(pct(property?.tauxCredit));
  const [dureeMois, setDureeMois] = useState(numStr(property?.dureeMois));
  const [dateDebutCredit, setDateDebutCredit] = useState(
    toDateInput(property?.dateDebutCredit),
  );
  const [tauxAssurance, setTauxAssurance] = useState(
    pct(property?.tauxAssurance ?? 0.003),
  );
  const [loyerMensuelHC, setLoyerMensuelHC] = useState(
    numStr(property?.loyerMensuelHC),
  );
  const [chargesNonRecup, setChargesNonRecup] = useState(
    numStr(property?.chargesNonRecupAnnuelles),
  );
  const [taxeFonciere, setTaxeFonciere] = useState(numStr(property?.taxeFonciere));
  const [vacancePct, setVacancePct] = useState(pct(property?.vacancePct ?? 0));
  const [fraisGestionPct, setFraisGestionPct] = useState(
    pct(property?.fraisGestionPct ?? 0),
  );
  const [tmiAssocie, setTmiAssocie] = useState(
    String(property?.tmiAssocie ?? 0.3),
  );
  const [partAmortissable, setPartAmortissable] = useState(
    pct(property?.partAmortissable ?? 0.85),
  );
  const [dureeAmortissement, setDureeAmortissement] = useState(
    numStr(property?.dureeAmortissement ?? 30),
  );
  const [notes, setNotes] = useState(property?.notes ?? "");

  const isResidence = regime === "RESIDENCE_PRINCIPALE";
  const isIR = regime === "IR_REEL" || regime === "IR_MICRO";
  const isLoading = busy || pending;

  function changeDetention(next: Detention) {
    setDetention(next);
    if (!REGIMES_BY_DETENTION[next].includes(regime)) {
      setRegime(REGIMES_BY_DETENTION[next][0]);
    }
  }

  function close() {
    setOpen(false);
    setError(null);
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
      const res = await fetch("/api/properties", {
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: property!.id } : {}),
          label: trimmedLabel,
          detention,
          regime,
          partDetenue: parsePct(partDetenue, 1),
          dateAcquisition: toIso(dateAcquisition),
          prixAchat: parseNum(prixAchat),
          fraisNotaire: parseNum(fraisNotaire),
          travaux: parseNum(travaux),
          valeurActuelle: parseNum(valeurActuelle),
          revaloAnnuelle: parsePct(revaloAnnuelle, 0),
          montantEmprunte: parseNum(montantEmprunte),
          tauxCredit: parsePct(tauxCredit, 0),
          dureeMois: Math.round(parseNum(dureeMois)),
          dateDebutCredit: toIso(dateDebutCredit),
          tauxAssurance: parsePct(tauxAssurance, 0),
          loyerMensuelHC: parseNum(loyerMensuelHC),
          chargesNonRecupAnnuelles: parseNum(chargesNonRecup),
          taxeFonciere: parseNum(taxeFonciere),
          vacancePct: parsePct(vacancePct, 0),
          fraisGestionPct: parsePct(fraisGestionPct, 0),
          tmiAssocie: Number(tmiAssocie),
          partAmortissable: parsePct(partAmortissable, 0.85),
          dureeAmortissement: parseNum(dureeAmortissement) || 30,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ??
            (isEdit ? "Échec de la mise à jour" : "Échec de la création"),
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

  if (!open) {
    if (trigger === "icon") {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          aria-label="Éditer le bien"
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
          Nouveau bien
        </button>
      </div>
    );
  }

  const card = (
    <Card className="w-full max-w-4xl">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{isEdit ? `Éditer ${property?.label}` : "Nouveau bien"}</CardTitle>
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
        <form onSubmit={submit} className="space-y-6">
          <Section title="Identité">
            <Field label="Libellé" className="sm:col-span-2">
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Appartement Lyon"
                className={inputClasses}
                required
              />
            </Field>
            <Field label="Détention">
              <select
                value={detention}
                onChange={(e) => changeDetention(e.target.value as Detention)}
                className={inputClasses}
              >
                {(Object.keys(DETENTION_LABELS) as Detention[]).map((d) => (
                  <option key={d} value={d}>
                    {DETENTION_LABELS[d]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Régime fiscal">
              <select
                value={regime}
                onChange={(e) => setRegime(e.target.value as PropertyRegime)}
                className={inputClasses}
              >
                {REGIMES_BY_DETENTION[detention].map((r) => (
                  <option key={r} value={r}>
                    {REGIME_LABELS[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Part détenue (%)">
              <input
                type="text"
                inputMode="decimal"
                value={partDetenue}
                onChange={(e) => setPartDetenue(e.target.value)}
                placeholder="100"
                className={inputClasses}
              />
            </Field>
            <Field label="Date d'acquisition">
              <input
                type="date"
                value={dateAcquisition}
                onChange={(e) => setDateAcquisition(e.target.value)}
                className={inputClasses}
              />
            </Field>
          </Section>

          <Section title="Acquisition">
            <Field label="Prix d'achat (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={prixAchat}
                onChange={(e) => setPrixAchat(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Frais de notaire (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={fraisNotaire}
                onChange={(e) => setFraisNotaire(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Travaux (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={travaux}
                onChange={(e) => setTravaux(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Valeur actuelle (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={valeurActuelle}
                onChange={(e) => setValeurActuelle(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Revalorisation annuelle (%)">
              <input
                type="text"
                inputMode="decimal"
                value={revaloAnnuelle}
                onChange={(e) => setRevaloAnnuelle(e.target.value)}
                placeholder="1"
                className={inputClasses}
              />
            </Field>
          </Section>

          <Section title="Crédit">
            <Field label="Montant emprunté (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={montantEmprunte}
                onChange={(e) => setMontantEmprunte(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Taux crédit (%)">
              <input
                type="text"
                inputMode="decimal"
                value={tauxCredit}
                onChange={(e) => setTauxCredit(e.target.value)}
                placeholder="3.5"
                className={inputClasses}
              />
            </Field>
            <Field label="Durée (mois)">
              <input
                type="text"
                inputMode="decimal"
                value={dureeMois}
                onChange={(e) => setDureeMois(e.target.value)}
                placeholder="240"
                className={inputClasses}
              />
            </Field>
            <Field label="Date début crédit">
              <input
                type="date"
                value={dateDebutCredit}
                onChange={(e) => setDateDebutCredit(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Taux assurance (%)">
              <input
                type="text"
                inputMode="decimal"
                value={tauxAssurance}
                onChange={(e) => setTauxAssurance(e.target.value)}
                placeholder="0.3"
                className={inputClasses}
              />
            </Field>
          </Section>

          {!isResidence && (
          <Section title="Location">
            <Field label="Loyer mensuel HC (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={loyerMensuelHC}
                onChange={(e) => setLoyerMensuelHC(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Charges non récup. / an (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={chargesNonRecup}
                onChange={(e) => setChargesNonRecup(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Taxe foncière / an (EUR)">
              <input
                type="text"
                inputMode="decimal"
                value={taxeFonciere}
                onChange={(e) => setTaxeFonciere(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field label="Vacance locative (%)">
              <input
                type="text"
                inputMode="decimal"
                value={vacancePct}
                onChange={(e) => setVacancePct(e.target.value)}
                placeholder="5"
                className={inputClasses}
              />
            </Field>
            <Field label="Frais de gestion (%)">
              <input
                type="text"
                inputMode="decimal"
                value={fraisGestionPct}
                onChange={(e) => setFraisGestionPct(e.target.value)}
                placeholder="7"
                className={inputClasses}
              />
            </Field>
          </Section>
          )}

          <Section title="Fiscalité">
            {isIR && (
              <Field label="TMI du foyer">
                <select
                  value={tmiAssocie}
                  onChange={(e) => setTmiAssocie(e.target.value)}
                  className={inputClasses}
                >
                  {TMI_OPTIONS.map((tmi) => (
                    <option key={tmi} value={String(tmi)}>
                      {Math.round(tmi * 100)} %
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {regime === "IS" && (
              <>
                <Field label="Part amortissable (%)">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={partAmortissable}
                    onChange={(e) => setPartAmortissable(e.target.value)}
                    placeholder="85"
                    className={inputClasses}
                  />
                </Field>
                <Field label="Durée amortissement (ans)">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dureeAmortissement}
                    onChange={(e) => setDureeAmortissement(e.target.value)}
                    placeholder="30"
                    className={inputClasses}
                  />
                </Field>
              </>
            )}
            <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClasses}
              />
            </Field>
          </Section>

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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-10">
      <button
        type="button"
        aria-label="Fermer"
        onClick={close}
        className="absolute inset-0 cursor-default bg-zinc-950/50"
      />
      <div className="relative z-10 w-full max-w-4xl">{card}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
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

function numStr(value: number | undefined): string {
  if (value === undefined || value === 0) return "";
  return String(value);
}

function parseNum(value: string): number {
  const n = Number(value.replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parsePct(value: string, fallback: number): number {
  if (value.trim() === "") return fallback;
  const n = parseNum(value);
  return n / 100;
}

function toIso(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00Z`).toISOString() : undefined;
}
