import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { computeLivretState, livretFlows } from "@/lib/livret";
import { ProjectionClient, type LivretOption } from "./projection-client";

export const dynamic = "force-dynamic";

export default async function ProjectionPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const now = new Date();

  const livrets: LivretOption[] = workbook.assets
    .filter((asset) => asset.type === "LIVRET")
    .map((asset) => {
      const flows = livretFlows(asset.id, workbook.transactions);
      const state = computeLivretState(asset, flows, now);
      return {
        id: asset.id,
        label: asset.label,
        rate: asset.rate ?? 0,
        plafond: asset.plafond ?? null,
        balance: state.balance,
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
