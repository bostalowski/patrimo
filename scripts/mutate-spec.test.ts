import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, type Fixture } from "./test-support/fixture-repo";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

describe("scripts/lib/mutate-spec.sh", () => {
  let fx: Fixture | undefined;
  afterEach(() => fx?.cleanup());

  it("excludes *.test.ts and emits production file:start-end hunk specs", () => {
    fx = createFixture("feat/mutate-spec-base");
    fx.writeFile(
      "packages/core/src/thing.ts",
      "export function add(a: number, b: number) {\n  return a + b;\n}\n",
    );
    fx.writeFile(
      "packages/core/src/thing.test.ts",
      "import { it, expect } from 'vitest';\nit('add', () => expect(1).toBe(1));\n",
    );
    fx.commitAll("base with core + test");
    fx.checkout("feat/mutate-spec-hunks", true);
    fx.writeFile(
      "packages/core/src/thing.ts",
      "export function add(a: number, b: number) {\n  return a + b;\n}\nexport function double(n: number) {\n  return n * 2;\n}\n",
    );
    fx.writeFile(
      "packages/core/src/thing.test.ts",
      "import { it, expect } from 'vitest';\nit('add', () => expect(1).toBe(1));\nit('double', () => expect(2).toBe(2));\n",
    );
    fx.writeFile("packages/core/src/brand-new.ts", "export const x = 1;\n");
    fx.commitAll("touch production, test, and add a new file");

    const script = [
      `source "${REPO_ROOT}/scripts/lib/diff.sh"`,
      `source "${REPO_ROOT}/scripts/lib/mutate-spec.sh"`,
      `echo "FILES:"`,
      `changed_core_production_files`,
      `echo "MUTATE:"`,
      `mutate_arg_for_core_diff`,
    ].join("\n");

    const result = spawnSync("bash", ["-c", script], {
      cwd: fx.root,
      env: {
        ...process.env,
        FEATURE_FLOW_ROOT: fx.root,
        FEATURE_FLOW_BASE: "feat/mutate-spec-base",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    const out = `${result.stdout}\n${result.stderr}`;
    expect(out).toContain("packages/core/src/thing.ts");
    expect(out).toContain("packages/core/src/brand-new.ts");
    expect(out).not.toMatch(/thing\.test\.ts/);
    expect(out).toMatch(/thing\.ts:\d+-\d+/);
    // Brand-new file → whole-file mutate token (no :range).
    expect(out).toMatch(/MUTATE:[\s\S]*brand-new\.ts(?!:)/);
  });
});
