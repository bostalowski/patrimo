import { loadWorkbook } from "@/lib/excel";
import { getInflationRate } from "@/lib/config";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap, readDcaConfigs, readRetirementProfile } from "@/lib/store";
import {
  buildRetirementSources,
  buildRetirementTimeline,
} from "@/lib/retraite";
import {
  civilYmd,
  normalizeRetirementProfile,
  resolveActiveRetirement,
} from "@patrimo/core/retirement-profile";
import { PENSION_SCENARIO_LABELS } from "@/lib/pension-scenario-labels";
import { RetraiteClient } from "./retraite-client";

export const dynamic = "force-dynamic";

export default async function RetraitePage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const now = new Date();
  const inflationRate = getInflationRate();

  const [priceMap, dcaConfigs, profile] = await Promise.all([
    readPriceMap(workbook.assets),
    readDcaConfigs(),
    readRetirementProfile(),
  ]);
  const portfolio = buildPortfolio(workbook, priceMap);
  const normalized = normalizeRetirementProfile(profile);
  const resolved = resolveActiveRetirement(normalized, now);

  const sources = resolved.ok
    ? buildRetirementSources({
        portfolio,
        dcaConfigs,
        properties: workbook.properties,
        horizonYears: resolved.horizonYears,
        inflationRate,
        now,
      })
    : { scenarios: [], monthlyRealEstateNet: 0 };

  const timeline = buildRetirementTimeline({
    accounts: workbook.accounts.map((a) => ({
      envelope: a.envelope,
      openDate: a.openDate,
      label: a.label,
    })),
    retirementDateIso: resolved.ok
      ? civilYmd(resolved.startDate)
      : undefined,
    now,
  });

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Retraite</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Horizon retraite, capital mobilisable projeté par scénario et revenu
          mensuel soutenable (pension, fruits du capital sans grignoter le
          patrimoine, loyers nets hors résidence principale).
        </p>
      </header>

      <RetraiteClient
        initialProfile={normalized}
        horizon={
          resolved.ok
            ? {
                horizonYears: resolved.horizonYears,
                retirementDate: civilYmd(resolved.startDate),
                scenarioLabel: PENSION_SCENARIO_LABELS[resolved.type],
              }
            : null
        }
        scenarios={sources.scenarios}
        monthlyRealEstateNet={sources.monthlyRealEstateNet}
        timeline={timeline}
        inflationRate={inflationRate}
      />
    </div>
  );
}
