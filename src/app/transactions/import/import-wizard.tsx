"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  FileText,
  Info,
  Loader2,
  Pencil,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  AssetType,
  AccountType,
  Envelope,
  PriceSource,
  TransactionType,
} from "@/lib/schema";
import type {
  AccountSuggestion,
  AmountSignTypes,
  AssetSuggestion,
  ColumnMapping,
  ImportPreview,
  Profile,
  RowPreview,
} from "@/lib/importers/types";
import { TX_FIELD_LABELS, REQUIRED_FIELDS } from "@/lib/importers/types";
import { detectTradeRepublicHeaders } from "@/lib/importers/trade-republic";
import { detectHeaders, looksLikeIsin, slugify } from "./client-utils";

const TR_FIELD_LABELS: Record<string, string> = {
  date: "Date",
  type: "Type",
  isin: "ISIN",
  name: "Nom de l'actif",
  shares: "Quantité",
  price: "Prix unitaire",
  amount: "Montant",
  currency: "Devise",
  fee: "Frais",
  note: "Note",
};
const TR_REQUIRED = ["date", "type"];
const TR_OPTIONAL_BUT_USEFUL = ["isin", "name", "shares", "price", "amount"];

type ExistingAsset = {
  id: string;
  label: string;
  isin?: string;
  ticker?: string;
  type: AssetType;
  currency: string;
};

type ExistingAccount = {
  id: string;
  label: string;
  type: AccountType;
  envelope: Envelope;
};

type Step = "source" | "configure" | "preview" | "done";
type SourceId = "generic" | "trade-republic";

type AssetForm = {
  identifier: string;
  occurrenceCount: number;
  id: string;
  label: string;
  type: AssetType;
  isin: string;
  ticker: string;
  source: PriceSource;
  param: string;
  currency: string;
  compte: string;
};

type AccountForm = {
  identifier: string;
  occurrenceCount: number;
  id: string;
  label: string;
  type: AccountType;
  envelope: Envelope;
};

type RowEdit = {
  date?: string;
  type?: TransactionType;
  actif?: string;
  compte?: string;
  quantite?: number;
  prixUnitaire?: number | null;
  frais?: number;
  notes?: string;
};

type MappingDefaults = {
  compte: string;
  devise: string;
  fraisDevise: string;
  type: TransactionType | "";
};

const TRANSACTION_TYPES: TransactionType[] = [
  "ACHAT",
  "VENTE",
  "DIVIDENDE",
  "INTERET",
  "TRANSFERT",
  "DEPOT",
  "RETRAIT",
];

const ASSET_TYPES: AssetType[] = ["ETF", "ACTION", "CRYPTO", "FCPE", "CASH"];
const ACCOUNT_TYPES: AccountType[] = [
  "BROKER",
  "EXCHANGE_CRYPTO",
  "WALLET_CRYPTO",
  "EPARGNE_SALARIALE",
];
const ENVELOPES: Envelope[] = ["CTO", "PEA", "PEE", "AV", "PER"];
const PRICE_SOURCES: PriceSource[] = [
  "yahoo",
  "coingecko",
  "investir",
  "manual",
];

const inputClasses =
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900";

type Props = {
  existingAssets: ExistingAsset[];
  existingAccounts: ExistingAccount[];
};

