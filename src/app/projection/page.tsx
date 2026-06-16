import { loadWorkbook, getBudget } from "@/lib/excel";
import { getInflationRate } from "@/lib/config";
import { requireExcelConfigured } from "@/lib/page-guards";
import { summarizeBudget } from "@/lib/budget";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap, readDcaConfigs, readExpectedReturns } from "@/lib/store";
import { DEFAULT_ENVELOPE_RATES } from "@/lib/projection";
import {
  computeLivretState,
  livretFlows,
  livretInterestEvents,
} from "@/lib/livret";
import type { Envelope } from "@/lib/schema";
import { ProjectionClient, type LivretOption } from "./projection-client";
import type { EnvelopeProjectionInput } from "./envelope-projection";
import type { SerializedProperty } from "./realestate-projection";

export const dynamic = "force-dynamic";

export default async function ProjectionPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const now = new Date();
  const inflationRate = getInflationRate();

  const livrets: LivretOption[] = workbook.accounts
    .filter((account) => account.envelope === "LIVRET")
    .map((account) => {
      const flows = livretFlows(account.id, workbook.transactions);
      const interestEvents = livretInterestEvents(
        account.id,
        workbook.transactions,
      );
      const state = computeLivretState(
        account.rate ?? 0,
        flows,
        interestEvents,
        now,
      );
      return {
        id: account.id,
        label: account.label,
        rate: account.rate ?? 0,
        plafond: account.plafond ?? null,
        balance: state.availableBalance,
      };
    });

  const { restant } = summarizeBudget(getBudget());

  const [priceMap, dcaConfigs, expectedReturns] = await Promise.all([
    readPriceMap(workbook.assets),
    readDcaConfigs(),
    readExpectedReturns(),
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

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Projection</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Simulez la croissance de vos livrets à taux connu, ou projetez vos
          enveloppes engagées et votre reste à allouer au taux estimé de chaque
          enveloppe, avec conseils d&apos;optimisation fiscale.
        </p>
      </header>

      <ProjectionClient
        livrets={livrets}
        monthlyRestant={restant}
        envelopeInputs={envelopeInputs}
        envelopeRates={envelopeRates}
        properties={properties}
        inflationRate={inflationRate}
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
    if (account.envelope === "LIVRET") continue;
    const envelope = account.envelope as Envelope;
    valueByEnvelope.set(
      envelope,
      (valueByEnvelope.get(envelope) ?? 0) + account.marketValue,
    );
  }

  const monthlyByEnvelope = new Map<Envelope, number>();
  for (const config of dcaConfigs) {
    if (config.envelope === "LIVRET") continue;
    monthlyByEnvelope.set(
      config.envelope,
      (monthlyByEnvelope.get(config.envelope) ?? 0) + config.monthlyAmount,
    );
  }

  const openDateByEnvelope = new Map<Envelope, string | undefined>();
  const plafondByEnvelope = new Map<Envelope, number | undefined>();
  for (const account of accounts) {
    if (account.envelope === "LIVRET") continue;
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

  return Array.from(valueByEnvelope.entries())
    .filter(([, currentValue]) => currentValue > 0)
    .map(([envelope, currentValue]) => ({
      envelope,
      currentValue,
      monthlyDefault: monthlyByEnvelope.get(envelope) ?? 0,
      openDate: openDateByEnvelope.get(envelope),
      plafond: plafondByEnvelope.get(envelope),
    }))
    .sort((a, b) => b.currentValue - a.currentValue);
}
