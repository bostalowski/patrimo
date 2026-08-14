import { describe, expect, it } from "vitest";
import { computeEmergencyFundHealth } from "@patrimo/core/emergency-fund";

describe("computeEmergencyFundHealth", () => {
  it("returns null when monthly expenses are zero", () => {
    expect(computeEmergencyFundHealth(10_000, 0)).toBeNull();
  });

  it("returns null when monthly expenses are negative", () => {
    expect(computeEmergencyFundHealth(10_000, -100)).toBeNull();
  });

  it("returns insufficient with zero months when livret balance is zero", () => {
    expect(computeEmergencyFundHealth(0, 2_000)).toEqual({
      coverageMonths: 0,
      status: "insufficient",
      livretBalance: 0,
      monthlyExpenses: 2_000,
    });
  });

  it("maps coverage below 3 months to insufficient", () => {
    expect(computeEmergencyFundHealth(5_000, 2_500).status).toBe("insufficient");
  });

  it("maps coverage from 3 inclusive to under 6 as acceptable", () => {
    expect(computeEmergencyFundHealth(9_000, 3_000).status).toBe("acceptable");
    expect(computeEmergencyFundHealth(17_970, 3_000).status).toBe("acceptable");
  });

  it("maps coverage from 6 inclusive to under 12 as healthy", () => {
    expect(computeEmergencyFundHealth(18_000, 3_000).status).toBe("healthy");
    expect(computeEmergencyFundHealth(35_970, 3_000).status).toBe("healthy");
  });

  it("maps coverage of 12 months or more to over_allocated", () => {
    expect(computeEmergencyFundHealth(36_000, 3_000).status).toBe("over_allocated");
  });

  it("returns coverage months as livret balance divided by monthly expenses", () => {
    expect(computeEmergencyFundHealth(9_000, 3_000)).toEqual({
      coverageMonths: 3,
      status: "acceptable",
      livretBalance: 9_000,
      monthlyExpenses: 3_000,
    });
  });
});
