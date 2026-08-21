import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Isolated data dir so e2e never writes `./data/config.json`. */
const e2eDataDir =
  process.env.FINGRAPHS_E2E_DATA_DIR ?? mkdtempSync(join(tmpdir(), "patrimo-e2e-"));

/** Dedicated port so a local `next dev` on :3000 is never reused (that would skip FINGRAPHS_DATA_DIR). */
const e2ePort = process.env.FINGRAPHS_E2E_PORT ?? "3100";
const e2eOrigin = `http://127.0.0.1:${e2ePort}`;

/** Separate Next distDir so `.next/dev/lock` from a developer server does not block e2e. */
const e2eDistDir = process.env.FINGRAPHS_E2E_DIST_DIR ?? ".next-e2e";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: e2eOrigin,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev --port ${e2ePort}`,
    url: `${e2eOrigin}/reglages`,
    // Always start our own server with FINGRAPHS_DATA_DIR — never attach to a developer server.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      FINGRAPHS_DATA_DIR: e2eDataDir,
      FINGRAPHS_E2E_DIST_DIR: e2eDistDir,
    },
  },
});
