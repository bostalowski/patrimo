import { loadWorkbook, getBudget } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { summarizeBudget } from "@/lib/budget";
import {
  computeLivretState,
  livretFlows,
  livretInterestEvents,
} from "@/lib/livret";
import type { Envelope } from "@/lib/schema";
import { ProjectionClient, type LivretOption } from "./projection-client";
import type { SerializedEnvelope } from "./restant-projection";

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
