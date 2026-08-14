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
  if (coverageMonths < 3) return "insufficient";
  if (coverageMonths < 6) return "acceptable";
  if (coverageMonths < 12) return "healthy";
  return "over_allocated";
}
