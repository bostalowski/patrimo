import type { DcaConfig } from "./schema";

export type SubAllocation = {
  assetId: string;
  currentValue: number;
  currentPct: number;
  contribution: number;
  postValue: number;
  postPct: number;
};

export type BasketAllocation = {
  label?: string;
  assetIds: string[];
  targetPct: number;
  currentValue: number;
  currentPct: number;
  contribution: number;
  postValue: number;
  postPct: number;
  sub: SubAllocation[];
};

export type DcaPlan = {
  configId: string;
  amount: number;
  totalCurrent: number;
  totalAfter: number;
  targetSum: number;
  targetValid: boolean;
  allocations: BasketAllocation[];
};

const TARGET_SUM_TOLERANCE = 0.001;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function splitWithinBasket(
  assetIds: string[],
  basketContribution: number,
  currentValues: Record<string, number>,
): number[] {
  const subValues = assetIds.map((id) => currentValues[id] ?? 0);
  const sumSub = subValues.reduce((s, v) => s + v, 0);
  if (basketContribution <= 0) return assetIds.map(() => 0);
  if (sumSub <= 0) {
    const each = basketContribution / assetIds.length;
    return assetIds.map(() => each);
  }
  return subValues.map((v) => basketContribution * (v / sumSub));
}

export function computeDcaPlan(
  config: DcaConfig,
  currentValues: Record<string, number>,
): DcaPlan {
  const lines = config.lines;
  const monthly = Math.max(0, config.amount);

  const targetSum = lines.reduce((sum, line) => sum + line.targetPct, 0);
  const targetValid = Math.abs(targetSum - 1) < TARGET_SUM_TOLERANCE;

  const basketCurrents = lines.map((line) =>
    line.assetIds.reduce((s, id) => s + (currentValues[id] ?? 0), 0),
  );
  const totalCurrent = basketCurrents.reduce((s, v) => s + v, 0);
  const totalAfter = totalCurrent + monthly;

  const rawDeficit = lines.map((line, i) =>
    Math.max(0, line.targetPct * totalAfter - basketCurrents[i]),
  );
  const sumRaw = rawDeficit.reduce((s, v) => s + v, 0);

  let basketContributions: number[];
  if (monthly <= 0) {
    basketContributions = lines.map(() => 0);
  } else if (sumRaw <= 0) {
    basketContributions = lines.map((line) => line.targetPct * monthly);
  } else if (sumRaw > monthly) {
    const scale = monthly / sumRaw;
    basketContributions = rawDeficit.map((value) => value * scale);
  } else {
    const surplus = monthly - sumRaw;
    basketContributions = rawDeficit.map(
      (value, i) => value + surplus * lines[i].targetPct,
    );
  }

  const subContributionsRaw: number[][] = lines.map((line, i) =>
    splitWithinBasket(line.assetIds, basketContributions[i], currentValues),
  );

  const subContributionsRounded: number[][] = subContributionsRaw.map((arr) =>
    arr.map(roundCents),
  );
  if (monthly > 0) {
    const flatTotal = subContributionsRounded.reduce(
      (s, arr) => s + arr.reduce((a, b) => a + b, 0),
      0,
    );
    const drift = roundCents(monthly - flatTotal);
    if (Math.abs(drift) >= 0.01) {
      let bestI = 0;
      let bestJ = 0;
      let bestValue = -Infinity;
      for (let i = 0; i < subContributionsRaw.length; i++) {
        for (let j = 0; j < subContributionsRaw[i].length; j++) {
          if (subContributionsRaw[i][j] > bestValue) {
            bestValue = subContributionsRaw[i][j];
            bestI = i;
            bestJ = j;
          }
        }
      }
      subContributionsRounded[bestI][bestJ] = roundCents(
        subContributionsRounded[bestI][bestJ] + drift,
      );
    }
  }

  const allocations: BasketAllocation[] = lines.map((line, i) => {
    const subContribs = subContributionsRounded[i];
    const sub: SubAllocation[] = line.assetIds.map((assetId, j) => {
      const currentValue = currentValues[assetId] ?? 0;
      const contribution = subContribs[j];
      const postValue = currentValue + contribution;
      return {
        assetId,
        currentValue,
        currentPct: totalCurrent > 0 ? currentValue / totalCurrent : 0,
        contribution,
        postValue,
        postPct: totalAfter > 0 ? postValue / totalAfter : 0,
      };
    });

    const basketContribution = sub.reduce((s, v) => s + v.contribution, 0);
    const basketCurrent = basketCurrents[i];
    const basketPost = basketCurrent + basketContribution;
    return {
      label: line.label,
      assetIds: line.assetIds,
      targetPct: line.targetPct,
      currentValue: basketCurrent,
      currentPct: totalCurrent > 0 ? basketCurrent / totalCurrent : 0,
      contribution: basketContribution,
      postValue: basketPost,
      postPct: totalAfter > 0 ? basketPost / totalAfter : 0,
      sub,
    };
  });

  return {
    configId: config.id,
    amount: monthly,
    totalCurrent,
    totalAfter,
    targetSum,
    targetValid,
    allocations,
  };
}

