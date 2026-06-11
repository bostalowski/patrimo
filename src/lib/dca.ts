import type { DcaConfig } from "@/lib/schema";

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
  monthlyAmount: number;
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
  const monthly = Math.max(0, config.monthlyAmount);

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
    monthlyAmount: monthly,
    totalCurrent,
    totalAfter,
    targetSum,
    targetValid,
    allocations,
  };
}
