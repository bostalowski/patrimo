import type { DcaConfig, Transaction, Workbook } from "./schema";

export const NO_ACCOUNT_ID = "__NO_ACCOUNT__";
export const UNASSIGNED_CASH_ASSET_ID = "__UNASSIGNED_CASH__";
export const NO_ACCOUNT_LABEL = "Aucun compte";
export const UNASSIGNED_CASH_ASSET_LABEL = "Liquidités sans compte";

export type AccountDeletionMode = "cascade" | "detach";

export type DeletionResult = {
  workbook: Workbook;
  deletedAssetIds: string[];
};

export type DeletionImpact = {
  transactionCount: number;
  assetCount: number;
  priceCount: number;
  investmentPlanCount: number;
};

function cleanInvestmentPlans(
  configs: DcaConfig[],
  deletedAssetIds: ReadonlySet<string>,
): DcaConfig[] {
  if (deletedAssetIds.size === 0) return configs;

  return configs.flatMap((config) => {
    const lines = config.lines.flatMap((line) => {
      const assetIds = line.assetIds.filter(
        (assetId) => !deletedAssetIds.has(assetId),
      );
      return assetIds.length > 0 ? [{ ...line, assetIds }] : [];
    });
    return lines.length > 0 ? [{ ...config, lines }] : [];
  });
}

function isAccountTransaction(
  transaction: Transaction,
  accountId: string,
): boolean {
  return (
    transaction.compte === accountId ||
    transaction.compteDestination === accountId
  );
}

function plansReferencing(
  workbook: Workbook,
  assetIds: ReadonlySet<string>,
): number {
  return workbook.dca.filter((config) =>
    config.lines.some((line) =>
      line.assetIds.some((assetId) => assetIds.has(assetId)),
    ),
  ).length;
}

export function accountDeletionImpact(
  workbook: Workbook,
  accountId: string,
): DeletionImpact {
  const relatedTransactions = workbook.transactions.filter((transaction) =>
    isAccountTransaction(transaction, accountId),
  );
  const remainingAssetIds = new Set(
    workbook.transactions
      .filter((transaction) => !isAccountTransaction(transaction, accountId))
      .map((transaction) => transaction.actif),
  );
  const relatedAssetIds = new Set(
    relatedTransactions
      .map((transaction) => transaction.actif)
      .filter((assetId) => assetId.length > 0),
  );
  const deletedAssetIds = new Set(
    workbook.assets
      .filter(
        (asset) =>
          relatedAssetIds.has(asset.id) && !remainingAssetIds.has(asset.id),
      )
      .map((asset) => asset.id),
  );

  return {
    transactionCount: relatedTransactions.length,
    assetCount: deletedAssetIds.size,
    priceCount: deletedAssetIds.size,
    investmentPlanCount: plansReferencing(workbook, deletedAssetIds),
  };
}

export function assetDeletionImpact(
  workbook: Workbook,
  assetId: string,
): DeletionImpact {
  const assetIds = new Set([assetId]);
  return {
    transactionCount: workbook.transactions.filter(
      (transaction) => transaction.actif === assetId,
    ).length,
    assetCount: 1,
    priceCount: 1,
    investmentPlanCount: plansReferencing(workbook, assetIds),
  };
}

export function deleteAccount(
  workbook: Workbook,
  accountId: string,
  mode: AccountDeletionMode,
): DeletionResult {
  const deletedAccount = workbook.accounts.find(
    (account) => account.id === accountId,
  );
  if (!deletedAccount) {
    throw new Error(`Unknown account: ${accountId}`);
  }

  const accounts = workbook.accounts.filter(
    (account) => account.id !== accountId,
  );

  if (mode === "detach") {
    const transactions = workbook.transactions.map((transaction) => {
      if (!isAccountTransaction(transaction, accountId)) return transaction;

      const detached = {
        ...transaction,
        compte:
          transaction.compte === accountId
            ? NO_ACCOUNT_ID
            : transaction.compte,
        compteDestination:
          transaction.compteDestination === accountId
            ? NO_ACCOUNT_ID
            : transaction.compteDestination,
      };

      if (
        deletedAccount.envelope === "LIVRET" &&
        transaction.compte === accountId
      ) {
        detached.actif = UNASSIGNED_CASH_ASSET_ID;
      }

      return detached;
    });

    return {
      workbook: { ...workbook, accounts, transactions },
      deletedAssetIds: [],
    };
  }

  const removedTransactions = workbook.transactions.filter((transaction) =>
    isAccountTransaction(transaction, accountId),
  );
  const transactions = workbook.transactions.filter(
    (transaction) => !isAccountTransaction(transaction, accountId),
  );
  const remainingAssetIds = new Set(
    transactions.map((transaction) => transaction.actif),
  );
  const candidates = new Set(
    removedTransactions
      .map((transaction) => transaction.actif)
      .filter((assetId) => assetId.length > 0),
  );
  const deletedAssetIds = workbook.assets
    .filter(
      (asset) =>
        candidates.has(asset.id) && !remainingAssetIds.has(asset.id),
    )
    .map((asset) => asset.id);
  const deletedAssetIdSet = new Set(deletedAssetIds);

  return {
    workbook: {
      ...workbook,
      accounts,
      transactions,
      assets: workbook.assets.filter(
        (asset) => !deletedAssetIdSet.has(asset.id),
      ),
      dca: cleanInvestmentPlans(workbook.dca, deletedAssetIdSet),
    },
    deletedAssetIds,
  };
}

export function deleteAsset(
  workbook: Workbook,
  assetId: string,
): DeletionResult {
  if (!workbook.assets.some((asset) => asset.id === assetId)) {
    throw new Error(`Unknown asset: ${assetId}`);
  }

  const deletedAssetIds = new Set([assetId]);

  return {
    workbook: {
      ...workbook,
      assets: workbook.assets.filter((asset) => asset.id !== assetId),
      transactions: workbook.transactions.filter(
        (transaction) => transaction.actif !== assetId,
      ),
      dca: cleanInvestmentPlans(workbook.dca, deletedAssetIds),
    },
    deletedAssetIds: [assetId],
  };
}
