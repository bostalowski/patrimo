import type {
  Account,
  Asset,
  Transaction,
  TransactionType,
  Workbook,
} from "@/lib/schema";
import {
  computeLivretState,
  livretFlows,
  livretInterestEvents,
  type LivretState,
} from "@/lib/livret";

export type PriceMap = Map<string, number>;

export type AssetPosition = {
  assetId: string;
  asset?: Asset;
  quantity: number;
  costBasis: number;
  pru: number;
  realizedIncome: number;
  realizedPnL: number;
  fees: number;
  currentPrice: number | null;
  marketValue: number;
  unrealizedPnL: number;
  totalReturn: number;
  totalReturnPct: number;
};

export type AccountAssetPosition = AssetPosition & { accountId: string };

export type AccountSummary = {
  accountId: string;
  envelope: string;
  positions: AccountAssetPosition[];
  marketValue: number;
  costBasis: number;
  unrealizedPnL: number;
  realizedPnL: number;
  realizedIncome: number;
  cashInterest: number;
  cashInterestRecorded: number;
  cashInterestEstimated: number;
};

export type PortfolioTotals = {
  marketValue: number;
  costBasis: number;
  netInvested: number;
  unrealizedPnL: number;
  realizedPnL: number;
  realizedIncome: number;
  totalReturn: number;
  totalReturnPct: number;
  fees: number;
};

export type Portfolio = {
  assets: AssetPosition[];
  accounts: AccountSummary[];
  totals: PortfolioTotals;
};

type MutablePosition = {
  quantity: number;
  costBasis: number;
  realizedIncome: number;
  realizedPnL: number;
  fees: number;
};

type Key = string;
const accountAssetKey = (accountId: string, assetId: string): Key =>
  `${accountId}::${assetId}`;

const INCOME_ASSET = "INTERETS";

function emptyPosition(): MutablePosition {
  return {
    quantity: 0,
    costBasis: 0,
    realizedIncome: 0,
    realizedPnL: 0,
    fees: 0,
  };
}

function ensure<K, V>(map: Map<K, V>, key: K, factory: () => V): V {
  const existing = map.get(key);
  if (existing !== undefined) return existing;
  const created = factory();
  map.set(key, created);
  return created;
}

function applyTransaction(
  tx: Transaction,
  perAccount: Map<Key, MutablePosition>,
  perAsset: Map<string, MutablePosition>,
  perAccountCash: Map<string, { interest: number; net: number }>,
): void {
  const accountKey = accountAssetKey(tx.compte, tx.actif);
  const accountPos = ensure(perAccount, accountKey, emptyPosition);
  const assetPos = ensure(perAsset, tx.actif, emptyPosition);
  const cash = ensure(perAccountCash, tx.compte, () => ({ interest: 0, net: 0 }));

  const fees = tx.frais ?? 0;
  const price = tx.prixUnitaire ?? 0;
  const qty = tx.quantite;

  switch (tx.type as TransactionType) {
    case "ACHAT": {
      const grossCost = qty * price;
      const totalCost = grossCost + fees;
      accountPos.quantity += qty;
      accountPos.costBasis += totalCost;
      accountPos.fees += fees;
      assetPos.quantity += qty;
      assetPos.costBasis += totalCost;
      assetPos.fees += fees;
      cash.net -= totalCost;
      break;
    }

    case "VENTE": {
      const proceeds = qty * price - fees;
      const accountPru =
        accountPos.quantity > 0 ? accountPos.costBasis / accountPos.quantity : 0;
      const accountBasisSold = accountPru * qty;
      accountPos.quantity -= qty;
      accountPos.costBasis -= accountBasisSold;
      accountPos.realizedPnL += proceeds - accountBasisSold;
      accountPos.fees += fees;

      const assetPru =
        assetPos.quantity > 0 ? assetPos.costBasis / assetPos.quantity : 0;
      const assetBasisSold = assetPru * qty;
      assetPos.quantity -= qty;
      assetPos.costBasis -= assetBasisSold;
      assetPos.realizedPnL += proceeds - assetBasisSold;
      assetPos.fees += fees;

      cash.net += proceeds;
      break;
    }

    case "DIVIDENDE": {
      if (price > 0) {
        const income = qty * price - fees;
        accountPos.realizedIncome += income;
        assetPos.realizedIncome += income;
        accountPos.fees += fees;
        assetPos.fees += fees;
        cash.net += income;
      } else {
        accountPos.quantity += qty;
        assetPos.quantity += qty;
      }
      break;
    }

    case "INTERET": {
      const income = qty * price - fees;
      cash.interest += income;
      cash.net += income;
      if (tx.actif !== INCOME_ASSET) {
        assetPos.realizedIncome += income;
      }
      break;
    }

    case "DEPOT": {
      const amount = qty * price;
      cash.net += amount;
      break;
    }

    case "RETRAIT": {
      const accountPru =
        accountPos.quantity > 0 ? accountPos.costBasis / accountPos.quantity : 0;
      const basisRemoved = accountPru * qty;
      accountPos.quantity -= qty;
      accountPos.costBasis -= basisRemoved;
      const assetPru =
        assetPos.quantity > 0 ? assetPos.costBasis / assetPos.quantity : 0;
      assetPos.quantity -= qty;
      assetPos.costBasis -= assetPru * qty;
      break;
    }

    case "TRANSFERT": {
      const destinationId = tx.compteDestination;
      if (!destinationId) {
        throw new Error(`TRANSFERT without compteDestination on ${tx.date.toISOString()}`);
      }
      const destinationKey = accountAssetKey(destinationId, tx.actif);
      const destinationPos = ensure(perAccount, destinationKey, emptyPosition);
      const networkFee = tx.fraisDevise === tx.actif ? fees : 0;
      const sourcePru =
        accountPos.quantity > 0 ? accountPos.costBasis / accountPos.quantity : 0;
      const basisMoved = sourcePru * qty;
      accountPos.quantity -= qty;
      accountPos.costBasis -= basisMoved;
      destinationPos.quantity += qty - networkFee;
      destinationPos.costBasis += basisMoved;
      assetPos.quantity -= networkFee;
      break;
    }

    default:
      throw new Error(`Unhandled transaction type: ${tx.type}`);
  }
}

