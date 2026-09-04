"use client";

import { Plus, Trash2 } from "lucide-react";

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

export type PropertyTaxDraftRow = {
  id: string;
  year: string;
  amount: string;
};

export function propertyTaxRowsFromEntries(
  entries: { year: number; amount: number }[],
): PropertyTaxDraftRow[] {
  return entries
    .slice()
    .sort((a, b) => a.year - b.year)
    .map((entry, index) => ({
      id: `saved-${index}-${entry.year}`,
      year: String(entry.year),
      amount: String(entry.amount),
    }));
}

type Props = {
  rows: PropertyTaxDraftRow[];
  onChange: (rows: PropertyTaxDraftRow[]) => void;
};

/**
 * Editable "Taxe foncière par année" table (D5): replaces the single flat
 * `Property.taxeFonciere` input on the property form. Only shown when
 * editing an existing property (a stable `Property.id` is required to
 * attach per-year rows to, D7).
 */
export function PropertyTaxHistoryEditor({ rows, onChange }: Props) {
  function updateRow(index: number, patch: Partial<PropertyTaxDraftRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([
      ...rows,
      { id: `draft-${Date.now()}-${rows.length}`, year: "", amount: "" },
    ]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Taxe foncière par année
      </span>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={row.year}
              onChange={(e) => updateRow(index, { year: e.target.value })}
              placeholder="Année"
              aria-label="Année"
              className={`${inputClasses} w-24`}
            />
            <input
              type="text"
              inputMode="decimal"
              value={row.amount}
              onChange={(e) => updateRow(index, { amount: e.target.value })}
              placeholder="Montant (EUR)"
              aria-label="Montant (EUR)"
              className={`${inputClasses} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              aria-label="Supprimer cette ligne"
              className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
      >
        <Plus className="h-3.5 w-3.5" />
        Ajouter une année
      </button>
    </div>
  );
}
