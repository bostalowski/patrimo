import { loadWorkbook, getBudget } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { summarizeBudget } from "@/lib/budget";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap, readDcaConfigs } from "@/lib/store";
import {
  computeLivretState,
  livretFlows,
  livretInterestEvents,
} from "@/lib/livret";
import type { Envelope } from "@/lib/schema";
import { ProjectionClient, type LivretOption } from "./projection-client";
import type { SerializedEnvelope } from "./restant-projection";
import type { EnvelopeProjectionInput } from "./envelope-projection";

export const dynamic = "force-dynamic";

export default async function ProjectionPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const now = new Date();

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
  const envelopes = buildEnvelopes(workbook.accounts);

  const [priceMap, dcaConfigs] = await Promise.all([
    readPriceMap(workbook.assets),
    readDcaConfigs(),
  ]);
  const portfolio = buildPortfolio(workbook, priceMap);
  const envelopeInputs = buildEnvelopeInputs(
    portfolio.accounts,
    workbook.accounts,
    dcaConfigs,
  );

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Projection</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Simulez la croissance de vos livrets à taux connu, ou projetez le restant
          non alloué de votre budget sur plusieurs scénarios de rendement avec
          conseils d&apos;optimisation fiscale.
        </p>
      </header>

      <ProjectionClient
        livrets={livrets}
        monthlyRestant={restant}
        envelopes={envelopes}
        envelopeInputs={envelopeInputs}
      />
    </div>
  );
}

function buildEnvelopes(
  accounts: ReturnType<typeof loadWorkbook>["accounts"],
): SerializedEnvelope[] {
  const byEnvelope = new Map<Envelope, SerializedEnvelope>();
  for (const account of accounts) {
    const existing = byEnvelope.get(account.envelope);
    const openDate = account.openDate?.toISOString();
    if (!existing) {
      byEnvelope.set(account.envelope, {
        envelope: account.envelope,
        openDate,
        plafond: account.plafond,
      });
      continue;
    }
    if (
      openDate &&
      (!existing.openDate || openDate < existing.openDate)
    ) {
      existing.openDate = openDate;
    }
    if (account.plafond && (!existing.plafond || account.plafond > existing.plafond)) {
      existing.plafond = account.plafond;
    }
  }
  return Array.from(byEnvelope.values());
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
