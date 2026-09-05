import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture } from "./test-support/fixture-repo";
import { minimalProgress, minimalTierBContract } from "./test-support/tier-b-contract";

describe("scripts/branch-ready.sh — Tranches coverage (N7)", () => {
  let fx: Fixture | undefined;
  afterEach(() => fx?.cleanup());

  it("fails and names the ID when a behavior case is missing from the Tranches table", () => {
    fx = createFixture("feat/tranches-missing");
    fx.writeContract(
      minimalTierBContract({
        tranchesRow: "| # | Tranche | Behavior cases covered | Layers | PR |\n|---|---|---|---|---|\n| 1 | fixture | N1, N2 | L1 | pending |",
      }),
    );
    fx.writeProgress(minimalProgress());
    fx.commitAll("fixture contract missing E1 from tranches");

    const res = fx.run("scripts/branch-ready.sh");
    expect(res.status).not.toBe(0);
    expect(res.stdout).toContain("E1");
  });

  it("passes the Tranches check when every case ID is covered", () => {
    fx = createFixture("feat/tranches-covered");
    fx.writeContract(
      minimalTierBContract({
        tranchesRow: "| # | Tranche | Behavior cases covered | Layers | PR |\n|---|---|---|---|---|\n| 1 | fixture | N1, N2, E1 | L1 | pending |",
      }),
    );
    fx.writeProgress(minimalProgress());
    fx.commitAll("fixture contract fully covered");

    const res = fx.run("scripts/branch-ready.sh");
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("every behavior-case ID appears in the Tranches table");
  });
});
