import { loadWorkbook, getBudget } from "@/lib/excel";
import { getInflationRate } from "@/lib/config";
import { requireExcelConfigured } from "@/lib/page-guards";
import { summarizeBudget } from "@/lib/budget";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap, readDcaConfigs, readExpectedReturns, readRetirementProfile } from "@/lib/store";
import { DEFAULT_ENVELOPE_PLAFONDS, DEFAULT_ENVELOPE_RATES, type ContributionStream } from "@/lib/projection";
import {
  buildRetirementSources,
  computeRetirementHorizon,
} from "@/lib/retraite";
import type { Envelope } from "@/lib/schema";
import { ProjectionClient } from "./projection-client";
import type { EnvelopeProjectionInput } from "./envelope-projection";
import type { SerializedProperty } from "./realestate-projection";

export const dynamic = "force-dynamic";

export default async function ProjectionPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const now = new Date();
  const inflationRate = getInflationRate();

  const { restant } = summarizeBudget(getBudget());

  const [priceMap, dcaConfigs, expectedReturns, retirementProfile] = await Promise.all([
    readPriceMap(workbook.assets),
    readDcaConfigs(),
    readExpectedReturns(),
    readRetirementProfile(),
  ]);
  const envelopeRates: Record<Envelope, number> = {
    ...DEFAULT_ENVELOPE_RATES,
    ...expectedReturns,
  };
  const portfolio = buildPortfolio(workbook, priceMap);
  const envelopeInputs = buildEnvelopeInputs(
    portfolio.accounts,
    workbook.accounts,
    dcaConfigs,
  );

  const properties: SerializedProperty[] = workbook.properties.map((p) => ({
    ...p,
    dateAcquisition: p.dateAcquisition?.toISOString(),
    dateDebutCredit: p.dateDebutCredit?.toISOString(),
  }));

  const retirementHorizon = retirementProfile.birthDate
    ? computeRetirementHorizon(
        retirementProfile.birthDate,
        retirementProfile.targetRetirementAge,
        now,
      )
    : null;

  const retirementHorizonYears = retirementHorizon?.horizonYears ?? 10;

  const retirementSources = retirementProfile.birthDate
    ? buildRetirementSources({
        portfolio,
        dcaConfigs,
        properties: workbook.properties,
        horizonYears: retirementHorizonYears,
        inflationRate,
        now,
      })
    : null;

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Projection</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Projection de ton patrimoine financier et immobilier, avec objectif
          retraite et conseils d&apos;optimisation fiscale.
        </p>
      </header>

      <ProjectionClient
        monthlyRestant={restant}
        envelopeInputs={envelopeInputs}
        envelopeRates={envelopeRates}
        properties={properties}
        inflationRate={inflationRate}
        retirement={
          retirementHorizon
            ? {
                horizonYears: retirementHorizon.horizonYears,
                targetRetirementAge: retirementProfile.targetRetirementAge,
                monthlyRealEstateNet: retirementSources?.monthlyRealEstateNet ?? 0,
                estimatedPublicPension: retirementProfile.estimatedPublicPension,
              }
            : null
        }
      />
    </div>
  );
}

function buildEnvelopeInputs(
  portfolioAccounts: ReturnType<typeof buildPortfolio>["accounts"],
  accounts: ReturnType<typeof loadWorkbook>["accounts"],
  dcaConfigs: Awaited<ReturnType<typeof readDcaConfigs>>,
): EnvelopeProjectionInput[] {
  const valueByEnvelope = new Map<Envelope, number>();
  for (const account of portfolioAccounts) {
    const envelope = account.envelope as Envelope;
    valueByEnvelope.set(
      envelope,
      (valueByEnvelope.get(envelope) ?? 0) + account.marketValue,
    );
  }

  const streamsByEnvelope = new Map<Envelope, ContributionStream[]>();
  for (const config of dcaConfigs) {
    const streams = streamsByEnvelope.get(config.envelope) ?? [];
    streams.push({
      amount: config.amount,
      frequency: config.frequency,
      paymentMonth: config.paymentMonth,
    });
    streamsByEnvelope.set(config.envelope, streams);
  }

  const openDateByEnvelope = new Map<Envelope, string | undefined>();
  const plafondByEnvelope = new Map<Envelope, number | undefined>();
  for (const account of accounts) {
    const openDate = account.openDate?.toISOString();
    const existingOpen = openDateByEnvelope.get(account.envelope);
    if (openDate && (!existingOpen || openDate < existingOpen)) {
      openDateByEnvelope.set(account.envelope, openDate);
    } else if (!openDateByEnvelope.has(account.envelope)) {
      openDateByEnvelope.set(account.envelope, existingOpen);
    }
    const existingPlafond = plafondByEnvelope.get(account.envelope);
    if (
      account.plafond &&
      (!existingPlafond || account.plafond > existingPlafond)
    ) {
      plafondByEnvelope.set(account.envelope, account.plafond);
    }
  }

  const allEnvelopes = new Set<Envelope>([
    ...Array.from(valueByEnvelope.keys()),
    ...Array.from(streamsByEnvelope.keys()),
  ]);

  return Array.from(allEnvelopes)
    .filter(
      (envelope) =>
        (valueByEnvelope.get(envelope) ?? 0) > 0 ||
        streamsByEnvelope.has(envelope),
    )
    .map((envelope) => {
      const currentValue = valueByEnvelope.get(envelope) ?? 0;
      const streams = streamsByEnvelope.get(envelope) ?? [];
      const monthlyDefault = streams
        .filter((s) => s.frequency === "MENSUEL")
        .reduce((sum, s) => sum + s.amount, 0);
      const extraContributions = streams.filter(
        (s) => s.frequency !== "MENSUEL",
      );
      return {
        envelope,
        currentValue,
        monthlyDefault,
        extraContributions,
        openDate: openDateByEnvelope.get(envelope),
        plafond: plafondByEnvelope.get(envelope) ?? DEFAULT_ENVELOPE_PLAFONDS[envelope],
      };
    })
    .sort((a, b) => b.currentValue - a.currentValue);
}
