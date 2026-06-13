import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import {
  computeLivretState,
  livretFlows,
  livretInterestEvents,
} from "@/lib/livret";
import { ProjectionClient, type LivretOption } from "./projection-client";

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

  return (
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Projection</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          Simulez la croissance future de vos livrets à taux connu (intérêts
          composés, versements récurrents, plafond).
        </p>
      </header>

      <ProjectionClient livrets={livrets} />
    </div>
  );
}
