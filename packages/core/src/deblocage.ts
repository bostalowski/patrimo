import type { Envelope, Workbook } from "./schema";
import type { PriceMap, Portfolio } from "./portfolio";

export const LOCK_YEARS: Partial<Record<Envelope, number>> = {
  PEA: 5,
  PEE: 5,
  AV: 8,
};

export type UnlockScheduleEntry = {
  date: Date;
  amount: number;
};

export type AccountUnlock = {
  accountId: string;
  accountLabel: string;
  envelope: Envelope;
  lockYears: number;
  marketValue: number;
  unlockedAmount: number;
  lockedAmount: number;
  isFullyUnlocked: boolean;
  unlockDate: Date | null;
  nextUnlockAmount: number | null;
  openDateKnown: boolean;
  schedule: UnlockScheduleEntry[];
};

type Lot = {
  date: Date;
  quantity: number;
  assetId: string;
};

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

function consumeFifo(lots: Lot[], quantity: number): void {
  let remaining = quantity;
  while (remaining > 0 && lots.length > 0) {
    const oldest = lots[0];
    if (oldest.quantity > remaining) {
      oldest.quantity -= remaining;
      remaining = 0;
    } else {
      remaining -= oldest.quantity;
      lots.shift();
    }
  }
}

function buildPeeLots(accountId: string, workbook: Workbook): Lot[] {
  const lotsByAsset = new Map<string, Lot[]>();
  const queueFor = (assetId: string): Lot[] => {
    const existing = lotsByAsset.get(assetId);
    if (existing) return existing;
    const created: Lot[] = [];
    lotsByAsset.set(assetId, created);
    return created;
  };

  const transactions = workbook.transactions
    .filter(
      (tx) => tx.compte === accountId || tx.compteDestination === accountId,
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const tx of transactions) {
    const price = tx.prixUnitaire ?? 0;
    const incoming = tx.compteDestination === accountId;

    switch (tx.type) {
      case "ACHAT": {
        if (tx.compte === accountId) {
          queueFor(tx.actif).push({
            date: tx.date,
            quantity: tx.quantite,
            assetId: tx.actif,
          });
        }
        break;
      }
      case "DIVIDENDE": {
        if (tx.compte === accountId && price <= 0 && tx.quantite > 0) {
          queueFor(tx.actif).push({
            date: tx.date,
            quantity: tx.quantite,
            assetId: tx.actif,
          });
        }
        break;
      }
      case "VENTE":
      case "RETRAIT": {
        if (tx.compte === accountId) {
          consumeFifo(queueFor(tx.actif), tx.quantite);
        }
        break;
      }
      case "TRANSFERT": {
        if (incoming) {
          queueFor(tx.actif).push({
            date: tx.date,
            quantity: tx.quantite,
            assetId: tx.actif,
          });
        } else if (tx.compte === accountId) {
          consumeFifo(queueFor(tx.actif), tx.quantite);
        }
        break;
      }
    }
  }

  return Array.from(lotsByAsset.values()).flat();
}

function buildPeeUnlock(
  accountId: string,
  accountLabel: string,
  marketValue: number,
  workbook: Workbook,
  prices: PriceMap,
  now: Date,
): AccountUnlock {
  const lots = buildPeeLots(accountId, workbook);

  let unlockedAmount = 0;
  const lockedByDate = new Map<number, UnlockScheduleEntry>();

  for (const lot of lots) {
    if (lot.quantity <= 0) continue;
    const price = prices.get(lot.assetId) ?? 0;
    const value = lot.quantity * price;
    const unlockDate = addYears(lot.date, LOCK_YEARS.PEE ?? 5);

    if (unlockDate.getTime() <= now.getTime()) {
      unlockedAmount += value;
      continue;
    }

    const key = unlockDate.getTime();
    const entry = lockedByDate.get(key);
    if (entry) {
      entry.amount += value;
    } else {
      lockedByDate.set(key, { date: unlockDate, amount: value });
    }
  }

  const schedule = Array.from(lockedByDate.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const lockedAmount = Math.max(0, marketValue - unlockedAmount);
  const next = schedule[0] ?? null;

  return {
    accountId,
    accountLabel,
    envelope: "PEE",
    lockYears: LOCK_YEARS.PEE ?? 5,
    marketValue,
    unlockedAmount,
    lockedAmount,
    isFullyUnlocked: schedule.length === 0,
    unlockDate: next?.date ?? null,
    nextUnlockAmount: next?.amount ?? null,
    openDateKnown: true,
    schedule,
  };
}

function buildDatedUnlock(
  accountId: string,
  accountLabel: string,
  envelope: Envelope,
  lockYears: number,
  marketValue: number,
  openDate: Date | undefined,
  now: Date,
): AccountUnlock {
  if (!openDate) {
    return {
      accountId,
      accountLabel,
      envelope,
      lockYears,
      marketValue,
      unlockedAmount: 0,
      lockedAmount: marketValue,
      isFullyUnlocked: false,
      unlockDate: null,
      nextUnlockAmount: null,
      openDateKnown: false,
      schedule: [],
    };
  }

  const unlockDate = addYears(openDate, lockYears);
  const isFullyUnlocked = unlockDate.getTime() <= now.getTime();

  return {
    accountId,
    accountLabel,
    envelope,
    lockYears,
    marketValue,
    unlockedAmount: isFullyUnlocked ? marketValue : 0,
    lockedAmount: isFullyUnlocked ? 0 : marketValue,
    isFullyUnlocked,
    unlockDate: isFullyUnlocked ? null : unlockDate,
    nextUnlockAmount: isFullyUnlocked ? null : marketValue,
    openDateKnown: true,
    schedule: isFullyUnlocked ? [] : [{ date: unlockDate, amount: marketValue }],
  };
}

export function buildAccountUnlocks(
  workbook: Workbook,
  portfolio: Portfolio,
  prices: PriceMap,
  now: Date = new Date(),
): AccountUnlock[] {
  const marketValueByAccount = new Map(
    portfolio.accounts.map((a) => [a.accountId, a.marketValue]),
  );

  const unlocks: AccountUnlock[] = [];

  for (const account of workbook.accounts) {
    const lockYears = LOCK_YEARS[account.envelope];
    if (lockYears === undefined) continue;

    const marketValue = marketValueByAccount.get(account.id) ?? 0;

    if (account.envelope === "PEE") {
      unlocks.push(
        buildPeeUnlock(
          account.id,
          account.label,
          marketValue,
          workbook,
          prices,
          now,
        ),
      );
    } else {
      unlocks.push(
        buildDatedUnlock(
          account.id,
          account.label,
          account.envelope,
          lockYears,
          marketValue,
          account.openDate,
          now,
        ),
      );
    }
  }

  return unlocks;
}
