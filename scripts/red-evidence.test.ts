import { afterEach, describe, expect, it } from "vitest";
import { createFixture, type Fixture } from "./test-support/fixture-repo";

describe("scripts/red-evidence.sh", () => {
  let fx: Fixture | undefined;
  afterEach(() => fx?.cleanup());

  it("N1: refuses to write RED evidence when CMD passes", () => {
    fx = createFixture("feat/red-n1");
    fx.writeProgress("# Progress\n\n## Notes\n");
    fx.commitAll("init progress");

    const before = fx.readProgress();
    const res = fx.run("scripts/red-evidence.sh", [], { CASE: "N1: passing command", CMD: "true" });

    expect(res.status).not.toBe(0);
    expect(fx.readProgress()).toBe(before);
  });

  it("N2: writes RED evidence (case, command, SHA) when CMD fails", () => {
    fx = createFixture("feat/red-n2");
    fx.writeProgress("# Progress\n\n## Notes\n");
    fx.commitAll("init progress");

    const res = fx.run("scripts/red-evidence.sh", [], { CASE: "N2: failing command", CMD: "false" });

    expect(res.status).toBe(0);
    const progress = fx.readProgress();
    expect(progress).toContain("### RED evidence — N2: failing command");
    expect(progress).toContain("- Command: `false`");
    expect(progress).toMatch(/- SHA: \w+/);
  });

  it("E2: refuses on main/master", () => {
    fx = createFixture("main");
    fx.writeFile("docs/agent/branches/main/PROGRESS.md", "# Progress\n");
    fx.commitAll("progress on main");

    const res = fx.run("scripts/red-evidence.sh", [], { CASE: "N2: irrelevant", CMD: "false" });
    expect(res.status).not.toBe(0);
  });
});
