// Test-only helper: builds a throwaway git repo so gate scripts (which cd to
// FEATURE_FLOW_ROOT when set) can be exercised without touching this repo's
// own branch/CONTRACT state. Not a *.test.ts file — vitest won't collect it.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

export interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface Fixture {
  root: string;
  slug: string;
  branch: string;
  run(scriptRelPath: string, args?: string[], env?: Record<string, string>): RunResult;
  writeFile(relPath: string, content: string): void;
  writeContract(content: string): void;
  writeProgress(content: string): void;
  readProgress(): string;
  commitAll(message: string): void;
  checkout(name: string, createNew?: boolean): void;
  cleanup(): void;
}

function git(cwd: string, args: string[]) {
  execFileSync("git", args, { cwd, stdio: ["ignore", "ignore", "ignore"] });
}

export function slugify(branch: string): string {
  return branch
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createFixture(branch: string): Fixture {
  const root = mkdtempSync(path.join(tmpdir(), "feature-flow-"));
  git(root, ["init", "-q", "-b", "main"]);
  git(root, ["config", "user.email", "test@example.com"]);
  git(root, ["config", "user.name", "Test"]);
  writeFileSync(path.join(root, "README.md"), "fixture\n");
  git(root, ["add", "-A"]);
  git(root, ["commit", "-q", "-m", "init"]);
  if (branch !== "main") {
    git(root, ["checkout", "-q", "-b", branch]);
  }

  const slug = slugify(branch);
  const branchDir = path.join(root, "docs", "agent", "branches", slug);
  mkdirSync(branchDir, { recursive: true });

  function writeFile(relPath: string, content: string) {
    const p = path.join(root, relPath);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, content);
  }

  function run(scriptRelPath: string, args: string[] = [], env: Record<string, string> = {}): RunResult {
    const scriptPath = path.join(REPO_ROOT, scriptRelPath);
    try {
      const stdout = execFileSync("bash", [scriptPath, ...args], {
        cwd: root,
        env: { ...process.env, FEATURE_FLOW_ROOT: root, ...env },
      });
      return { status: 0, stdout: stdout.toString(), stderr: "" };
    } catch (e) {
      const err = e as { status?: number; stdout?: Buffer; stderr?: Buffer };
      return {
        status: typeof err.status === "number" ? err.status : 1,
        stdout: (err.stdout ?? Buffer.from("")).toString(),
        stderr: (err.stderr ?? Buffer.from("")).toString(),
      };
    }
  }

  function commitAll(message: string) {
    git(root, ["add", "-A"]);
    git(root, ["commit", "-q", "-m", message]);
  }

  return {
    root,
    slug,
    branch,
    run,
    writeFile,
    writeContract: (content) => writeFile(`docs/agent/branches/${slug}/CONTRACT.md`, content),
    writeProgress: (content) => writeFile(`docs/agent/branches/${slug}/PROGRESS.md`, content),
    readProgress: () => readFileSync(path.join(root, `docs/agent/branches/${slug}/PROGRESS.md`), "utf8"),
    commitAll,
    checkout: (name, createNew = false) => git(root, createNew ? ["checkout", "-q", "-b", name] : ["checkout", "-q", name]),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
