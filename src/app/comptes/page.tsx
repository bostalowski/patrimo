import Link from "next/link";
import { ChevronRight, Lock, LockOpen } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { loadWorkbook } from "@/lib/excel";
import { requireExcelConfigured } from "@/lib/page-guards";
import { buildPortfolio, type AccountAssetPosition } from "@/lib/portfolio";
import { buildAccountUnlocks, type AccountUnlock } from "@/lib/deblocage";
import { readPriceMap } from "@/lib/store";
import {
  formatDate,
  formatEuro,
  formatPercent,
  formatQuantity,
  formatRelativeDuration,
  signClass,
} from "@/lib/utils";
import { AccountType, Envelope } from "@/lib/schema";
import { accountDeletionImpact } from "@/lib/deletion-impact";
import { AccountForm } from "./account-form";
import {
  NO_ACCOUNT_ID,
  NO_ACCOUNT_LABEL,
  UNASSIGNED_CASH_ASSET_ID,
} from "@patrimo/core/deletion";

export const dynamic = "force-dynamic";

type Empty = {
  accountId: string;
  envelope: string;
  marketValue: 0;
  costBasis: 0;
  unrealizedPnL: 0;
  realizedPnL: 0;
  realizedIncome: 0;
  cashInterest: 0;
  cashInterestRecorded: 0;
  cashInterestEstimated: 0;
  positions: [];
  isEmpty: true;
};

type FullAccount = ReturnType<typeof buildPortfolio>["accounts"][number] & {
  isEmpty?: false;
};

type AccountEntry = FullAccount | Empty;

