import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture } from "./test-support/fixture-repo";

describe("scripts/gauntlet.sh", () => {
  let fx: Fixture | undefined;
  afterEach(() => fx?.cleanup());

  it("N9: reports mutation step skipped when no packages/core file is in the diff", () => {
    fx = createFixture("feat/gauntlet-no-core");
    fx.writeFile("src/thing.ts", "export const x = 1;\n");
    fx.commitAll("non-core change");

    const res = fx.run("scripts/gauntlet.sh");
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("skipped — no packages/core/src files in diff");
  });

  it("delegates to test-guard and fails when a test present on the base branch is gutted without justification", () => {
    fx = createFixture("main");
    fx.writeFile("src/thing.test.ts", "import { it, expect } from 'vitest';\nit('works', () => expect(1).toBe(1));\n");
    fx.commitAll("add test on main");
    fx.checkout("feat/gauntlet-guard", true);
    fx.writeFile("src/thing.test.ts", "// removed\n");
    fx.commitAll("gut the test file");

    const res = fx.run("scripts/gauntlet.sh", [], { FEATURE_FLOW_BASE: "main" });
    expect(res.status).not.toBe(0);
  });

  it("reports a duplication signal (informational, never fails the gate) when two changed files share a 6+ line block", () => {
    fx = createFixture("feat/gauntlet-dup");
    const block = Array.from({ length: 8 }, (_, i) => `const line${i} = ${i};`).join("\n");
    fx.writeFile("src/a.ts", `${block}\nexport const a = 1;\n`);
    fx.writeFile("src/b.ts", `${block}\nexport const b = 2;\n`);
    fx.commitAll("two files sharing a duplicated block");

    const res = fx.run("scripts/gauntlet.sh");
    expect(res.status).toBe(0); // informational only — does not fail
    expect(res.stdout).toContain("duplicate");
    expect(res.stdout).toContain("src/a.ts");
    expect(res.stdout).toContain("src/b.ts");
  });

  it("reports mutation step skipped (not configured) when packages/core changes but stryker.conf.json is absent", () => {
    fx = createFixture("feat/gauntlet-core-no-stryker");
    fx.writeFile("packages/core/src/thing.ts", "export const x = 1;\n");
    fx.commitAll("core change, no stryker config in this fixture");

    const res = fx.run("scripts/gauntlet.sh");
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("stryker.conf.json not present yet");
  });
});
