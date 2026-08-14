export type EmergencyFundStatus =
  | "insufficient"
  | "acceptable"
  | "healthy"
  | "over_allocated";

export type EmergencyFundHealth = {
  coverageMonths: number;
  status: EmergencyFundStatus;
  livretBalance: number;
  monthlyExpenses: number;
};

const MONTHS_INSUFFICIENT = 3;
const MONTHS_ACCEPTABLE = 6;
const MONTHS_HEALTHY = 12;

export function sumLivretMarketValue(
  accounts: Array<{ envelope: string; marketValue: number }>,
): number {
  return accounts
    .filter((account) => account.envelope === "LIVRET")
    .reduce((sum, account) => sum + account.marketValue, 0);
}

export function computeEmergencyFundHealth(
  livretBalance: number,
  monthlyExpenses: number,
): EmergencyFundHealth | null {
  if (monthlyExpenses <= 0) return null;

  const coverageMonths = livretBalance / monthlyExpenses;
  return {
    coverageMonths,
    status: statusForCoverage(coverageMonths),
    livretBalance,
    monthlyExpenses,
  };
}

function statusForCoverage(coverageMonths: number): EmergencyFundStatus {
  if (coverageMonths < MONTHS_INSUFFICIENT) return "insufficient";
  if (coverageMonths < MONTHS_ACCEPTABLE) return "acceptable";
  if (coverageMonths < MONTHS_HEALTHY) return "healthy";
  return "over_allocated";
}
