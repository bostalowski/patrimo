# Run: cold-start

- Date: 2026-08-20
- Goal: Fresh-session cold-start map check
- Feature (FEATURES.md): n/a (harness health)
- Sprint contract: n/a
  - Scope: `make cold-start` only
  - Verification commands: `make cold-start`
  - Exclusions: no product code
- Files read: CONSTRAINTS.md, PROGRESS.md, docs/reference/glossary.md, AGENTS.md (via harness skill)
- Changes: none (observability only)
- Verify:
  - Layer 1 `make verify` → n/a
  - Layer 2 targeted tests → n/a
  - Layer 3 `make e2e` → n/a
  - Cold-start map → **5 / 5** (all five questions OK)
- Checker: n/a (scripted score)
- Handoff / next: `make next-feature` → Sector allocation (mobile UI parity)
