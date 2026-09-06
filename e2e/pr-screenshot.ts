import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

/**
 * Full-page PNG for PR review (not visual regression / `toHaveScreenshot`).
 *
 * Default dir: `test-results/ui-screenshots/<featureSlug>/` (gitignored).
 * For the PR description, re-run e2e with:
 *   PATRIMO_PR_SCREENSHOT_DIR=docs/agent/branches/<slug>/ui make e2e
 * commit the PNGs, then embed them under `## Screenshots` with **absolute**
 * `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/…` URLs —
 * relative repo paths do not render in GitHub PR bodies
 * (see docs/howto/ui-screenshots-in-pr.md).
 */
export async function capturePrScreenshot(
  page: Page,
  featureSlug: string,
  name: string,
): Promise<string> {
  const root =
    process.env.PATRIMO_PR_SCREENSHOT_DIR ??
    join("test-results", "ui-screenshots", featureSlug);
  mkdirSync(root, { recursive: true });
  const filePath = join(root, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}
