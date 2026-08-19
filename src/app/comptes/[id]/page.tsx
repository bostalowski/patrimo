import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GeographicExposurePanel } from "@/components/geographic-exposure-panel";
import { SectorExposurePanel } from "@/components/sector-exposure-panel";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio } from "@/lib/portfolio";
import { readPriceMap } from "@/lib/store";
import { formatEuro } from "@/lib/utils";
import { AccountForm } from "../account-form";
import {
  ActiveAccountPositionsTable,
  ClosedAccountPositions,
} from "../account-positions-tables";
import { accountDeletionImpact } from "@/lib/deletion-impact";
import { AccountType, Envelope } from "@/lib/schema";
import {
  NO_ACCOUNT_ID,
  NO_ACCOUNT_LABEL,
} from "@patrimo/core/deletion";
import { aggregateGeographicExposureForAccount } from "@patrimo/core/geographic-exposure";
import { aggregateSectorExposureForAccount } from "@patrimo/core/sector-exposure";

export const dynamic = "force-dynamic";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  requireExcelConfigured();
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  if (decodedId === NO_ACCOUNT_ID) notFound();

  const workbook = loadWorkbook();
  const meta = workbook.accounts.find((account) => account.id === decodedId);
  if (!meta) notFound();

  const priceMap = await readPriceMap(workbook.assets);
  const portfolio = buildPortfolio(workbook, priceMap);
  const account = portfolio.accounts.find(
    (entry) => entry.accountId === decodedId,
  );
  const positions = account?.positions ?? [];
  const activePositions = positions.filter((position) => position.quantity > 0);
  const closedPositions = positions.filter((position) => position.quantity <= 0);
  const marketValue = account?.marketValue ?? 0;

  const accountGeo = aggregateGeographicExposureForAccount(
    positions.map((position) => ({
      assetId: position.assetId,
      accountId: decodedId,
      marketValue: position.marketValue,
    })),
    workbook.geographicAllocations ?? [],
    decodedId,
  );

  const accountSectors = aggregateSectorExposureForAccount(
    positions.map((position) => ({
      assetId: position.assetId,
      accountId: decodedId,
      marketValue: position.marketValue,
    })),
    workbook.sectorAllocations ?? [],
    decodedId,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/comptes"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour aux comptes
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {meta.label || NO_ACCOUNT_LABEL}
          </h1>
          <Badge variant="default">{meta.type}</Badge>
          <Badge variant="info">{meta.envelope}</Badge>
          <AccountForm
            accountTypes={AccountType.options}
            envelopes={Envelope.options}
            account={meta}
            trigger="icon"
            deletionImpact={accountDeletionImpact(workbook, meta.id)}
          />
        </div>
        <p className="mt-1 text-lg font-semibold tracking-tight">
          {formatEuro(marketValue)}
        </p>
      </header>

      <GeographicExposurePanel
        title="Géographie du compte"
        countries={accountGeo.countries}
        regions={accountGeo.regions}
      />

      <SectorExposurePanel
        title="Secteurs du compte"
        sectors={accountSectors.sectors}
      />

      {meta.envelope === "LIVRET" ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Solde livret {formatEuro(marketValue)}.
        </p>
      ) : activePositions.length === 0 && closedPositions.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucune position pour ce compte.
        </p>
      ) : (
        <>
          {activePositions.length > 0 && (
            <ActiveAccountPositionsTable positions={activePositions} />
          )}
          {closedPositions.length > 0 && (
            <ClosedAccountPositions positions={closedPositions} />
          )}
        </>
      )}
    </div>
  );
}