export type ExecutionLineStatus = "BUY" | "BUY_FRACTIONAL" | "BELOW_MIN";

export type ExecutionLine = {
  assetId: string;
  targetAmount: number;
  sharePrice: number;
  shares: number;
  fractionalShares: number | null;
  orderAmount: number;
  remainder: number;
  status: ExecutionLineStatus;
};

export type RotationAdvice = {
  focusAssetId: string;
  focusShares: number;
  focusOrderAmount: number;
  rotationMonths: number;
};

export type DcaExecution = {
  configId: string;
  totalBudget: number;
  totalOrderAmount: number;
  totalRemainder: number;
  lines: ExecutionLine[];
  rotation: RotationAdvice | null;
};

export function computeDcaExecution(
  plan: DcaPlan,
  priceMap: Map<string, number>,
  minOrderAmount: number,
): DcaExecution {
  const lines: ExecutionLine[] = [];

  for (const allocation of plan.allocations) {
    for (const sub of allocation.sub) {
      const sharePrice = priceMap.get(sub.assetId);
      if (!sharePrice || sharePrice <= 0) {
        lines.push({
          assetId: sub.assetId,
          targetAmount: sub.contribution,
          sharePrice: sharePrice ?? 0,
          shares: 0,
          fractionalShares: null,
          orderAmount: 0,
          remainder: sub.contribution,
          status: "BELOW_MIN",
        });
        continue;
      }

      const targetAmount = sub.contribution;

      if (minOrderAmount > 0 && targetAmount < minOrderAmount) {
        lines.push({
          assetId: sub.assetId,
          targetAmount,
          sharePrice,
          shares: 0,
          fractionalShares: null,
          orderAmount: 0,
          remainder: targetAmount,
          status: "BELOW_MIN",
        });
        continue;
      }

      const rawShares = Math.floor(targetAmount / sharePrice);
      let shares = rawShares;
      let orderAmount = shares * sharePrice;

      if (minOrderAmount > 0 && orderAmount < minOrderAmount && targetAmount >= minOrderAmount) {
        shares = Math.ceil(minOrderAmount / sharePrice);
        orderAmount = shares * sharePrice;
      }

      if (shares === 0 && minOrderAmount === 0) {
        const fractional = Math.floor((targetAmount / sharePrice) * 1e8) / 1e8;
        lines.push({
          assetId: sub.assetId,
          targetAmount,
          sharePrice,
          shares: 0,
          fractionalShares: fractional,
          orderAmount: targetAmount,
          remainder: 0,
          status: "BUY_FRACTIONAL",
        });
        continue;
      }

      if (shares === 0) {
        lines.push({
          assetId: sub.assetId,
          targetAmount,
          sharePrice,
          shares: 0,
          fractionalShares: null,
          orderAmount: 0,
          remainder: targetAmount,
          status: "BELOW_MIN",
        });
        continue;
      }

      lines.push({
        assetId: sub.assetId,
        targetAmount,
        sharePrice,
        shares,
        fractionalShares: null,
        orderAmount,
        remainder: roundCents(targetAmount - orderAmount),
        status: "BUY",
      });
    }
  }

  const totalOrderAmount = lines.reduce((s, l) => s + l.orderAmount, 0);

  const belowMinLines = lines.filter((l) => l.status === "BELOW_MIN" && l.sharePrice > 0);
  let rotation: RotationAdvice | null = null;

  if (belowMinLines.length > 1 && minOrderAmount > 0) {
    const combinedBudget = belowMinLines.reduce((s, l) => s + l.targetAmount, 0);
    const sorted = [...belowMinLines].sort((a, b) => b.targetAmount - a.targetAmount);
    const focus = sorted[0];
    const focusShares = Math.floor(combinedBudget / focus.sharePrice);
    const focusOrderAmount = focusShares * focus.sharePrice;

    if (focusShares > 0 && focusOrderAmount >= minOrderAmount) {
      rotation = {
        focusAssetId: focus.assetId,
        focusShares,
        focusOrderAmount,
        rotationMonths: belowMinLines.length,
      };
    }
  } else if (belowMinLines.length === 1 && minOrderAmount > 0) {
    const line = belowMinLines[0];
    const monthsToAccumulate = Math.ceil(minOrderAmount / line.targetAmount);
    const accumulatedBudget = line.targetAmount * monthsToAccumulate;
    const shares = Math.floor(accumulatedBudget / line.sharePrice);
    if (shares > 0) {
      rotation = {
        focusAssetId: line.assetId,
        focusShares: shares,
        focusOrderAmount: shares * line.sharePrice,
        rotationMonths: monthsToAccumulate,
      };
    }
  }

  return {
    configId: plan.configId,
    totalBudget: plan.amount,
    totalOrderAmount: roundCents(totalOrderAmount),
    totalRemainder: roundCents(plan.amount - totalOrderAmount),
    lines,
    rotation,
  };
}