export function ImportWizard({ existingAssets, existingAccounts }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("source");
  const [source, setSource] = useState<SourceId | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  const defaultCompte = existingAccounts[0]?.id ?? "";

  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingDefaults, setMappingDefaults] = useState<MappingDefaults>({
    compte: existingAccounts[0]?.id ?? "",
    devise: "EUR",
    fraisDevise: "EUR",
    type: "",
  });
  const [amountSignTypes, setAmountSignTypes] = useState<AmountSignTypes>({
    positive: "DEPOT",
    negative: "RETRAIT",
  });

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [assetForms, setAssetForms] = useState<Record<string, AssetForm>>({});
  const [accountForms, setAccountForms] = useState<Record<string, AccountForm>>(
    {},
  );
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [rowEdits, setRowEdits] = useState<Record<number, RowEdit>>({});
  const [editingRow, setEditingRow] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported: number;
    assetsCreated: number;
    accountsCreated: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function reset() {
    setStep("source");
    setSource(null);
    setFileName(null);
    setCsvContent(null);
    setDetectedHeaders([]);
    setMapping({});
    setMappingDefaults({
      compte: existingAccounts[0]?.id ?? "",
      devise: "EUR",
      fraisDevise: "EUR",
      type: "",
    });
    setAmountSignTypes({ positive: "DEPOT", negative: "RETRAIT" });
    setPreview(null);
    setAssetForms({});
    setAccountForms({});
    setIncludeDuplicates(false);
    setExcludedRows(new Set());
    setRowEdits({});
    setEditingRow(null);
    setError(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function chooseSource(next: SourceId) {
    setSource(next);
    setStep("configure");
    setError(null);
  }

  async function onFileSelected(file: File) {
    setError(null);
    setFileName(file.name);
    const text = await file.text();
    setCsvContent(text);
    const { headers } = detectHeaders(text);
    setDetectedHeaders(headers);
    if (source === "generic") {
      setMapping(autoGuessMapping(headers));
    }
  }

  async function runPreview() {
    if (!csvContent || !source) {
      setError("Aucun fichier chargé.");
      return;
    }
    let profile: Profile;
    if (source === "trade-republic") {
      if (!defaultCompte) {
        setError("Crée d'abord un compte avant d'importer des transactions.");
        return;
      }
      profile = { source: "trade-republic", defaultCompte };
    } else {
      const missing = REQUIRED_FIELDS.filter((f) => !mapping[f]);
      if (missing.length > 0) {
        setError(
          `Mappe au moins : ${missing.map((m) => TX_FIELD_LABELS[m]).join(", ")}.`,
        );
        return;
      }
      if (!mapping.montant && !mapping.quantite) {
        setError("Mappe la colonne Montant (signé) ou la colonne Quantité.");
        return;
      }
      if (!mapping.montant && !mapping.type && !mappingDefaults.type) {
        setError(
          "Mappe la colonne Type, ou définis un type par défaut, ou mappe un Montant signé.",
        );
        return;
      }
      profile = {
        source: "generic",
        mapping,
        defaults: {
          compte: mappingDefaults.compte || undefined,
          devise: mappingDefaults.devise || "EUR",
          fraisDevise: mappingDefaults.fraisDevise || "EUR",
          type: mappingDefaults.type || undefined,
        },
        amountSignTypes,
      };
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          csv: csvContent,
          profile,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Échec de la prévisualisation.");
      }
      const data = (await res.json()) as ImportPreview;
      setPreview(data);
      setAssetForms(buildAssetForms(data.newAssets, defaultCompte));
      setAccountForms(buildAccountForms(data.newAccounts));
      setExcludedRows(new Set());
      setRowEdits({});
      setEditingRow(null);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function runCommit() {
    if (!preview) return;
    setError(null);

    const assetIdByIdentifier = new Map<string, string>();
    const assetCompteByIdentifier = new Map<string, string>();
    const accountIdByIdentifier = new Map<string, string>();
    const newAssetsPayload: AssetForm[] = [];
    const newAccountsPayload: AccountForm[] = [];

    for (const suggestion of preview.newAssets) {
      const form = assetForms[suggestion.identifier.toLowerCase()];
      if (!form) continue;
      const validation = validateAssetForm(form);
      if (validation) {
        setError(`Actif "${suggestion.identifier}" : ${validation}`);
        return;
      }
      newAssetsPayload.push(form);
      assetIdByIdentifier.set(suggestion.identifier.toLowerCase(), form.id);
      if (form.compte) {
        assetCompteByIdentifier.set(
          suggestion.identifier.toLowerCase(),
          form.compte,
        );
      }
    }

    for (const suggestion of preview.newAccounts) {
      const form = accountForms[suggestion.identifier.toLowerCase()];
      if (!form) continue;
      const validation = validateAccountForm(form);
      if (validation) {
        setError(`Compte "${suggestion.identifier}" : ${validation}`);
        return;
      }
      newAccountsPayload.push(form);
      accountIdByIdentifier.set(suggestion.identifier.toLowerCase(), form.id);
    }

    const includedRows = preview.rows.filter(
      (r) => isRowIncludable(r, includeDuplicates) && !excludedRows.has(r.rowIndex),
    );

    if (includedRows.length === 0) {
      setError("Aucune ligne à importer.");
      return;
    }

    for (const r of includedRows) {
      const edit = rowEdits[r.rowIndex];
      if (!edit) continue;
      if (edit.quantite !== undefined && (Number.isNaN(edit.quantite) || edit.quantite < 0)) {
        setError(`Ligne ${r.rowIndex} : quantité invalide.`);
        return;
      }
      if (edit.frais !== undefined && (Number.isNaN(edit.frais) || edit.frais < 0)) {
        setError(`Ligne ${r.rowIndex} : frais invalides.`);
        return;
      }
      if (edit.date !== undefined && Number.isNaN(new Date(edit.date).getTime())) {
        setError(`Ligne ${r.rowIndex} : date invalide.`);
        return;
      }
    }

    const transactions = includedRows.map((r) =>
      applyRowEdit(
        remapTransaction(
          r,
          assetIdByIdentifier,
          accountIdByIdentifier,
          assetCompteByIdentifier,
        ),
        rowEdits[r.rowIndex],
      ),
    );

    setBusy(true);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "commit",
          transactions,
          newAssets: newAssetsPayload.map(formToAsset),
          newAccounts: newAccountsPayload.map(formToAccount),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Échec de l'import.");
      }
      const data = (await res.json()) as {
        imported: number;
        assetsCreated: number;
        accountsCreated: number;
      };
      setResult(data);
      setStep("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const previewIncludedCount = useMemo(() => {
    if (!preview) return 0;
    return preview.rows.filter(
      (r) =>
        isRowIncludable(r, includeDuplicates) && !excludedRows.has(r.rowIndex),
    ).length;
  }, [preview, includeDuplicates, excludedRows]);

  function toggleExcludedRow(rowIndex: number) {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }

  function updateRowEdit(rowIndex: number, patch: Partial<RowEdit>) {
    setRowEdits((prev) => ({
      ...prev,
      [rowIndex]: { ...prev[rowIndex], ...patch },
    }));
  }

  if (step === "done" && result) {
    return (
      <Card>
        <CardBody className="space-y-3 py-8 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
          <p className="text-lg font-medium">Import terminé</p>
          <p className="text-sm text-zinc-500">
            {result.imported} transaction(s) ajoutée(s),{" "}
            {result.assetsCreated} actif(s) et {result.accountsCreated}{" "}
            compte(s) créé(s).
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/transactions")}
              className={primaryButton}
            >
              Voir les transactions
            </button>
            <button
              type="button"
              onClick={reset}
              className={secondaryButton}
            >
              Importer un autre fichier
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <StepIndicator step={step} />

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {step === "source" && <SourceStep onPick={chooseSource} />}

      {step === "configure" && source && (
        <ConfigureStep
          source={source}
          existingAccounts={existingAccounts}
          fileName={fileName}
          headers={detectedHeaders}
          fileInputRef={fileInputRef}
          onFileSelected={onFileSelected}
          mapping={mapping}
          onMappingChange={setMapping}
          mappingDefaults={mappingDefaults}
          onMappingDefaultsChange={setMappingDefaults}
          amountSignTypes={amountSignTypes}
          onAmountSignTypesChange={setAmountSignTypes}
          onBack={() => setStep("source")}
          onPreview={runPreview}
          busy={busy}
        />
      )}

      {step === "preview" && preview && (
        <PreviewStep
          preview={preview}
          existingAssets={existingAssets}
          existingAccounts={existingAccounts}
          assetForms={assetForms}
          accountForms={accountForms}
          onAssetFormChange={(key, patch) =>
            setAssetForms((prev) => ({
              ...prev,
              [key]: { ...prev[key], ...patch },
            }))
          }
          onAccountFormChange={(key, patch) =>
            setAccountForms((prev) => ({
              ...prev,
              [key]: { ...prev[key], ...patch },
            }))
          }
          includeDuplicates={includeDuplicates}
          onIncludeDuplicatesChange={setIncludeDuplicates}
          includedCount={previewIncludedCount}
          excludedRows={excludedRows}
          rowEdits={rowEdits}
          editingRow={editingRow}
          onToggleExcluded={toggleExcludedRow}
          onEditRow={setEditingRow}
          onRowEditChange={updateRowEdit}
          onBack={() => setStep("configure")}
          onCommit={runCommit}
          busy={busy}
        />
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Array<{ id: Step; label: string }> = [
    { id: "source", label: "Source" },
    { id: "configure", label: "Fichier et mapping" },
    { id: "preview", label: "Aperçu et import" },
  ];
  const index = steps.findIndex((s) => s.id === step);
  return (
    <ol className="flex items-center gap-2 text-xs text-zinc-500">
      {steps.map((s, i) => {
        const active = i === index;
        const done = i < index;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-medium",
                done &&
                  "border-emerald-500 bg-emerald-500 text-white",
                active &&
                  "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100",
                !active &&
                  !done &&
                  "border-zinc-300 text-zinc-400 dark:border-zinc-700",
              )}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "font-medium",
                active && "text-zinc-900 dark:text-zinc-100",
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-zinc-300" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function SourceStep({ onPick }: { onPick: (id: SourceId) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Source du fichier</CardTitle>
      </CardHeader>
      <CardBody className="grid gap-3 sm:grid-cols-2">
        <SourceCard
          title="Trade Republic"
          description="Export officiel CSV de l'app (Profil → Relevés de compte → Export des transactions)."
          onClick={() => onPick("trade-republic")}
        />
        <SourceCard
          title="CSV générique"
          description="N'importe quel CSV : tu mappes toi-même les colonnes vers les champs attendus."
          onClick={() => onPick("generic")}
        />
      </CardBody>
    </Card>
  );
}

function SourceCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border border-zinc-200 p-4 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-zinc-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
    >
      <span className="text-base font-semibold">{title}</span>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        {description}
      </span>
    </button>
  );
}

type ConfigureStepProps = {
  source: SourceId;
  existingAccounts: ExistingAccount[];
  fileName: string | null;
  headers: string[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File) => Promise<void> | void;
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  mappingDefaults: MappingDefaults;
  onMappingDefaultsChange: (next: MappingDefaults) => void;
  amountSignTypes: AmountSignTypes;
  onAmountSignTypesChange: (next: AmountSignTypes) => void;
  onBack: () => void;
  onPreview: () => void;
  busy: boolean;
};

function ConfigureStep(props: ConfigureStepProps) {
  const {
    source,
    existingAccounts,
    fileName,
    headers,
    fileInputRef,
    onFileSelected,
    mapping,
    onMappingChange,
    mappingDefaults,
    onMappingDefaultsChange,
    amountSignTypes,
    onAmountSignTypesChange,
    onBack,
    onPreview,
    busy,
  } = props;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {source === "trade-republic"
            ? "Charge ton export Trade Republic"
            : "Charge ton fichier CSV et mappe les colonnes"}
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-6">
        <FileDropzone
          fileName={fileName}
          headers={headers}
          inputRef={fileInputRef}
          onFile={onFileSelected}
        />

        {source === "trade-republic" && headers.length > 0 && (
          <TradeRepublicDetection headers={headers} />
        )}

        {source === "trade-republic" && headers.length > 0 && (
          <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">
            Tu choisiras le compte de chaque actif (et de chaque ligne si
            besoin) à l&apos;étape d&apos;aperçu.
          </p>
        )}

        {source === "generic" && headers.length > 0 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold">Mapping des colonnes</h4>
              <p className="text-xs text-zinc-500">
                Pour chaque champ attendu, choisis la colonne correspondante de
                ton CSV. Les champs marqués d&apos;une étoile sont
                obligatoires.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(TX_FIELD_LABELS) as Array<
                keyof typeof TX_FIELD_LABELS
              >).map((field) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    {TX_FIELD_LABELS[field]}
                    {REQUIRED_FIELDS.includes(field) && (
                      <span className="text-rose-500"> *</span>
                    )}
                  </label>
                  <select
                    value={mapping[field] ?? ""}
                    onChange={(e) =>
                      onMappingChange({
                        ...mapping,
                        [field]: e.target.value || undefined,
                      })
                    }
                    className={inputClasses}
                  >
                    <option value="">—</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Valeurs par défaut</h4>
              <p className="text-xs text-zinc-500">
                Utilisées quand la colonne n&apos;est pas mappée.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Compte par défaut
                  </label>
                  <AccountSelect
                    value={mappingDefaults.compte}
                    accounts={existingAccounts}
                    onChange={(value) =>
                      onMappingDefaultsChange({
                        ...mappingDefaults,
                        compte: value,
                      })
                    }
                    allowEmpty
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Devise
                  </label>
                  <input
                    type="text"
                    value={mappingDefaults.devise}
                    onChange={(e) =>
                      onMappingDefaultsChange({
                        ...mappingDefaults,
                        devise: e.target.value.toUpperCase(),
                      })
                    }
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Devise des frais
                  </label>
                  <input
                    type="text"
                    value={mappingDefaults.fraisDevise}
                    onChange={(e) =>
                      onMappingDefaultsChange({
                        ...mappingDefaults,
                        fraisDevise: e.target.value.toUpperCase(),
                      })
                    }
                    className={inputClasses}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Type par défaut
                  </label>
                  <select
                    value={mappingDefaults.type}
                    onChange={(e) =>
                      onMappingDefaultsChange({
                        ...mappingDefaults,
                        type: e.target.value as TransactionType | "",
                      })
                    }
                    className={inputClasses}
                  >
                    <option value="">—</option>
                    {TRANSACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {mapping.montant && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Montant signé</h4>
                <p className="text-xs text-zinc-500">
                  Le type est déduit du signe du montant : la quantité importée
                  est la valeur absolue.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Montant positif =
                    </label>
                    <select
                      value={amountSignTypes.positive}
                      onChange={(e) =>
                        onAmountSignTypesChange({
                          ...amountSignTypes,
                          positive: e.target.value as TransactionType,
                        })
                      }
                      className={inputClasses}
                    >
                      {TRANSACTION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Montant négatif =
                    </label>
                    <select
                      value={amountSignTypes.negative}
                      onChange={(e) =>
                        onAmountSignTypesChange({
                          ...amountSignTypes,
                          negative: e.target.value as TransactionType,
                        })
                      }
                      className={inputClasses}
                    >
                      {TRANSACTION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} className={secondaryButton}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
          <button
            type="button"
            onClick={onPreview}
            disabled={busy || !fileName}
            className={primaryButton}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Prévisualiser
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function FileDropzone({
  fileName,
  headers,
  inputRef,
  onFile,
}: {
  fileName: string | null;
  headers: string[];
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => Promise<void> | void;
}) {
  const [dragActive, setDragActive] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
        dragActive
          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
          : "border-zinc-200 dark:border-zinc-800",
      )}
    >
      <Upload className="h-8 w-8 text-zinc-400" />
      {fileName ? (
        <div className="space-y-1">
          <p className="flex items-center justify-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            {fileName}
          </p>
          {headers.length > 0 && (
            <p className="text-xs text-zinc-500">
              {headers.length} colonne(s) détectée(s)
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Dépose ton fichier CSV ici, ou
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={secondaryButton}
      >
        {fileName ? "Changer de fichier" : "Parcourir"}
      </button>
    </div>
  );
}

function TradeRepublicDetection({ headers }: { headers: string[] }) {
  const lookup = useMemo(() => detectTradeRepublicHeaders(headers), [headers]);
  const hasAsset = lookup.has("isin") || lookup.has("name");
  const missingRequired = TR_REQUIRED.filter((k) => !lookup.has(k));
  const missingUseful = TR_OPTIONAL_BUT_USEFUL.filter((k) => !lookup.has(k));
  const ok =
    missingRequired.length === 0 && hasAsset && missingUseful.length <= 2;

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border px-4 py-3 text-sm",
        ok
          ? "border-emerald-200 bg-emerald-50/40 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200",
      )}
    >
      <p className="flex items-center gap-2 font-medium">
        {ok ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        {ok
          ? "Colonnes Trade Republic reconnues"
          : "Détection partielle des colonnes Trade Republic"}
      </p>
      <ul className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {Object.keys(TR_FIELD_LABELS).map((field) => (
          <li key={field} className="flex items-center justify-between gap-2">
            <span>{TR_FIELD_LABELS[field]}</span>
            <span className="font-mono text-[11px] opacity-80">
              {lookup.get(field) ?? "—"}
            </span>
          </li>
        ))}
      </ul>
      {!ok && (
        <p className="text-xs">
          Si l&apos;import échoue ou produit des résultats étranges, reviens à
          l&apos;étape précédente et choisis « CSV générique » pour mapper les
          colonnes à la main.
        </p>
      )}
    </div>
  );
}

function AccountSelect({
  value,
  accounts,
  onChange,
  allowEmpty = false,
}: {
  value: string;
  accounts: ExistingAccount[];
  onChange: (value: string) => void;
  allowEmpty?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClasses}
    >
      {allowEmpty && <option value="">—</option>}
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.label} ({a.envelope})
        </option>
      ))}
    </select>
  );
}

type PreviewStepProps = {
  preview: ImportPreview;
  existingAssets: ExistingAsset[];
  existingAccounts: ExistingAccount[];
  assetForms: Record<string, AssetForm>;
  accountForms: Record<string, AccountForm>;
  onAssetFormChange: (key: string, patch: Partial<AssetForm>) => void;
  onAccountFormChange: (key: string, patch: Partial<AccountForm>) => void;
  includeDuplicates: boolean;
  onIncludeDuplicatesChange: (value: boolean) => void;
  includedCount: number;
  excludedRows: Set<number>;
  rowEdits: Record<number, RowEdit>;
  editingRow: number | null;
  onToggleExcluded: (rowIndex: number) => void;
  onEditRow: (rowIndex: number | null) => void;
  onRowEditChange: (rowIndex: number, patch: Partial<RowEdit>) => void;
  onBack: () => void;
  onCommit: () => void;
  busy: boolean;
};

function PreviewStep(props: PreviewStepProps) {
  const {
    preview,
    existingAccounts,
    assetForms,
    accountForms,
    onAssetFormChange,
    onAccountFormChange,
    includeDuplicates,
    onIncludeDuplicatesChange,
    includedCount,
    excludedRows,
    rowEdits,
    editingRow,
    onToggleExcluded,
    onEditRow,
    onRowEditChange,
    onBack,
    onCommit,
    busy,
  } = props;

  const assetCompteByIdentifier = useMemo(
    () => buildAssetCompteMap(preview.newAssets, assetForms),
    [preview.newAssets, assetForms],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Résumé</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-3 sm:grid-cols-4">
          <Stat
            label="À importer"
            value={preview.okCount}
            tone="emerald"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
          <Stat
            label="Doublons"
            value={preview.duplicateCount}
            tone="amber"
            icon={<Info className="h-4 w-4" />}
          />
          <Stat
            label="Ignorés"
            value={preview.skippedCount}
            tone="zinc"
            icon={<Info className="h-4 w-4" />}
          />
          <Stat
            label="Erreurs"
            value={preview.errorCount}
            tone="rose"
            icon={<CircleAlert className="h-4 w-4" />}
          />
        </CardBody>
      </Card>

      {preview.newAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Nouveaux comptes à créer ({preview.newAccounts.length})
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {preview.newAccounts.map((suggestion) => {
              const key = suggestion.identifier.toLowerCase();
              const form = accountForms[key];
              if (!form) return null;
              return (
                <NewAccountFormRow
                  key={key}
                  suggestion={suggestion}
                  form={form}
                  onChange={(patch) => onAccountFormChange(key, patch)}
                />
              );
            })}
          </CardBody>
        </Card>
      )}

      {preview.newAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Nouveaux actifs à créer ({preview.newAssets.length})
            </CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {preview.newAssets.map((suggestion) => {
              const key = suggestion.identifier.toLowerCase();
              const form = assetForms[key];
              if (!form) return null;
              return (
                <NewAssetFormRow
                  key={key}
                  suggestion={suggestion}
                  form={form}
                  existingAccounts={existingAccounts}
                  onChange={(patch) => onAssetFormChange(key, patch)}
                />
              );
            })}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Lignes</CardTitle>
          {preview.duplicateCount > 0 && (
            <label className="flex items-center gap-2 text-xs text-zinc-500">
              <input
                type="checkbox"
                checked={includeDuplicates}
                onChange={(e) => onIncludeDuplicatesChange(e.target.checked)}
              />
              Inclure les {preview.duplicateCount} doublon(s)
            </label>
          )}
        </CardHeader>
        <CardBody className="px-0">
          <RowsTable
            rows={preview.rows}
            existingAccounts={existingAccounts}
            includeDuplicates={includeDuplicates}
            excludedRows={excludedRows}
            rowEdits={rowEdits}
            editingRow={editingRow}
            assetCompteByIdentifier={assetCompteByIdentifier}
            onToggleExcluded={onToggleExcluded}
            onEditRow={onEditRow}
            onRowEditChange={onRowEditChange}
          />
        </CardBody>
      </Card>

      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className={secondaryButton}>
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={busy || includedCount === 0}
          className={primaryButton}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Importer {includedCount} transaction(s)
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "zinc";
  icon: React.ReactNode;
}) {
  const toneClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
    zinc: "text-zinc-600 dark:text-zinc-400",
  };
  return (
    <div className="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <div className={cn("flex items-center gap-2 text-xs", toneClasses[tone])}>
        {icon}
        <span className="uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function NewAssetFormRow({
  suggestion,
  form,
  existingAccounts,
  onChange,
}: {
  suggestion: AssetSuggestion;
  form: AssetForm;
  existingAccounts: ExistingAccount[];
  onChange: (patch: Partial<AssetForm>) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-zinc-500">
            {suggestion.identifier}
          </p>
          <p className="text-sm font-medium">{form.label}</p>
        </div>
        <Badge variant="info">{suggestion.occurrenceCount} ligne(s)</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="ID *">
          <input
            type="text"
            value={form.id}
            onChange={(e) => onChange({ id: e.target.value })}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Libellé *">
          <input
            type="text"
            value={form.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Type">
          <select
            value={form.type}
            onChange={(e) =>
              onChange({ type: e.target.value as AssetType })
            }
            className={inputClasses}
          >
            {ASSET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Devise">
          <input
            type="text"
            value={form.currency}
            onChange={(e) =>
              onChange({ currency: e.target.value.toUpperCase() })
            }
            className={inputClasses}
          />
        </FormField>
        <FormField label="ISIN">
          <input
            type="text"
            value={form.isin}
            onChange={(e) =>
              onChange({ isin: e.target.value.toUpperCase() })
            }
            className={inputClasses}
          />
        </FormField>
        <FormField label="Ticker">
          <input
            type="text"
            value={form.ticker}
            onChange={(e) => onChange({ ticker: e.target.value })}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Source de prix">
          <select
            value={form.source}
            onChange={(e) =>
              onChange({ source: e.target.value as PriceSource })
            }
            className={inputClasses}
          >
            {PRICE_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Param source">
          <input
            type="text"
            value={form.param}
            onChange={(e) => onChange({ param: e.target.value })}
            className={inputClasses}
            placeholder={
              form.source === "yahoo"
                ? "ex. CW8.PA"
                : form.source === "coingecko"
                  ? "ex. bitcoin"
                  : ""
            }
          />
        </FormField>
        <FormField label="Compte associé">
          <select
            value={form.compte}
            onChange={(e) => onChange({ compte: e.target.value })}
            className={inputClasses}
          >
            {existingAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} ({a.envelope})
              </option>
            ))}
            {form.compte &&
              !existingAccounts.some((a) => a.id === form.compte) && (
                <option value={form.compte}>{form.compte}</option>
              )}
          </select>
        </FormField>
      </div>
      <p className="text-xs text-zinc-500">
        Toutes les lignes de cet actif seront affectées à ce compte (modifiable
        ligne par ligne plus bas).
      </p>
    </div>
  );
}

function NewAccountFormRow({
  suggestion,
  form,
  onChange,
}: {
  suggestion: AccountSuggestion;
  form: AccountForm;
  onChange: (patch: Partial<AccountForm>) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-zinc-500">
          {suggestion.identifier}
        </p>
        <Badge variant="info">{suggestion.occurrenceCount} ligne(s)</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="ID *">
          <input
            type="text"
            value={form.id}
            onChange={(e) => onChange({ id: e.target.value })}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Libellé *">
          <input
            type="text"
            value={form.label}
            onChange={(e) => onChange({ label: e.target.value })}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Type">
          <select
            value={form.type}
            onChange={(e) =>
              onChange({ type: e.target.value as AccountType })
            }
            className={inputClasses}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Enveloppe">
          <select
            value={form.envelope}
            onChange={(e) =>
              onChange({ envelope: e.target.value as Envelope })
            }
            className={inputClasses}
          >
            {ENVELOPES.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </div>
  );
}

function RowsTable({
  rows,
  existingAccounts,
  includeDuplicates,
  excludedRows,
  rowEdits,
  editingRow,
  assetCompteByIdentifier,
  onToggleExcluded,
  onEditRow,
  onRowEditChange,
}: {
  rows: RowPreview[];
  existingAccounts: ExistingAccount[];
  includeDuplicates: boolean;
  excludedRows: Set<number>;
  rowEdits: Record<number, RowEdit>;
  editingRow: number | null;
  assetCompteByIdentifier: Map<string, string>;
  onToggleExcluded: (rowIndex: number) => void;
  onEditRow: (rowIndex: number | null) => void;
  onRowEditChange: (rowIndex: number, patch: Partial<RowEdit>) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-6 py-6 text-sm text-zinc-500">
        Aucune ligne lue depuis ce fichier.
      </p>
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH className="w-10">Inclure</TH>
          <TH>Statut</TH>
          <TH>Ligne</TH>
          <TH>Date</TH>
          <TH>Type</TH>
          <TH>Actif</TH>
          <TH>Compte</TH>
          <TH className="text-right">Quantité</TH>
          <TH className="text-right">Prix</TH>
          <TH>Notes</TH>
          <TH className="w-10 text-right">Actions</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((r) => {
          const editable = r.tx != null;
          const includable = isRowIncludable(r, includeDuplicates);
          const excluded = excludedRows.has(r.rowIndex);
          const included = includable && !excluded;
          const editing = editingRow === r.rowIndex;
          const edit = rowEdits[r.rowIndex];
          const assetCompte = assetCompteByIdentifier.get(
            rowActifKey(r),
          );
          const view = effectiveTxView(r, edit, assetCompte);

          return (
            <TR
              key={r.rowIndex}
              className={cn(includable && !included && "opacity-50")}
            >
              <TD>
                {includable ? (
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => onToggleExcluded(r.rowIndex)}
                    aria-label={`Inclure la ligne ${r.rowIndex}`}
                  />
                ) : (
                  <span className="text-zinc-300 dark:text-zinc-700">—</span>
                )}
              </TD>
              <TD>
                <RowStatusBadge row={r} />
              </TD>
              <TD className="font-mono text-xs text-zinc-500">{r.rowIndex}</TD>
              <TD className="font-mono text-xs">
                {editing ? (
                  <input
                    type="date"
                    value={view.date}
                    onChange={(e) =>
                      onRowEditChange(r.rowIndex, { date: e.target.value })
                    }
                    className={editInputClasses}
                  />
                ) : (
                  view.date || "—"
                )}
              </TD>
              <TD>
                {editing ? (
                  <select
                    value={view.type ?? ""}
                    onChange={(e) =>
                      onRowEditChange(r.rowIndex, {
                        type: e.target.value as TransactionType,
                      })
                    }
                    className={editInputClasses}
                  >
                    {TRANSACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  (view.type ?? "—")
                )}
              </TD>
              <TD className="font-mono text-xs">
                {view.actif ?? r.actifIdentifier ?? "—"}
              </TD>
              <TD className="text-xs">
                {r.tx ? (
                  <select
                    value={view.compte ?? ""}
                    onChange={(e) =>
                      onRowEditChange(r.rowIndex, { compte: e.target.value })
                    }
                    className={editInputClasses}
                    aria-label={`Compte de la ligne ${r.rowIndex}`}
                  >
                    {existingAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label} ({a.envelope})
                      </option>
                    ))}
                    {view.compte &&
                      !existingAccounts.some((a) => a.id === view.compte) && (
                        <option value={view.compte}>{view.compte}</option>
                      )}
                  </select>
                ) : (
                  (r.compteIdentifier ?? "—")
                )}
              </TD>
              <TD className="text-right font-mono text-xs">
                {editing ? (
                  <input
                    type="number"
                    step="any"
                    value={view.quantite ?? ""}
                    onChange={(e) =>
                      onRowEditChange(r.rowIndex, {
                        quantite:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      })
                    }
                    className={cn(editInputClasses, "text-right")}
                  />
                ) : (
                  (view.quantite ?? "—")
                )}
              </TD>
              <TD className="text-right font-mono text-xs">
                {editing ? (
                  <input
                    type="number"
                    step="any"
                    value={view.prixUnitaire ?? ""}
                    onChange={(e) =>
                      onRowEditChange(r.rowIndex, {
                        prixUnitaire:
                          e.target.value === ""
                            ? null
                            : Number(e.target.value),
                      })
                    }
                    className={cn(editInputClasses, "text-right")}
                  />
                ) : (
                  (view.prixUnitaire ?? "—")
                )}
              </TD>
              <TD className="text-xs text-zinc-500">
                {editing ? (
                  <input
                    type="text"
                    value={view.notes ?? ""}
                    onChange={(e) =>
                      onRowEditChange(r.rowIndex, { notes: e.target.value })
                    }
                    className={editInputClasses}
                  />
                ) : r.status === "error" || r.status === "skipped" ? (
                  r.reason
                ) : (
                  (view.notes ?? "")
                )}
              </TD>
              <TD className="text-right">
                {editable && (
                  <button
                    type="button"
                    onClick={() => onEditRow(editing ? null : r.rowIndex)}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    aria-label={editing ? "Terminer l'édition" : "Modifier la ligne"}
                  >
                    {editing ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                  </button>
                )}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}

const editInputClasses =
  "w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-950";

function isRowIncludable(row: RowPreview, includeDuplicates: boolean): boolean {
  return (
    row.status === "ok" ||
    (row.status === "duplicate" && includeDuplicates)
  );
}

function rowActifKey(row: RowPreview): string {
  return (row.actifIdentifier ?? row.tx?.actif ?? "").trim().toLowerCase();
}

function buildAssetCompteMap(
  suggestions: AssetSuggestion[],
  assetForms: Record<string, AssetForm>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of suggestions) {
    const key = s.identifier.toLowerCase();
    const form = assetForms[key];
    if (form?.compte) map.set(key, form.compte);
  }
  return map;
}

function effectiveTxView(
  row: RowPreview,
  edit: RowEdit | undefined,
  assetCompte: string | undefined,
) {
  const tx = row.tx;
  return {
    date:
      edit?.date ??
      (tx ? new Date(tx.date).toISOString().slice(0, 10) : ""),
    type: edit?.type ?? tx?.type,
    actif: edit?.actif ?? tx?.actif,
    compte: edit?.compte ?? assetCompte ?? tx?.compte,
    quantite: edit && "quantite" in edit ? edit.quantite : tx?.quantite,
    prixUnitaire:
      edit && "prixUnitaire" in edit ? edit.prixUnitaire : tx?.prixUnitaire,
    notes: edit && "notes" in edit ? edit.notes : tx?.notes,
  };
}

function applyRowEdit<T extends Record<string, unknown>>(
  tx: T,
  edit: RowEdit | undefined,
): T {
  if (!edit) return tx;
  const next: Record<string, unknown> = { ...tx };
  if (edit.date !== undefined) next.date = edit.date;
  if (edit.type !== undefined) next.type = edit.type;
  if (edit.compte !== undefined) next.compte = edit.compte;
  if (edit.quantite !== undefined) next.quantite = edit.quantite;
  if (edit.prixUnitaire !== undefined) next.prixUnitaire = edit.prixUnitaire;
  if (edit.frais !== undefined) next.frais = edit.frais;
  if (edit.notes !== undefined) next.notes = edit.notes;
  return next as T;
}

function RowStatusBadge({ row }: { row: RowPreview }) {
  if (row.status === "ok") return <Badge variant="success">OK</Badge>;
  if (row.status === "duplicate")
    return <Badge variant="warning">Doublon</Badge>;
  if (row.status === "skipped") return <Badge>Ignoré</Badge>;
  return (
    <Badge variant="danger">
      <AlertTriangle className="mr-1 h-3 w-3" /> Erreur
    </Badge>
  );
}

function autoGuessMapping(headers: string[]): ColumnMapping {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (...candidates: string[]) => {
    for (const c of candidates) {
      const i = lower.findIndex((h) => h === c);
      if (i >= 0) return headers[i];
    }
    for (const c of candidates) {
      const i = lower.findIndex((h) => h.includes(c));
      if (i >= 0) return headers[i];
    }
    return undefined;
  };
  return {
    date: find("date", "datum"),
    type: find("type", "operation", "opération"),
    actif: find("isin", "actif", "ticker", "instrument", "name"),
    quantite: find("quantité", "quantite", "quantity", "shares", "stück"),
    montant: find("montant", "amount", "betrag"),
    prixUnitaire: find("prix unitaire", "prix", "price", "kurs"),
    devise: find("devise", "currency", "währung"),
    frais: find("frais", "fee", "fees", "gebühren"),
    compte: find("compte", "account"),
    compteDestination: find("compte destination", "destination"),
    notes: find("notes", "note", "memo", "description"),
  };
}

function buildAssetForms(
  suggestions: AssetSuggestion[],
  defaultCompte: string,
): Record<string, AssetForm> {
  const out: Record<string, AssetForm> = {};
  for (const s of suggestions) {
    const key = s.identifier.toLowerCase();
    const isin = s.isin ?? (looksLikeIsin(s.identifier) ? s.identifier.toUpperCase() : "");
    const guessedId = isin
      ? slugify(s.label || s.identifier) || isin.toLowerCase()
      : slugify(s.label || s.identifier) || key;
    out[key] = {
      identifier: s.identifier,
      occurrenceCount: s.occurrenceCount,
      id: guessedId,
      label: s.label,
      type: "ETF",
      isin: isin || "",
      ticker: s.ticker ?? "",
      source: "yahoo",
      param: "",
      currency: "EUR",
      compte: defaultCompte,
    };
  }
  return out;
}

function buildAccountForms(
  suggestions: AccountSuggestion[],
): Record<string, AccountForm> {
  const out: Record<string, AccountForm> = {};
  for (const s of suggestions) {
    const key = s.identifier.toLowerCase();
    out[key] = {
      identifier: s.identifier,
      occurrenceCount: s.occurrenceCount,
      id: slugify(s.label || s.identifier) || key,
      label: s.label,
      type: "BROKER",
      envelope: "CTO",
    };
  }
  return out;
}

function validateAssetForm(form: AssetForm): string | null {
  if (!form.id.trim()) return "ID requis";
  if (!form.label.trim()) return "Libellé requis";
  if (!form.currency.trim()) return "Devise requise";
  return null;
}

function validateAccountForm(form: AccountForm): string | null {
  if (!form.id.trim()) return "ID requis";
  if (!form.label.trim()) return "Libellé requis";
  return null;
}

function formToAsset(form: AssetForm) {
  return {
    id: form.id.trim(),
    label: form.label.trim(),
    type: form.type,
    isin: form.isin.trim() || undefined,
    ticker: form.ticker.trim() || undefined,
    source: form.source,
    param: form.param.trim() || undefined,
    currency: form.currency.trim() || "EUR",
  };
}

function formToAccount(form: AccountForm) {
  return {
    id: form.id.trim(),
    label: form.label.trim(),
    type: form.type,
    envelope: form.envelope,
  };
}

function remapTransaction(
  row: RowPreview,
  assetIdByIdentifier: Map<string, string>,
  accountIdByIdentifier: Map<string, string>,
  assetCompteByIdentifier: Map<string, string>,
) {
  const tx = row.tx!;
  const actifKey = (row.actifIdentifier ?? tx.actif).trim().toLowerCase();
  const compteKey = (row.compteIdentifier ?? tx.compte).trim().toLowerCase();
  const destKey = row.compteDestinationIdentifier
    ? row.compteDestinationIdentifier.trim().toLowerCase()
    : null;

  return {
    ...tx,
    actif: assetIdByIdentifier.get(actifKey) ?? tx.actif,
    compte:
      assetCompteByIdentifier.get(actifKey) ??
      accountIdByIdentifier.get(compteKey) ??
      tx.compte,
    compteDestination: destKey
      ? (accountIdByIdentifier.get(destKey) ?? tx.compteDestination)
      : tx.compteDestination,
  };
}