export default async function ComptesPage() {
  requireExcelConfigured();
  const workbook = loadWorkbook();
  const priceMap = await readPriceMap(workbook.assets);
  const portfolio = buildPortfolio(workbook, priceMap);

  const unlockMap = new Map(
    buildAccountUnlocks(workbook, portfolio, priceMap).map((u) => [
      u.accountId,
      u,
    ]),
  );

  const accountMap = new Map(workbook.accounts.map((a) => [a.id, a]));
  const portfolioIds = new Set(portfolio.accounts.map((a) => a.accountId));

  const allAccounts: AccountEntry[] = [...portfolio.accounts];
  for (const account of workbook.accounts) {
    if (portfolioIds.has(account.id)) continue;
    allAccounts.push({
      accountId: account.id,
      envelope: account.envelope,
      marketValue: 0,
      costBasis: 0,
      unrealizedPnL: 0,
      realizedPnL: 0,
      realizedIncome: 0,
      cashInterest: 0,
      cashInterestRecorded: 0,
      cashInterestEstimated: 0,
      positions: [],
      isEmpty: true,
    });
  }

  const byEnvelope = new Map<string, AccountEntry[]>();
  for (const account of allAccounts) {
    const env = account.envelope;
    const list = byEnvelope.get(env) ?? [];
    list.push(account);
    byEnvelope.set(env, list);
  }

  const envelopes = Array.from(byEnvelope.entries()).sort(([, a], [, b]) => {
    const va = a.reduce((s, c) => s + c.marketValue, 0);
    const vb = b.reduce((s, c) => s + c.marketValue, 0);
    return vb - va;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Comptes</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Positions par enveloppe fiscale et par compte.
        </p>
      </header>

      <AccountForm
        accountTypes={AccountType.options}
        envelopes={Envelope.options}
      />

      {envelopes.map(([envelope, accounts]) => {
        const envelopeValue = accounts.reduce((s, c) => s + c.marketValue, 0);
        const envelopeBasis = accounts.reduce((s, c) => s + c.costBasis, 0);
        const isLivretEnvelope = envelope === "LIVRET";
        const envelopePnL = isLivretEnvelope
          ? accounts.reduce((s, c) => s + c.cashInterest, 0)
          : accounts.reduce((s, c) => s + c.unrealizedPnL, 0);
        const showPnLPct = !isLivretEnvelope && envelopeBasis > 0;
        return (
          <Card key={envelope}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>{envelope}</CardTitle>
                <p className="mt-1 text-lg font-semibold tracking-tight">
                  {formatEuro(envelopeValue)}
                  <span className={`ml-2 text-sm ${signClass(envelopePnL)}`}>
                    {envelopePnL >= 0 ? "+" : ""}
                    {formatEuro(envelopePnL)}
                    {showPnLPct && (
                      <span className="ml-1 text-xs">
                        ({formatPercent(envelopePnL / envelopeBasis)})
                      </span>
                    )}
                  </span>
                </p>
              </div>
            </CardHeader>
            <CardBody className="divide-y divide-zinc-200 px-0 dark:divide-zinc-800">
              {accounts.map((account) => {
                const meta = accountMap.get(account.accountId);
                const unlock = unlockMap.get(account.accountId);
                const activePositions = account.positions.filter(
                  (p) => p.quantity > 0,
                );
                const closedPositions = account.positions.filter(
                  (p) => p.quantity <= 0,
                );
                return (
                  <div key={account.accountId} className="pt-4 first:pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-zinc-50/70 px-6 py-3 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold tracking-tight">
                          {meta?.label ??
                            (account.accountId === NO_ACCOUNT_ID
                              ? NO_ACCOUNT_LABEL
                              : account.accountId)}
                        </h3>
                        <Badge variant="default">{meta?.type ?? "—"}</Badge>
                        {meta && (
                          <AccountForm
                            accountTypes={AccountType.options}
                            envelopes={Envelope.options}
                            account={meta}
                            trigger="icon"
                            deletionImpact={accountDeletionImpact(
                              workbook,
                              meta.id,
                            )}
                          />
                        )}
                      </div>
                      <div className="font-mono text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {formatEuro(account.marketValue)}
                        {account.cashInterest > 0 &&
                          meta?.envelope !== "LIVRET" && (
                            <span className="ml-2 text-xs font-normal text-emerald-600">
                              + {formatEuro(account.cashInterest)} intérêts
                            </span>
                          )}
                      </div>
                    </div>
                    {unlock && <DeblocageRow unlock={unlock} />}
                    {meta?.envelope === "LIVRET" ? (
                      <LivretSummary
                        principal={account.costBasis}
                        interestRecorded={account.cashInterestRecorded}
                        interestEstimated={account.cashInterestEstimated}
                        balance={account.marketValue}
                        rate={meta?.rate ?? null}
                      />
                    ) : activePositions.length === 0 &&
                      closedPositions.length === 0 ? (
                      <p className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                        Aucune position pour ce compte.
                      </p>
                    ) : (
                      <>
                        {activePositions.length > 0 && (
                          <Table>
                            <THead>
                              <TR>
                                <TH>Actif</TH>
                                <TH className="text-right">Quantité</TH>
                                <TH className="text-right">PRU</TH>
                                <TH className="text-right">Valeur</TH>
                                <TH className="text-right">P&amp;L</TH>
                              </TR>
                            </THead>
                            <TBody>
                              {activePositions.map((p) => (
                                <TR key={p.assetId}>
                                  <TD>
                                    <AssetName position={p} />
                                  </TD>
                                  <TD className="text-right font-mono text-xs">
                                    {formatQuantity(p.quantity)}
                                  </TD>
                                  <TD className="text-right font-mono text-xs">
                                    {formatEuro(p.pru, true)}
                                  </TD>
                                  <TD className="text-right font-mono text-xs">
                                    {p.currentPrice !== null
                                      ? formatEuro(p.marketValue)
                                      : "—"}
                                  </TD>
                                  <TD
                                    className={`text-right font-mono text-xs ${signClass(p.unrealizedPnL)}`}
                                  >
                                    {p.currentPrice !== null
                                      ? formatEuro(p.unrealizedPnL)
                                      : "—"}
                                  </TD>
                                </TR>
                              ))}
                            </TBody>
                          </Table>
                        )}
                        {closedPositions.length > 0 && (
                          <ClosedPositions positions={closedPositions} />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function ClosedPositions({
  positions,
}: {
  positions: AccountAssetPosition[];
}) {
  const total = positions.reduce(
    (s, p) => s + p.realizedPnL + p.realizedIncome,
    0,
  );
  const count = positions.length;
  return (
    <details className="group border-t border-zinc-200 dark:border-zinc-800">
      <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-3 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        <span className="inline-flex items-center gap-1.5">
          <ChevronRight
            className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
            aria-hidden
          />
          {count} position{count > 1 ? "s" : ""} clôturée
          {count > 1 ? "s" : ""}
        </span>
        <span className={`font-mono text-xs ${signClass(total)}`}>
          {total >= 0 ? "+" : ""}
          {formatEuro(total)}
        </span>
      </summary>
      <Table>
        <THead>
          <TR>
            <TH>Actif</TH>
            <TH className="text-right">Plus-value</TH>
            <TH className="text-right">Revenus</TH>
            <TH className="text-right">Total réalisé</TH>
          </TR>
        </THead>
        <TBody>
          {positions.map((p) => {
            const totalReturn = p.realizedPnL + p.realizedIncome;
            return (
              <TR key={p.assetId}>
                <TD>
                  <AssetName position={p} />
                </TD>
                <TD
                  className={`text-right font-mono text-xs ${signClass(p.realizedPnL)}`}
                >
                  {p.realizedPnL >= 0 ? "+" : ""}
                  {formatEuro(p.realizedPnL)}
                </TD>
                <TD className="text-right font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {p.realizedIncome > 0
                    ? `+ ${formatEuro(p.realizedIncome)}`
                    : "—"}
                </TD>
                <TD
                  className={`text-right font-mono text-xs ${signClass(totalReturn)}`}
                >
                  {totalReturn >= 0 ? "+" : ""}
                  {formatEuro(totalReturn)}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </details>
  );
}

function AssetName({ position }: { position: AccountAssetPosition }) {
  const label = position.asset?.label ?? position.assetId;
  if (position.assetId === UNASSIGNED_CASH_ASSET_ID) {
    return <span className="font-medium">{label}</span>;
  }

  return (
    <Link
      href={`/actifs/${encodeURIComponent(position.assetId)}`}
      className="font-medium hover:underline"
    >
      {label}
    </Link>
  );
}

function LivretSummary({
  principal,
  interestRecorded,
  interestEstimated,
  balance,
  rate,
}: {
  principal: number;
  interestRecorded: number;
  interestEstimated: number;
  balance: number;
  rate: number | null;
}) {
  if (balance === 0 && principal === 0) {
    return (
      <p className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
        Aucun mouvement sur ce livret.
      </p>
    );
  }

  return (
    <dl className="space-y-2 px-6 py-4 text-sm">
      <div className="flex items-center justify-between">
        <dt className="text-zinc-500 dark:text-zinc-400">Versements nets</dt>
        <dd className="font-mono">{formatEuro(principal)}</dd>
      </div>
      {interestRecorded > 0 && (
        <div className="flex items-center justify-between">
          <dt className="text-zinc-500 dark:text-zinc-400">Intérêts perçus</dt>
          <dd className="font-mono text-emerald-600">
            + {formatEuro(interestRecorded)}
          </dd>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-semibold dark:border-zinc-800">
        <dt>Solde disponible</dt>
        <dd className="font-mono">{formatEuro(balance)}</dd>
      </div>
      {interestEstimated > 0 && (
        <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
          <dt>
            Intérêts en cours (estimés
            {rate !== null && <> au taux {formatPercent(rate)}</>}, versés à
            l&apos;échéance)
          </dt>
          <dd className="font-mono">+ {formatEuro(interestEstimated)}</dd>
        </div>
      )}
    </dl>
  );
}

function DeblocageRow({ unlock }: { unlock: AccountUnlock }) {
  const horizonLabel = unlock.envelope === "AV" ? "8 ans" : "5 ans";

  if (!unlock.openDateKnown) {
    return (
      <div className="flex items-center gap-2 px-6 py-2 text-xs text-amber-700 dark:text-amber-300">
        <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Déblocage ({horizonLabel}) non calculé : renseigne la date
          d&apos;ouverture du compte via l&apos;icône d&apos;édition.
        </span>
      </div>
    );
  }

  if (unlock.isFullyUnlocked) {
    return (
      <div className="flex items-center gap-2 px-6 py-2 text-xs text-emerald-700 dark:text-emerald-400">
        <LockOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Intégralement débloqué — {formatEuro(unlock.unlockedAmount)}{" "}
          disponible{unlock.envelope === "PEE" ? "" : " (avantage fiscal acquis)"}.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2 text-xs text-zinc-600 dark:text-zinc-400">
      <span className="inline-flex items-center gap-1.5">
        <LockOpen className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
        Débloquable :{" "}
        <span className="font-medium text-emerald-700 dark:text-emerald-400">
          {formatEuro(unlock.unlockedAmount)}
        </span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
        Bloqué :{" "}
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {formatEuro(unlock.lockedAmount)}
        </span>
      </span>
      {unlock.unlockDate && (
        <span>
          {unlock.envelope === "PEE" && unlock.nextUnlockAmount !== null
            ? `Prochain déblocage ${formatRelativeDuration(unlock.unlockDate)} (${formatDate(unlock.unlockDate)}) : ${formatEuro(unlock.nextUnlockAmount)}`
            : `Déblocage ${formatRelativeDuration(unlock.unlockDate)} (${formatDate(unlock.unlockDate)})`}
        </span>
      )}
    </div>
  );
}
