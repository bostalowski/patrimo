# UI screenshots in the PR description

When a change touches **web UI**, the PR description must show what the
feature looks like — not only that Playwright asserts passed.

Procedure companion to `verify-e2e` / gate `dod-verify`. Template slot:
[`.github/pull_request_template.md`](../../.github/pull_request_template.md)
→ `## Screenshots`. Checklist: [pr-checklist.md](pr-checklist.md).

## When

| Situation | Screenshots |
|---|---|
| Web UI change (`verify-e2e` applies for UI) | **Required** — fill `## Screenshots` |
| API / workbook I/O / settings only (no visible UI) | `n/a` in the template |
| Tier A harness / docs-only | `n/a` |

List expected screens / states in the branch CONTRACT under Verification when
`verify-e2e` covers UI (e.g. « Fiscalité after upsert », « Investissements >
Immobilier »).

## How

1. **Feature Playwright spec** under `e2e/<feature>.spec.ts` (not only the
   workbook smoke). Drive setup via API `request`, assert with `page` (same
   pattern as `e2e/property-tax.spec.ts`).
2. **After** green asserts, call `capturePrScreenshot` from
   [`e2e/pr-screenshot.ts`](../../e2e/pr-screenshot.ts):

   ```ts
   await expect(page.getByText("…")).toBeVisible();
   await capturePrScreenshot(page, "property-tax", "fiscalite-apres");
   ```

3. Default output: `test-results/ui-screenshots/<feature>/` (gitignored via
   `/test-results`).
4. For the PR body, write into the branch folder:

   ```bash
   PATRIMO_PR_SCREENSHOT_DIR=docs/agent/branches/<slug>/ui make e2e
   ```

   Commit those PNGs with the feature (or paste/drag images into the GitHub
   PR description). Prefer committed paths so the description stays stable.

5. Embed in the PR description with **absolute** image URLs. Relative paths
   like `docs/agent/branches/<slug>/ui/….png` do **not** render in GitHub PR
   bodies (unlike README / docs pages):

   ```markdown
   ## Screenshots

   ![Fiscalité after](https://raw.githubusercontent.com/<owner>/<repo>/<branch>/docs/agent/branches/<slug>/ui/fiscalite-apres.png)
   ```

   Or drag-drop / paste into the description (uploads to
   `user-images.githubusercontent.com`). Prefer committed PNGs under
   `docs/agent/branches/<slug>/ui/` plus absolute `raw.githubusercontent.com`
   links so the description stays reviewable after refresh.

## Do not

- Use `toHaveScreenshot` / pixel baselines unless you explicitly want visual
  regression (separate, flaky cost — out of scope here).
- Treat screenshots as a substitute for assertions — assert first, then capture.
- Put review PNGs under `test-results/` in the PR (that tree is gitignored).

## Related

- [feature-flow.md](feature-flow.md) — gate `dod-verify`
- [local-dev-setup.md](local-dev-setup.md) — `make e2e`
- Example: `e2e/property-tax.spec.ts`
