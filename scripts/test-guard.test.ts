import { rmSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture } from "./test-support/fixture-repo";

describe("scripts/test-guard.sh", () => {
  let fx: Fixture | undefined;
  afterEach(() => fx?.cleanup());

  it("E4: passes trivially when there is no test-file change at all", () => {
    fx = createFixture("feat/guard-e4");
    fx.writeFile("src/thing.ts", "export const x = 1;\n");
    fx.commitAll("add non-test file");

    const res = fx.run("scripts/test-guard.sh");
    expect(res.status).toBe(0);
  });

  it("N3: fails and names the file when a test file present on the base branch is deleted without justification", () => {
    fx = createFixture("main");
    fx.writeFile("src/thing.test.ts", "import { it, expect } from 'vitest';\nit('works', () => expect(1).toBe(1));\n");
    fx.commitAll("add test on main");
    fx.checkout("feat/guard-n3", true);
    rmSync(path.join(fx.root, "src/thing.test.ts"));
    fx.commitAll("delete test");

    const res = fx.run("scripts/test-guard.sh", [], { FEATURE_FLOW_BASE: "main" });
    expect(res.status).not.toBe(0);
    expect(res.stdout).toContain("src/thing.test.ts");
  });

  it("N4: passes once PROGRESS carries a Test-removal-justified line", () => {
    fx = createFixture("main");
    fx.writeFile("src/thing.test.ts", "import { it, expect } from 'vitest';\nit('works', () => expect(1).toBe(1));\n");
    fx.commitAll("add test on main");
    fx.checkout("feat/guard-n4", true);
    rmSync(path.join(fx.root, "src/thing.test.ts"));
    fx.writeFile(
      "docs/agent/branches/feat-guard-n4/PROGRESS.md",
      "# Progress\n\nTest-removal-justified: duplicated by src/other.test.ts\n",
    );
    fx.commitAll("delete test, justify it");

    const res = fx.run("scripts/test-guard.sh", [], { FEATURE_FLOW_BASE: "main" });
    expect(res.status).toBe(0);
  });

  it("does not false-positive when an added line merely contains \".only(\" inside a string literal (not a real call)", () => {
    // Regression: a meta-test file whose own source embeds `.only(`/`.skip(`
    // as fixture text (exactly what scripts/test-guard.test.ts itself does)
    // must not be flagged — only a line where the statement itself starts
    // with it/test/describe.(skip|only)( is a real offender.
    fx = createFixture("feat/guard-string-literal");
    fx.writeFile(
      "src/meta.test.ts",
      "import { it, expect } from 'vitest';\nit('detects .only( in fixture text', () => {\n  const src = \"it.only('works', () => 1);\";\n  expect(src).toContain('.only(');\n});\n",
    );
    fx.commitAll("add meta-test whose fixture string contains .only(");

    const res = fx.run("scripts/test-guard.sh");
    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain("skip/only added");
  });

  it("fails when .only( is added to a test file without justification", () => {
    fx = createFixture("feat/guard-only");
    fx.writeFile(
      "src/thing.test.ts",
      "import { it, expect } from 'vitest';\nit('works', () => expect(1).toBe(1));\n",
    );
    fx.commitAll("add test");
    fx.writeFile(
      "src/thing.test.ts",
      "import { it, expect } from 'vitest';\nit.only('works', () => expect(1).toBe(1));\n",
    );
    fx.commitAll("add .only");

    const res = fx.run("scripts/test-guard.sh");
    expect(res.status).not.toBe(0);
    expect(res.stdout).toContain("skip/only added");
  });
});
