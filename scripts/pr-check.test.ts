import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture } from "./test-support/fixture-repo";
import { minimalProgress, minimalTierBContract } from "./test-support/tier-b-contract";

const FULL_TRANCHES =
  "| # | Tranche | Behavior cases covered | Layers | PR |\n|---|---|---|---|---|\n| 1 | fixture | N1, N2, E1 | L1 | pending |";

describe("scripts/pr-check.sh", () => {
  let fx: Fixture | undefined;
  afterEach(() => fx?.cleanup());

  it("N5: fails when there is no Checker: Pass line at all", () => {
    fx = createFixture("feat/prcheck-nopass");
    fx.writeContract(minimalTierBContract({ tranchesRow: FULL_TRANCHES }));
    fx.writeProgress(minimalProgress());
    fx.commitAll("no checker pass yet");

    const res = fx.run("scripts/pr-check.sh");
    expect(res.status).not.toBe(0);
    expect(res.stdout).toContain("no 'Checker: Pass (date)' line");
  });

  it("N5: fails when Checker: Pass predates the latest commit", () => {
    fx = createFixture("feat/prcheck-stale");
    fx.writeContract(minimalTierBContract({ tranchesRow: FULL_TRANCHES }));
    fx.writeProgress(
      `${minimalProgress()}\n- Checker: Pass (2000-01-01)\n- Checker evidence: ran fixture checks\n`,
    );
    fx.commitAll("stale checker pass");

    const res = fx.run("scripts/pr-check.sh");
    expect(res.status).not.toBe(0);
    expect(res.stdout).toContain("predates latest commit");
  });

  it("E6: fails when Checker: Pass has no cited evidence line", () => {
    fx = createFixture("feat/prcheck-noevidence");
    fx.writeContract(minimalTierBContract({ tranchesRow: FULL_TRANCHES }));
    fx.writeProgress(`${minimalProgress()}\n- Checker: Pass (2099-01-01)\n`);
    fx.commitAll("checker pass with no evidence");

    const res = fx.run("scripts/pr-check.sh");
    expect(res.status).not.toBe(0);
    expect(res.stdout).toContain("Checker evidence");
  });

  it("E3: on a Tier A CONTRACT, skips the RED-evidence check but still requires a fresh, cited Checker Pass", () => {
    fx = createFixture("feat/prcheck-tiera");
    fx.writeContract(`# Contract: Fixture tier A feature

- Branch: \`feat/fixture\`
- Slug: \`feat-fixture\`
- Cadrage tier: A (Layer 2 \`n/a\`)

## Scope

- [x] One behavior for this branch: fixture doc-only change

## Verification

- Layer 1: \`make verify\`
- Layer 2: n/a
- Layer 3: n/a

## Exclusions

- Not in this branch: fixture exclusion detail here
`);
    fx.writeProgress(
      `${minimalProgress()}\n- Checker: Pass (2099-01-01)\n- Checker evidence: docs-only, verified by hand\n`,
    );
    fx.commitAll("tier A ready");

    const res = fx.run("scripts/pr-check.sh");
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("skipped (Tier A)");
  });

  it("fails a checked-off case whose only PROGRESS mention is a decoy sentence, not a real RED evidence header", () => {
    // Regression for the checker-found exploit: a prose line that merely
    // contains the words "RED evidence" and the ID (even negated, e.g. "still
    // missing RED evidence for N1") must not satisfy section 3 — only the
    // actual "### RED evidence — <ID>…" header red-evidence.sh writes counts.
    fx = createFixture("feat/prcheck-decoy");
    fx.writeContract(minimalTierBContract({ tranchesRow: FULL_TRANCHES, checkedCases: ["N1"] }));
    fx.writeProgress(
      `${minimalProgress()}\n- Checker: Pass (2099-01-01)\n- Checker evidence: ran fixture checks\n\nTODO: still missing RED evidence for N1, need to write it later.\n`,
    );
    fx.commitAll("checked-off N1 with only a decoy PROGRESS line");

    const res = fx.run("scripts/pr-check.sh");
    expect(res.status).not.toBe(0);
    expect(res.stdout).toContain("checked-off case(s) with no RED evidence");
    expect(res.stdout).toContain("N1");
  });

  it("passes a checked-off case whose PROGRESS has the real RED evidence header", () => {
    fx = createFixture("feat/prcheck-real-red");
    fx.writeContract(minimalTierBContract({ tranchesRow: FULL_TRANCHES, checkedCases: ["N1"] }));
    fx.writeProgress(
      `${minimalProgress()}\n- Checker: Pass (2099-01-01)\n- Checker evidence: ran fixture checks\n\n### RED evidence — N1: fixture case (2026-01-01)\n\n- Command: \`true\`\n- SHA: abc1234\n`,
    );
    fx.commitAll("checked-off N1 with real RED evidence header");

    const res = fx.run("scripts/pr-check.sh");
    expect(res.status).toBe(0);
  });

  it("N6: passes when branch-ready is green, Checker Pass is fresh and cited", () => {
    fx = createFixture("feat/prcheck-ready");
    fx.writeContract(minimalTierBContract({ tranchesRow: FULL_TRANCHES }));
    fx.writeProgress(
      `${minimalProgress()}\n- Checker: Pass (2099-01-01)\n- Checker evidence: ran fixture checks, all green\n`,
    );
    fx.commitAll("ready for pr-check");

    const res = fx.run("scripts/pr-check.sh");
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("pr-check: READY");
  });
});