function materializePosition(
  assetId: string,
  base: MutablePosition,
  assetMap: Map<string, Asset>,
  prices: PriceMap,
): AssetPosition {
  const asset = assetMap.get(assetId);
  const price = prices.get(assetId) ?? null;
  const marketValue = price !== null ? base.quantity * price : 0;
  const pru = base.quantity > 0 ? base.costBasis / base.quantity : 0;
  const unrealizedPnL = price !== null ? marketValue - base.costBasis : 0;
  const totalReturn =
    base.realizedPnL + base.realizedIncome + (price !== null ? unrealizedPnL : 0);
  const totalReturnPct =
    base.costBasis > 0 ? totalReturn / base.costBasis : 0;

  return {
    assetId,
    asset,
    quantity: base.quantity,
    costBasis: base.costBasis,
    pru,
    realizedIncome: base.realizedIncome,
    realizedPnL: base.realizedPnL,
    fees: base.fees,
    currentPrice: price,
    marketValue,
    unrealizedPnL,
    totalReturn,
    totalReturnPct,
  };
}

function livretAccountPosition(
  account: Account,
  state: LivretState,
): AssetPosition {
  return {
    assetId: account.id,
    asset: {
      id: account.id,
      label: "Liquidités",
      type: "CASH",
      source: "manual",
      currency: "EUR",
    },
    quantity: state.availableBalance,
    costBasis: state.principalNet,
    pru: 1,
    realizedIncome: state.recordedInterest,
    realizedPnL: 0,
    fees: 0,
    currentPrice: 1,
    marketValue: state.availableBalance,
    unrealizedPnL: 0,
    totalReturn: state.recordedInterest,
    totalReturnPct:
      state.principalNet > 0 ? state.recordedInterest / state.principalNet : 0,
  };
}

