import { describe, expect, it } from "vitest";
import type { DailyPoint } from "@/lib/portfolio-history";
import { periodReturns, twrIndex } from "@/lib/performance";

function point(date: string, value: number, invested: number): DailyPoint {
  return { date, value, invested };
}

describe("twrIndex", () => {
  it("compounds returns while capital stays invested", () => {
    const series = twrIndex([
      point("2025-01-01", 1000, 1000),
      point("2025-01-02", 1100, 1000),
    ]);
    expect(series[series.length - 1].index).toBeCloseTo(110);
  });

  it("keeps tracking when the portfolio is emptied and later refunded", () => {
    const series = twrIndex([
      point("2025-01-01", 1000, 1000),
      point("2025-01-02", 1200, 1000),
      point("2025-01-03", 0, -50),
      point("2025-01-04", 0, -50),
      point("2025-02-01", 500, 450),
      point("2025-02-02", 550, 450),
    ]);
    const last = series[series.length - 1].index;
    expect(last).toBeGreaterThan(0);
    expect(Number.isFinite(last)).toBe(true);
  });

  it("does not lock the index at zero after a value drop to zero", () => {
    const series = twrIndex([
      point("2025-01-01", 1000, 900),
      point("2025-01-02", 0, 900),
      point("2025-01-03", 1100, 1000),
    ]);
    expect(series[series.length - 1].index).toBeGreaterThan(0);
  });
});

describe("periodReturns", () => {
  it("still reports inception return after the portfolio passed through zero", () => {
    const points: DailyPoint[] = [
      point("2025-01-01", 1000, 1000),
      point("2025-01-02", 1100, 1000),
      point("2025-01-03", 0, -100),
      point("2025-06-01", 600, 500),
      point("2025-06-02", 720, 500),
    ];
    const inception = periodReturns(points).find((p) => p.id === "inception");
    expect(inception?.value).not.toBeNull();
  });
});
