import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture } from "./test-support/fixture-repo";

const REAL_ROOT = path.resolve(__dirname, "..");

describe("scripts/orca-role.sh", () => {
  let fx: Fixture | undefined;
  let wtDir: string | undefined;
  afterEach(() => {
    fx?.cleanup();
    if (wtDir) rmSync(wtDir, { recursive: true, force: true });
  });

  it("N10: prints the Framer prompt read verbatim from cadrage-lock.md (not duplicated in the script)", () => {
    fx = createFixture("feat/orca-framer");
    wtDir = mkdtempSync(path.join(tmpdir(), "orca-role-wt-"));
    rmSync(wtDir, { recursive: true, force: true }); // must not exist yet for `git worktree add`

    const res = fx.run("scripts/orca-role.sh", ["framer"], {
      FEATURE_FLOW_NO_ORCA: "1",
      FEATURE_FLOW_WORKTREE_DIR: wtDir,
    });

    const cadrageLock = readFileSync(path.join(REAL_ROOT, "docs/howto/cadrage-lock.md"), "utf8");
    const expectedLine = cadrageLock
      .split("\n")
      .find((l) => l.includes("You are the FRAMER, not the implementer."));
    expect(expectedLine).toBeTruthy();
    expect(res.stdout).toContain(expectedLine!);
  });

  it("N10: prints the Checker prompt read verbatim from scoring-rubric.md", () => {
    fx = createFixture("feat/orca-checker-prompt");
    wtDir = mkdtempSync(path.join(tmpdir(), "orca-role-wt-"));
    rmSync(wtDir, { recursive: true, force: true });

    const res = fx.run("scripts/orca-role.sh", ["checker"], {
      FEATURE_FLOW_NO_ORCA: "1",
      FEATURE_FLOW_WORKTREE_DIR: wtDir,
    });

    const rubric = readFileSync(path.join(REAL_ROOT, "docs/agent/scoring-rubric.md"), "utf8");
    const expectedLine = rubric.split("\n").find((l) => l.includes("You are the CHECKER, not the implementer."));
    expect(expectedLine).toBeTruthy();
    expect(res.stdout).toContain(expectedLine!);
  });

  it("E2: refuses on main/master", () => {
    fx = createFixture("main");

    const res = fx.run("scripts/orca-role.sh", ["checker"], { FEATURE_FLOW_NO_ORCA: "1" });
    expect(res.status).not.toBe(0);
  });

  it("E8: falls back to a plain detached git worktree when Orca is unavailable", () => {
    fx = createFixture("feat/orca-e8");
    wtDir = path.join(tmpdir(), `orca-role-e8-${Date.now()}-${Math.random().toString(36).slice(2)}`);

    const res = fx.run("scripts/orca-role.sh", ["checker"], {
      FEATURE_FLOW_NO_ORCA: "1",
      FEATURE_FLOW_WORKTREE_DIR: wtDir,
    });

    expect(res.status).toBe(0);
    expect(res.stderr).toContain("Orca not available");
    expect(res.stdout).toContain(wtDir);
    const branch = execFileSync("git", ["-C", wtDir, "rev-parse", "--abbrev-ref", "HEAD"]).toString().trim();
    expect(branch).toBe("HEAD"); // detached
  });

  it("E7: --publish fails when the worktree touched a file other than that branch's PROGRESS.md", () => {
    fx = createFixture("feat/orca-e7-fail");
    fx.writeProgress("# Progress\n\n## Notes\n");
    fx.commitAll("init progress");
    wtDir = path.join(tmpdir(), `orca-role-e7fail-${Date.now()}`);
    execFileSync("git", ["-C", fx.root, "worktree", "add", "--detach", wtDir, "feat/orca-e7-fail"]);
    execFileSync("mkdir", ["-p", path.join(wtDir, "src")]);
    writeFileSync(path.join(wtDir, "src", "not-allowed.ts"), "export const x = 1;\n");

    const res = fx.run("scripts/orca-role.sh", ["checker", "--publish", wtDir], { FEATURE_FLOW_NO_ORCA: "1" });
    expect(res.status).not.toBe(0);
    expect(res.stdout + res.stderr).toContain("touched file(s) other than");
  });

  it("E7: --publish succeeds and copies PROGRESS.md when only that file changed", () => {
    fx = createFixture("feat/orca-e7-pass");
    fx.writeProgress("# Progress\n\n## Notes\n");
    fx.commitAll("init progress");
    wtDir = path.join(tmpdir(), `orca-role-e7pass-${Date.now()}`);
    execFileSync("git", ["-C", fx.root, "worktree", "add", "--detach", wtDir, "feat/orca-e7-pass"]);
    const progressRel = `docs/agent/branches/${fx.slug}/PROGRESS.md`;
    writeFileSync(path.join(wtDir, progressRel), "# Progress\n\n## Notes\n\n- Checker: Pass (2099-01-01)\n");

    const res = fx.run("scripts/orca-role.sh", ["checker", "--publish", wtDir], { FEATURE_FLOW_NO_ORCA: "1" });
    expect(res.status).toBe(0);
    expect(fx.readProgress()).toContain("Checker: Pass (2099-01-01)");
  });
});
