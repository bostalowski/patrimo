"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  CardValue,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import type { Envelope } from "@/lib/schema";
import { clampRetirementAge, RetirementProfile } from "@/lib/schema";
import {
  computeSustainableIncome,
  type RetirementScenarioBlock,
  type SustainableIncome,
  type TimelineEntry,
} from "@/lib/retraite";
import { SCENARIO_PRESETS, type ScenarioKey } from "@/lib/projection";
import { formatDate, formatEuro, formatPercent } from "@/lib/utils";

const inputClasses =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950";

const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  prudent: "#0ea5e9",
  modere: "#10b981",
  dynamique: "#8b5cf6",
};

const ENVELOPE_LABELS: Record<Envelope, string> = {
  CTO: "CTO",
  PEA: "PEA",
  PEE: "PEE / FCPE",
  AV: "Assurance-vie",
  LIVRET: "Livret",
  PER: "PER",
};

export type RetraiteProfileForm = {
  birthDate?: string;
  targetRetirementAge: number;
  estimatedPublicPension?: number;
};

type SerializedHorizon = {
  currentAge: number;
  horizonYears: number;
  retirementDate: string;
} | null;

type Props = {
  initialProfile: RetraiteProfileForm;
  horizon: SerializedHorizon;
  projectionHorizonYears: number;
  scenarios: RetirementScenarioBlock[];
  monthlyRealEstateNet: number;
  timeline: TimelineEntry[];
  inflationRate: number;
};

function toProfileModel(form: RetraiteProfileForm): RetirementProfile {
  return RetirementProfile.parse({
    birthDate: form.birthDate ? new Date(form.birthDate) : undefined,
    targetRetirementAge: form.targetRetirementAge,
    estimatedPublicPension: form.estimatedPublicPension,
  });
}