export function buildPortfolio(
  workbook: Workbook,
  prices: PriceMap,
): Portfolio {
  const perAccount = new Map<Key, MutablePosition>();
  const perAsset = new Map<string, MutablePosition>();
  const perAccountCash = new Map<
    string,
    { interest: number; net: number }
  >();

  const assetMap = new Map(workbook.assets.map((a) => [a.id, a]));
  const accountMap = new Map(workbook.accounts.map((a) => [a.id, a]));
  const livretAccounts = workbook.accounts.filter(
    (a) => a.envelope === "LIVRET",
  );
  const livretAccountIds = new Set(livretAccounts.map((a) => a.id));

  for (const tx of workbook.transactions) {
    if (livretAccountIds.has(tx.compte)) continue;
    applyTransaction(tx, perAccount, perAsset, perAccountCash);
  }

  const assetPositions: AssetPosition[] = [];
  for (const [assetId, base] of perAsset.entries()) {
    if (assetId === INCOME_ASSET) continue;
    assetPositions.push(materializePosition(assetId, base, assetMap, prices));
  }
  assetPositions.sort((a, b) => b.marketValue - a.marketValue);

  const accountPositions = new Map<string, AccountAssetPosition[]>();
  for (const [key, base] of perAccount.entries()) {
    const [accountId, assetId] = key.split("::");
    if (assetId === INCOME_ASSET) continue;
    if (base.quantity === 0 && base.costBasis === 0 && base.realizedPnL === 0)
      continue;
    const position = materializePosition(assetId, base, assetMap, prices);
    const list = accountPositions.get(accountId) ?? [];
    list.push({ ...position, accountId });
    accountPositions.set(accountId, list);
  }

  const now = new Date();
  const livretStateByAccount = new Map<string, LivretState>();
  let livretMarketValue = 0;
  let livretCostBasis = 0;
  for (const account of livretAccounts) {
    const flows = livretFlows(account.id, workbook.transactions);
    const interestEvents = livretInterestEvents(
      account.id,
      workbook.transactions,
    );
    if (flows.length === 0 && interestEvents.length === 0) continue;
    const state = computeLivretState(
      account.rate ?? 0,
      flows,
      interestEvents,
      now,
    );
    const position = livretAccountPosition(account, state);
    const list = accountPositions.get(account.id) ?? [];
    list.push({ ...position, accountId: account.id });
    accountPositions.set(account.id, list);
    livretStateByAccount.set(account.id, state);
    livretMarketValue += state.availableBalance;
    livretCostBasis += state.principalNet;
  }

  const accounts: AccountSummary[] = [];
  for (const [accountId, positions] of accountPositions.entries()) {
    const cash = perAccountCash.get(accountId);
    const account = accountMap.get(accountId);
    const livretState = livretStateByAccount.get(accountId);
    const marketValue = positions.reduce((s, p) => s + p.marketValue, 0);
    const costBasis = positions.reduce((s, p) => s + p.costBasis, 0);
    accounts.push({
      accountId,
      envelope: account?.envelope ?? "CTO",
      positions: positions.sort((a, b) => b.marketValue - a.marketValue),
      marketValue,
      costBasis,
      unrealizedPnL: positions.reduce((s, p) => s + p.unrealizedPnL, 0),
      realizedPnL: positions.reduce((s, p) => s + p.realizedPnL, 0),
      realizedIncome: positions.reduce((s, p) => s + p.realizedIncome, 0),
      cashInterest: livretState?.recordedInterest ?? cash?.interest ?? 0,
      cashInterestRecorded: livretState?.recordedInterest ?? 0,
      cashInterestEstimated: livretState?.estimatedInterest ?? 0,
    });
  }
  accounts.sort((a, b) => b.marketValue - a.marketValue);

  const totalsCostBasis =
    assetPositions.reduce((s, p) => s + p.costBasis, 0) + livretCostBasis;
  const totalsMarketValue =
    assetPositions.reduce((s, p) => s + p.marketValue, 0) + livretMarketValue;
  const totalsRealizedPnL = assetPositions.reduce((s, p) => s + p.realizedPnL, 0);
  const totalsRealizedIncome = assetPositions.reduce(
    (s, p) => s + p.realizedIncome,
    0,
  );
  const totalsCashInterest = accounts.reduce((s, a) => s + a.cashInterest, 0);
  const totalsUnrealized = assetPositions.reduce(
    (s, p) => s + p.unrealizedPnL,
    0,
  );
  const totalsFees = assetPositions.reduce((s, p) => s + p.fees, 0);
  const totalReturn =
    totalsUnrealized + totalsRealizedPnL + totalsRealizedIncome + totalsCashInterest;
  const netInvested = totalsCostBasis;

  return {
    assets: assetPositions,
    accounts,
    totals: {
      marketValue: totalsMarketValue,
      costBasis: totalsCostBasis,
      netInvested,
      unrealizedPnL: totalsUnrealized,
      realizedPnL: totalsRealizedPnL,
      realizedIncome: totalsRealizedIncome + totalsCashInterest,
      totalReturn,
      totalReturnPct: netInvested > 0 ? totalReturn / netInvested : 0,
      fees: totalsFees,
    },
  };
}
