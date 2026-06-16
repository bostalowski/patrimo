import { loadWorkbook } from "@/lib/excel";
import { getInflationRate } from "@/lib/config";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap, readDcaConfigs, readRetirementProfile } from "@/lib/store";
import {
  buildRetirementSources,
  buildRetirementTimeline,
  computeRetirementHorizon,
} from "@/lib/retraite";
import { RetraiteClient } from "./retraite-client";

export const dynamic = "force-dynamic";

const DEFAULT_HORIZON_YEARS = 10;

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

  const horizon = profile.birthDate
    ? computeRetirementHorizon(
        profile.birthDate,
        profile.targetRetirementAge,
        now,
      )
    : null;

  const horizonYears = horizon?.horizonYears ?? DEFAULT_HORIZON_YEARS;

  const sources = buildRetirementSources({
    portfolio,
    dcaConfigs,
    properties: workbook.properties,
    horizonYears,
    inflationRate,
    now,
  });

  const timeline = buildRetirementTimeline({
    accounts: workbook.accounts.map((a) => ({
      envelope: a.envelope,
      openDate: a.openDate,
      label: a.label,
    })),
    retirementDateIso: horizon?.retirementDate.toISOString(),
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
        initialProfile={{
          birthDate: profile.birthDate?.toISOString().slice(0, 10),
          targetRetirementAge: profile.targetRetirementAge,
          estimatedPublicPension: profile.estimatedPublicPension,
        }}
        horizon={
          horizon
            ? {
                currentAge: horizon.currentAge,
                horizonYears: horizon.horizonYears,
                retirementDate: horizon.retirementDate.toISOString(),
              }
            : null
        }
        projectionHorizonYears={horizonYears}
        scenarios={sources.scenarios}
        monthlyRealEstateNet={sources.monthlyRealEstateNet}
        timeline={timeline}
        inflationRate={inflationRate}
      />
    </div>
  );
}