export function RetraiteClient({
  initialProfile,
  horizon,
  projectionHorizonYears,
  scenarios,
  monthlyRealEstateNet,
  timeline,
  inflationRate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [profile, setProfile] = useState<RetraiteProfileForm>(initialProfile);
  const [ageDraft, setAgeDraft] = useState(
    String(initialProfile.targetRetirementAge),
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(initialProfile);
    setAgeDraft(String(initialProfile.targetRetirementAge));
  }, [initialProfile]);

  const incomeRows: SustainableIncome[] = useMemo(() => {
    const model = toProfileModel(profile);
    return scenarios.map((scenario) => {
      const preset = SCENARIO_PRESETS.find((p) => p.key === scenario.scenario);
      return computeSustainableIncome(
        model,
        scenario,
        monthlyRealEstateNet,
        preset?.rate ?? 0,
      );
    });
  }, [profile, scenarios, monthlyRealEstateNet]);

  async function persist(next: RetraiteProfileForm, refresh: boolean) {
    setSaveError(null);
    const body = {
      birthDate: next.birthDate
        ? new Date(next.birthDate).toISOString()
        : null,
      targetRetirementAge: next.targetRetirementAge,
      estimatedPublicPension: next.estimatedPublicPension,
    };
    const res = await fetch("/api/retirement-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setSaveError(data.error ?? "Erreur de sauvegarde");
      return;
    }
    if (refresh) {
      startTransition(() => {
        router.refresh();
      });
    }
  }

  function persistFromState(refreshAfter: boolean) {
    setProfile((current) => {
      void persist(current, refreshAfter);
      return current;
    });
  }

  return (
    <div className="space-y-8">
      {saveError && (
        <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
      )}
      {pending && (
        <p className="text-xs text-zinc-500">Mise à jour des projections…</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profil retraite</CardTitle>
          <p className="text-xs text-zinc-500">
            Les champs sont enregistrés à la sortie du champ (date de naissance
            et âge cible relancent les projections côté serveur).
          </p>
        </CardHeader>
        <CardBody className="flex max-w-xl flex-col gap-6">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Date de naissance
            </span>
            <input
              type="date"
              className={inputClasses}
              value={profile.birthDate ?? ""}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  birthDate: e.target.value || undefined,
                }))
              }
              onBlur={() => void persistFromState(true)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Âge de départ visé
            </span>
            <p className="text-xs leading-relaxed text-zinc-500">
              Entre 50 et 75 ans. Tu peux saisir librement (ex. 62) : à la sortie
              du champ, une valeur hors plage est ramenée dans l&apos;intervalle.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              className={inputClasses}
              value={ageDraft}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setAgeDraft(v);
              }}
              onBlur={() => {
                const digits = ageDraft.replace(/\D/g, "");
                const clamped =
                  digits === ""
                    ? profile.targetRetirementAge
                    : clampRetirementAge(Number(digits));
                setAgeDraft(String(clamped));
                const next = { ...profile, targetRetirementAge: clamped };
                setProfile(next);
                void persist(next, true);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Pension publique estimée (€ / mois brut)
            </span>
            <p className="text-xs leading-relaxed text-zinc-500">
              Estimation officielle possible sur{" "}
              <a
                href="https://www.info-retraite.fr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 underline dark:text-sky-400"
              >
                info-retraite.fr
              </a>
              .
            </p>
            <input
              type="number"
              min={0}
              step={50}
              className={inputClasses}
              value={
                profile.estimatedPublicPension !== undefined
                  ? String(profile.estimatedPublicPension)
                  : ""
              }
              onChange={(e) => {
                const v = e.target.value;
                setProfile((p) => ({
                  ...p,
                  estimatedPublicPension:
                    v === "" ? undefined : Math.max(0, Number(v) || 0),
                }));
              }}
              onBlur={() => void persistFromState(false)}
            />
          </label>
        </CardBody>
      </Card>

      {horizon ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/50">
          <p>
            <span className="font-medium">Âge actuel (approx.)</span>{" "}
            {horizon.currentAge.toFixed(1)} ans —{" "}
            <span className="font-medium">Horizon</span>{" "}
            {horizon.horizonYears.toFixed(1)} ans jusqu&apos;à l&apos;âge cible —{" "}
            <span className="font-medium">Date cible</span>{" "}
            {formatDate(new Date(horizon.retirementDate))}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          Sans date de naissance, les projections utilisent un horizon fixe de{" "}
          {projectionHorizonYears} ans. Renseigne ta date de naissance pour un
          horizon aligné sur ton âge de départ.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <p className="text-xs text-zinc-500">
            Jalons PEA (5 ans), AV (8 ans) et retraite visée, triés par date.
          </p>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
            {timeline.map((item) => (
              <li key={`${item.label}-${item.date}`} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-zinc-900 dark:text-zinc-50">
                  {item.label}
                </span>
                <span className="ml-2 font-mono text-xs text-zinc-500">
                  {formatDate(new Date(item.date))}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Capital mobilisable (projection)
        </h2>
        <p className="mb-4 text-xs text-zinc-500">
          Scénarios de rendement {SCENARIO_PRESETS.map((p) => p.label).join(" / ")}
          . Encours + DCA mensuel par enveloppe, immobilier hors résidence
          principale (equity en fin d&apos;horizon). Inflation{" "}
          {formatPercent(inflationRate)} pour la colonne réelle.
        </p>
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
          {scenarios.map((block) => (
            <Card key={block.scenario}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SCENARIO_COLORS[block.scenario] }}
                  />
                  {block.label}
                </CardTitle>
                <CardValue>{formatEuro(block.totalNominal)}</CardValue>
                <p className="text-xs text-sky-600 dark:text-sky-400">
                  ≈ {formatEuro(block.totalReal)} après inflation
                </p>
              </CardHeader>
              <CardBody className="px-0 pt-0">
                <Table>
                  <THead>
                    <TR>
                      <TH>Source</TH>
                      <TH className="text-right">Nominal</TH>
                      <TH className="text-right">Réel</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {block.envelopes.map((row) => (
                      <TR key={row.envelope}>
                        <TD>{ENVELOPE_LABELS[row.envelope]}</TD>
                        <TD className="text-right font-mono text-xs">
                          {formatEuro(row.nominal)}
                        </TD>
                        <TD className="text-right font-mono text-xs text-zinc-500">
                          {formatEuro(row.real)}
                        </TD>
                      </TR>
                    ))}
                    <TR>
                      <TD className="font-medium">Immo (equity)</TD>
                      <TD className="text-right font-mono text-xs">
                        {formatEuro(block.realEstateEquityNominal)}
                      </TD>
                      <TD className="text-right font-mono text-xs text-zinc-500">
                        {formatEuro(block.realEstateEquityReal)}
                      </TD>
                    </TR>
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenu mensuel net estimé — sans grignoter le capital</CardTitle>
          <p className="text-xs leading-relaxed text-zinc-500">
            Combien tu peux retirer chaque mois en ne vivant que des{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              fruits du capital
            </span>{" "}
            (rendement nominal du scénario), sans toucher au principal.
            Tous les montants sont en net estimé.
          </p>
          <p className="text-xs leading-relaxed text-zinc-500">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Fiscalité
            </span>{" "}
            : taux moyen pondéré par enveloppe (Livret 0 %, PEA/PEE/AV
            17,2 %, CTO 30 %, PER 30 %).{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Loyers
            </span>{" "}
            : cash-flow déjà net de la dernière année à l&apos;horizon
            (crédit terminé si la durée est dépassée).
          </p>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>Scénario</TH>
                <TH
                  className="text-right text-[0.65rem] leading-tight normal-case"
                  title="Pension brute × 0,82 (prélèvements sociaux et CSG courants)."
                >
                  Pension net
                </TH>
                <TH
                  className="text-right text-[0.65rem] leading-tight normal-case"
                  title="Capital financier projeté × rendement nominal / 12."
                >
                  Fruits brut
                </TH>
                <TH
                  className="text-right text-[0.65rem] leading-tight normal-case"
                  title="Taux moyen pondéré par enveloppe appliqué aux fruits (Livret 0 %, PEA/PEE/AV 17,2 %, CTO/PER 30 %)."
                >
                  Fiscalité
                </TH>
                <TH
                  className="text-right text-[0.65rem] leading-tight normal-case"
                  title="Fruits brut − fiscalité."
                >
                  Fruits net
                </TH>
                <TH
                  className="text-right text-[0.65rem] leading-tight normal-case"
                  title="Cash-flow locatif net mensuel à l'horizon retraite (biens hors résidence principale)."
                >
                  Loyers net
                </TH>
                <TH
                  className="text-right text-[0.65rem] leading-tight normal-case"
                  title="Pension net + fruits net + loyers net."
                >
                  Net / mois
                </TH>
              </TR>
            </THead>
            <TBody>
              {incomeRows.map((row) => (
                <TR key={row.scenario}>
                  <TD className="font-medium">
                    {row.label}
                    <span className="ml-1 text-[0.6rem] text-zinc-400">
                      ({formatPercent(row.nominalReturnRate)})
                    </span>
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {formatEuro(row.pensionNet)}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {formatEuro(row.fruitsBrut)}
                  </TD>
                  <TD className="text-right font-mono text-xs text-zinc-400">
                    −{formatEuro(row.taxOnFruits)}
                    <span className="ml-0.5 text-[0.6rem]">
                      ({formatPercent(row.avgTaxRate)})
                    </span>
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {formatEuro(row.fruitsNet)}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {formatEuro(row.realEstateRent)}
                  </TD>
                  <TD className="text-right font-semibold">
                    <Badge variant="info">
                      {formatEuro(row.totalNetMonthly)}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <p className="px-6 pt-4 text-xs leading-relaxed text-zinc-400">
            Hypothèses : PEA/PEE/AV matures (prélèvements sociaux seuls),
            PER taxé au PFU, pas de conversion PER en rente,
            equity immobilière non redistribuée dans les fruits.
            Les montants sont nominaux (non corrigés de l&apos;inflation{" "}
            {formatPercent(inflationRate)}).
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
