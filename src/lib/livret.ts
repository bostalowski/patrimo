import type { Account, Transaction } from "@/lib/schema";

const QUINZAINES_PER_YEAR = 24;

export type LivretFlow = { date: Date; amount: number };

export type LivretState = {
  principalNet: number;
  recordedInterest: number;
  estimatedInterest: number;
  interest: number;
  availableBalance: number;
  balance: number;
};

export type ProjectionPoint = {
  date: string;
  value: number;
  invested: number;
};

export type LivretProjection = {
  points: ProjectionPoint[];
  finalValue: number;
  totalInterest: number;
  plafondReachedDate: string | null;
};

export function isLivretAccount(account: Account | undefined): boolean {
  return account?.envelope === "LIVRET";
}

function flowAmount(tx: Transaction): number {
  return tx.prixUnitaire && tx.prixUnitaire > 0
    ? tx.quantite * tx.prixUnitaire
    : tx.quantite;
}

export function livretFlows(
  accountId: string,
  transactions: Transaction[],
): LivretFlow[] {
  const flows: LivretFlow[] = [];
  for (const tx of transactions) {
    if (tx.compte !== accountId) continue;
    const amount = flowAmount(tx);
    if (tx.type === "DEPOT") flows.push({ date: tx.date, amount });
    else if (tx.type === "RETRAIT") flows.push({ date: tx.date, amount: -amount });
  }
  flows.sort((a, b) => a.date.getTime() - b.date.getTime());
  return flows;
}

