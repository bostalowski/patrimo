"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/lib/schema";

export type Option = { id: string; label: string };
export type TxAccountOption = { id: string; label: string; envelope?: string };

const LIVRET_TX_TYPES: TransactionType[] = ["DEPOT", "RETRAIT"];

export const TX_TYPES: TransactionType[] = [
  "ACHAT",
  "VENTE",
  "DIVIDENDE",
  "INTERET",
  "TRANSFERT",
  "DEPOT",
  "RETRAIT",
];

export const TX_CURRENCIES = ["EUR", "USD", "GBP", "CHF"];

export const txInputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

export type TxFormValue = {
  date: string;
  type: TransactionType;
  compte: string;
  compteDestination: string;
  actif: string;
  quantite: string;
  prixUnitaire: string;
  devise: string;
  frais: string;
  fraisDevise: string;
  notes: string;
};

export type TxPayload = {
  date: string;
  type: TransactionType;
  compte: string;
  compteDestination?: string;
  actif: string;
  quantite: number;
  prixUnitaire: number | null;
  devise: string;
  frais: number;
  fraisDevise: string;
  notes?: string;
};

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyTxValue(
  accounts: Option[],
  assets: Option[],
): TxFormValue {
  return {
    date: todayIso(),
    type: "ACHAT",
    compte: accounts[0]?.id ?? "",
    compteDestination: "",
    actif: assets[0]?.id ?? "",
    quantite: "",
    prixUnitaire: "",
    devise: "EUR",
    frais: "",
    fraisDevise: "EUR",
    notes: "",
  };
}

function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function validateTxValue(
  value: TxFormValue,
): { ok: true; payload: TxPayload } | { ok: false; error: string } {
  const quantiteNum = parseDecimal(value.quantite);
  if (quantiteNum === null || quantiteNum < 0) {
    return { ok: false, error: "Quantité invalide." };
  }

  const prixNum =
    value.prixUnitaire.trim() === "" ? null : parseDecimal(value.prixUnitaire);
  if (value.prixUnitaire.trim() !== "" && prixNum === null) {
    return { ok: false, error: "Prix unitaire invalide." };
  }

  const fraisNum = value.frais.trim() === "" ? 0 : parseDecimal(value.frais);
  if (fraisNum === null || fraisNum < 0) {
    return { ok: false, error: "Frais invalides." };
  }

  if (value.type === "TRANSFERT" && !value.compteDestination) {
    return { ok: false, error: "Sélectionne un compte de destination." };
  }

  return {
    ok: true,
    payload: {
      date: value.date,
      type: value.type,
      compte: value.compte,
      compteDestination:
        value.type === "TRANSFERT" ? value.compteDestination : undefined,
      actif: value.actif,
      quantite: quantiteNum,
      prixUnitaire: prixNum,
      devise: value.devise,
      frais: fraisNum,
      fraisDevise: value.fraisDevise,
      notes: value.notes.trim() || undefined,
    },
  };
}

export function TransactionFields({
  value,
  onChange,
  accounts,
  assets,
}: {
  value: TxFormValue;
  onChange: (patch: Partial<TxFormValue>) => void;
  accounts: TxAccountOption[];
  assets: Option[];
}) {
  const selectedAccount = accounts.find((a) => a.id === value.compte);
  const isLivret = selectedAccount?.envelope === "LIVRET";
  const isTransfert = value.type === "TRANSFERT";

  useEffect(() => {
    if (!isLivret) return;
    const patch: Partial<TxFormValue> = {};
    if (value.actif !== "") patch.actif = "";
    if (value.type !== "DEPOT" && value.type !== "RETRAIT") patch.type = "DEPOT";
    if (Object.keys(patch).length > 0) onChange(patch);
  }, [isLivret, value.actif, value.type, onChange]);

  const typeOptions = isLivret ? LIVRET_TX_TYPES : TX_TYPES;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Date">
        <input
          type="date"
          value={value.date}
          max={todayIso()}
          onChange={(e) => onChange({ date: e.target.value })}
          className={txInputClasses}
          required
        />
      </Field>

      <Field label="Type">
        <select
          value={value.type}
          onChange={(e) =>
            onChange({ type: e.target.value as TransactionType })
          }
          className={txInputClasses}
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Compte">
        <select
          value={value.compte}
          onChange={(e) => onChange({ compte: e.target.value })}
          className={txInputClasses}
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
            value={value.compteDestination}
            onChange={(e) => onChange({ compteDestination: e.target.value })}
            className={txInputClasses}
            required
          >
            <option value="">— Choisir —</option>
            {accounts
              .filter((a) => a.id !== value.compte)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
          </select>
        </Field>
      )}

      {!isLivret && (
        <Field label="Actif">
          <select
            value={value.actif}
            onChange={(e) => onChange({ actif: e.target.value })}
            className={txInputClasses}
            required
          >
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label={isLivret ? "Montant (€)" : "Quantité"}>
        <input
          type="text"
          inputMode="decimal"
          value={value.quantite}
          onChange={(e) => onChange({ quantite: e.target.value })}
          placeholder="0"
          className={txInputClasses}
          required
        />
      </Field>

      {!isLivret && (
        <>
          <Field label="Prix unitaire">
            <input
              type="text"
              inputMode="decimal"
              value={value.prixUnitaire}
              onChange={(e) => onChange({ prixUnitaire: e.target.value })}
              placeholder="—"
              className={txInputClasses}
            />
          </Field>

          <Field label="Devise">
            <select
              value={value.devise}
              onChange={(e) => onChange({ devise: e.target.value })}
              className={txInputClasses}
            >
              {TX_CURRENCIES.map((c) => (
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
              value={value.frais}
              onChange={(e) => onChange({ frais: e.target.value })}
              placeholder="0"
              className={txInputClasses}
            />
          </Field>

          <Field label="Frais devise">
            <select
              value={value.fraisDevise}
              onChange={(e) => onChange({ fraisDevise: e.target.value })}
              className={txInputClasses}
            >
              {TX_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </>
      )}

      <Field label="Notes" className="sm:col-span-2">
        <input
          type="text"
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Optionnel"
          className={txInputClasses}
        />
      </Field>
    </div>
  );
}

export function Field({
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
