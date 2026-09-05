import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, type Fixture } from "./test-support/fixture-repo";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const REWORK = path.join(REPO_ROOT, "scripts/lib/rework-log.mjs");

function runRework(fx: Fixture, cmd: string, env: Record<string, string> = {}) {
  return spawnSync("node", [REWORK, cmd], {
    cwd: fx.root,
    env: {
      ...process.env,
      FEATURE_FLOW_ROOT: fx.root,
      FEATURE_FLOW_BASE: env.FEATURE_FLOW_BASE || "main",
      ...env,
    },
    encoding: "utf8",
  });
}

describe("scripts/lib/rework-log.mjs", () => {
  let fx: Fixture | undefined;
  afterEach(() => fx?.cleanup());

  it("stamp writes Touched paths from the diff; check-own passes", () => {
    fx = createFixture("feat/rework-stamp");
    fx.writeFile(
      "docs/agent/rework-log.md",
      `# Rework log\n\n| Date merged | Slug | Feature | Touched | Reworked? (follow-up within 30 days) |\n|---|---|---|---|---|\n`,
    );
    fx.writeFile(
      "docs/agent/branches/feat-rework-stamp/CONTRACT.md",
      "# Contract: Stamp fixture\n\n- Layer 2: n/a\n",
    );
    fx.writeFile("packages/core/src/widget.ts", "export const x = 1;\n");
    fx.commitAll("add widget");

    const stamp = runRework(fx, "stamp", { REWORK_SLUG: "feat-rework-stamp" });
    expect(stamp.status).toBe(0);
    const md = readFileSync(path.join(fx.root, "docs/agent/rework-log.md"), "utf8");
    expect(md).toContain("feat-rework-stamp");
    expect(md).toContain("packages/core/src/widget.ts");

    const own = runRework(fx, "check-own", { REWORK_SLUG: "feat-rework-stamp" });
    expect(own.status).toBe(0);
  });

  it("check-overlap fails when touching an unreworked recent feature path", () => {
    fx = createFixture("feat/rework-base");
    fx.writeFile(
      "docs/agent/rework-log.md",
      `| Date merged | Slug | Feature | Touched | Reworked? (follow-up within 30 days) |
|---|---|---|---|---|
| 2099-01-01 | old-feature | Old | packages/core/src/widget.ts | no |
`,
    );
    fx.writeFile("packages/core/src/widget.ts", "export const x = 1;\n");
    fx.commitAll("baseline widget on main");
    fx.checkout("feat/rework-fix", true);
    fx.writeFile("packages/core/src/widget.ts", "export const x = 2;\n");
    fx.commitAll("fix widget");

    const res = runRework(fx, "check-overlap", {
      FEATURE_FLOW_BASE: "feat/rework-base",
      REWORK_SLUG: "feat-rework-fix",
    });
    expect(res.status).not.toBe(0);
    expect(`${res.stdout}${res.stderr}`).toContain("old-feature");
  });

  it("check-overlap passes once Reworked?=yes", () => {
    fx = createFixture("feat/rework-base2");
    fx.writeFile(
      "docs/agent/rework-log.md",
      `| Date merged | Slug | Feature | Touched | Reworked? (follow-up within 30 days) |
|---|---|---|---|---|
| 2099-01-01 | old-feature | Old | packages/core/src/widget.ts | yes — PR #1 |
`,
    );
    fx.writeFile("packages/core/src/widget.ts", "export const x = 1;\n");
    fx.commitAll("baseline");
    fx.checkout("feat/rework-fix2", true);
    fx.writeFile("packages/core/src/widget.ts", "export const x = 2;\n");
    fx.commitAll("fix again");

    const res = runRework(fx, "check-overlap", {
      FEATURE_FLOW_BASE: "feat/rework-base2",
      REWORK_SLUG: "feat-rework-fix2",
    });
    expect(res.status).toBe(0);
  });

  it("propose with REWORK_ACK=yes marks follow-up after human confirmation", () => {
    fx = createFixture("feat/rework-ack-base");
    fx.writeFile(
      "docs/agent/rework-log.md",
      `| Date merged | Slug | Feature | Touched | Reworked? (follow-up within 30 days) |
|---|---|---|---|---|
| 2099-01-01 | old-feature | Old | packages/core/src/widget.ts | no |
`,
    );
    fx.writeFile("packages/core/src/widget.ts", "export const x = 1;\n");
    fx.commitAll("baseline");
    fx.checkout("feat/rework-ack", true);
    fx.writeFile("packages/core/src/widget.ts", "export const x = 2;\n");
    fx.commitAll("fix");

    const propose = runRework(fx, "propose", {
      FEATURE_FLOW_BASE: "feat/rework-ack-base",
      REWORK_SLUG: "feat-rework-ack",
      REWORK_ACK: "yes",
      REWORK_ACK_NOTE: "PR #99",
    });
    expect(propose.status).toBe(0);
    const md = readFileSync(path.join(fx.root, "docs/agent/rework-log.md"), "utf8");
    expect(md).toMatch(/old-feature.*yes — PR #99/i);

    const overlap = runRework(fx, "check-overlap", {
      FEATURE_FLOW_BASE: "feat/rework-ack-base",
      REWORK_SLUG: "feat-rework-ack",
    });
    expect(overlap.status).toBe(0);
  });

  it("propose with REWORK_ACK=no records n/a — not a rework", () => {
    fx = createFixture("feat/rework-nack-base");
    fx.writeFile(
      "docs/agent/rework-log.md",
      `| Date merged | Slug | Feature | Touched | Reworked? (follow-up within 30 days) |
|---|---|---|---|---|
| 2099-01-01 | old-feature | Old | packages/core/src/widget.ts | no |
`,
    );
    fx.writeFile("packages/core/src/widget.ts", "export const x = 1;\n");
    fx.commitAll("baseline");
    fx.checkout("feat/rework-nack", true);
    fx.writeFile("packages/core/src/widget.ts", "export const x = 2;\n");
    fx.commitAll("unrelated touch");

    const propose = runRework(fx, "propose", {
      FEATURE_FLOW_BASE: "feat/rework-nack-base",
      REWORK_SLUG: "feat-rework-nack",
      REWORK_ACK: "no",
    });
    expect(propose.status).toBe(0);
    const md = readFileSync(path.join(fx.root, "docs/agent/rework-log.md"), "utf8");
    expect(md.toLowerCase()).toContain("n/a — not a rework");

    const overlap = runRework(fx, "check-overlap", {
      FEATURE_FLOW_BASE: "feat/rework-nack-base",
      REWORK_SLUG: "feat-rework-nack",
    });
    expect(overlap.status).toBe(0);
  });

  it("propose without REWORK_ACK in non-TTY prints proposal and exits 1", () => {
    fx = createFixture("feat/rework-dry-base");
    fx.writeFile(
      "docs/agent/rework-log.md",
      `| Date merged | Slug | Feature | Touched | Reworked? (follow-up within 30 days) |
|---|---|---|---|---|
| 2099-01-01 | old-feature | Old | packages/core/src/widget.ts | no |
`,
    );
    fx.writeFile("packages/core/src/widget.ts", "export const x = 1;\n");
    fx.commitAll("baseline");
    fx.checkout("feat/rework-dry", true);
    fx.writeFile("packages/core/src/widget.ts", "export const x = 2;\n");
    fx.commitAll("touch");

    const propose = runRework(fx, "propose", {
      FEATURE_FLOW_BASE: "feat/rework-dry-base",
      REWORK_SLUG: "feat-rework-dry",
    });
    expect(propose.status).not.toBe(0);
    expect(`${propose.stdout}${propose.stderr}`).toContain("old-feature");
    expect(`${propose.stdout}${propose.stderr}`).toMatch(/REWORK_ACK/);
    const md = readFileSync(path.join(fx.root, "docs/agent/rework-log.md"), "utf8");
    expect(md).toMatch(/\| no\s*\|/);
  });
});