export function livretInterestEvents(
  accountId: string,
  transactions: Transaction[],
): LivretFlow[] {
  const events: LivretFlow[] = [];
  for (const tx of transactions) {
    if (tx.compte !== accountId) continue;
    if (tx.type !== "INTERET") continue;
    events.push({ date: tx.date, amount: flowAmount(tx) });
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

function utc(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

function quinzaineStart(date: Date): Date {
  const day = date.getUTCDate();
  return utc(date.getUTCFullYear(), date.getUTCMonth(), day <= 15 ? 1 : 16);
}

function nextQuinzaine(start: Date): Date {
  if (start.getUTCDate() === 1) {
    return utc(start.getUTCFullYear(), start.getUTCMonth(), 16);
  }
  return utc(start.getUTCFullYear(), start.getUTCMonth() + 1, 1);
}

function depositValueDate(date: Date): Date {
  const day = date.getUTCDate();
  if (day <= 15) return utc(date.getUTCFullYear(), date.getUTCMonth(), 16);
  return utc(date.getUTCFullYear(), date.getUTCMonth() + 1, 1);
}

function withdrawalValueDate(date: Date): Date {
  const day = date.getUTCDate();
  if (day <= 15) return utc(date.getUTCFullYear(), date.getUTCMonth(), 1);
  return utc(date.getUTCFullYear(), date.getUTCMonth(), 16);
}

type Checkpoint = { time: number; interest: number };

type ValueFlow = { valueTime: number; amount: number };

function buildInterestCheckpoints(
  flows: LivretFlow[],
  interestEvents: LivretFlow[],
  rate: number,
  endTime: number,
): Checkpoint[] {
  if (rate <= 0) return [];
  if (flows.length === 0 && interestEvents.length === 0) return [];

  const baseFlows: ValueFlow[] = [
    ...flows.map((flow) => {
      const valueDate =
        flow.amount >= 0
          ? depositValueDate(flow.date)
          : withdrawalValueDate(flow.date);
      return { valueTime: valueDate.getTime(), amount: flow.amount };
    }),
    ...interestEvents.map((event) => ({
      valueTime: depositValueDate(event.date).getTime(),
      amount: event.amount,
    })),
  ].sort((a, b) => a.valueTime - b.valueTime);

  const lastInterestTime = interestEvents.reduce(
    (max, event) => Math.max(max, event.date.getTime()),
    Number.NEGATIVE_INFINITY,
  );

  const firstDate = [...flows, ...interestEvents].reduce(
    (min, flow) => (flow.date.getTime() < min.getTime() ? flow.date : min),
    [...flows, ...interestEvents][0].date,
  );
  const firstQuinzaine = quinzaineStart(firstDate);
  if (firstQuinzaine.getTime() > endTime) return [];

  const checkpoints: Checkpoint[] = [];
  let capitalizedInterest = 0;
  let accruedThisYear = 0;
  let runningInterest = 0;
  let currentYear = firstQuinzaine.getUTCFullYear();
  let flowIndex = 0;
  let base = 0;

  for (
    let quinzaine = firstQuinzaine;
    quinzaine.getTime() <= endTime;
    quinzaine = nextQuinzaine(quinzaine)
  ) {
    const quinzaineTime = quinzaine.getTime();
    const quinzaineYear = quinzaine.getUTCFullYear();

    if (quinzaineYear !== currentYear) {
      capitalizedInterest += accruedThisYear;
      accruedThisYear = 0;
      currentYear = quinzaineYear;
    }

    while (
      flowIndex < baseFlows.length &&
      baseFlows[flowIndex].valueTime <= quinzaineTime
    ) {
      base += baseFlows[flowIndex].amount;
      flowIndex += 1;
    }

    if (quinzaineTime > lastInterestTime) {
      const principal = capitalizedInterest + base;
      if (principal > 0) {
        const quinzaineInterest = (principal * rate) / QUINZAINES_PER_YEAR;
        accruedThisYear += quinzaineInterest;
        runningInterest += quinzaineInterest;
      }
    }

    checkpoints.push({ time: quinzaineTime, interest: runningInterest });
  }

  return checkpoints;
}

function sumInterestUpTo(events: LivretFlow[], time: number): number {
  let total = 0;
  for (const event of events) {
    if (event.date.getTime() <= time) total += event.amount;
  }
  return total;
}

function interestAt(checkpoints: Checkpoint[], time: number): number {
  let result = 0;
  for (const checkpoint of checkpoints) {
    if (checkpoint.time <= time) result = checkpoint.interest;
    else break;
  }
  return result;
}

function principalAt(flows: LivretFlow[], time: number): number {
  let total = 0;
  for (const flow of flows) {
    if (flow.date.getTime() <= time) total += flow.amount;
    else break;
  }
  return total;
}

export function computeLivretState(
  rate: number,
  flows: LivretFlow[],
  interestEvents: LivretFlow[],
  asOf: Date = new Date(),
): LivretState {
  const asOfTime = asOf.getTime();
  const principalNet = principalAt(flows, asOfTime);
  const recordedInterest = sumInterestUpTo(interestEvents, asOfTime);
  const checkpoints = buildInterestCheckpoints(
    flows,
    interestEvents,
    rate,
    asOfTime,
  );
  const estimatedInterest = interestAt(checkpoints, asOfTime);
  const interest = recordedInterest + estimatedInterest;
  return {
    principalNet,
    recordedInterest,
    estimatedInterest,
    interest,
    availableBalance: principalNet + recordedInterest,
    balance: principalNet + interest,
  };
}

export function livretDailyValues(
  flows: LivretFlow[],
  interestEvents: LivretFlow[],
  dates: string[],
): { values: number[]; invested: number[] } {
  const values = new Array<number>(dates.length).fill(0);
  const invested = new Array<number>(dates.length).fill(0);
  if (dates.length === 0) return { values, invested };

  dates.forEach((date, index) => {
    const time = new Date(`${date}T00:00:00Z`).getTime();
    const principal = principalAt(flows, time);
    const recordedInterest = sumInterestUpTo(interestEvents, time);
    invested[index] = principal;
    values[index] = principal + recordedInterest;
  });

  return { values, invested };
}

export function projectLivret(params: {
  startBalance: number;
  rate: number;
  plafond?: number;
  monthlyDeposit: number;
  years: number;
  start?: Date;
}): LivretProjection {
  const { startBalance, rate, plafond, monthlyDeposit, years } = params;
  const start = params.start ?? new Date();
  const startMonth = utc(start.getUTCFullYear(), start.getUTCMonth(), 1);

  let principal = startBalance;
  let accrued = 0;
  let invested = startBalance;
  let plafondReachedDate: string | null = null;

  const toIso = (date: Date) => date.toISOString().slice(0, 10);
  const points: ProjectionPoint[] = [
    { date: toIso(startMonth), value: startBalance, invested },
  ];

  const totalMonths = Math.max(0, Math.round(years * 12));
  for (let month = 1; month <= totalMonths; month += 1) {
    const date = utc(
      startMonth.getUTCFullYear(),
      startMonth.getUTCMonth() + month,
      1,
    );

    const room =
      plafond !== undefined ? Math.max(0, plafond - principal) : Infinity;
    const deposit = Math.max(0, Math.min(monthlyDeposit, room));
    principal += deposit;
    invested += deposit;

    if (rate > 0) accrued += (principal * rate) / 12;

    if (date.getUTCMonth() === 11) {
      principal += accrued;
      accrued = 0;
    }

    if (
      plafond !== undefined &&
      plafondReachedDate === null &&
      principal >= plafond
    ) {
      plafondReachedDate = toIso(date);
    }

    points.push({ date: toIso(date), value: principal + accrued, invested });
  }

  const finalValue = principal + accrued;
  return {
    points,
    finalValue,
    totalInterest: finalValue - invested,
    plafondReachedDate,
  };
}
