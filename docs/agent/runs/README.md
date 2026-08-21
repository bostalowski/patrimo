# Agent run logs

Optional dated notes for long or multi-session work. **Primary handoff** for a feature is `docs/agent/branches/<slug>/PROGRESS.md` (`make branch-status`). Root [PROGRESS.md](../../PROGRESS.md) is for `main` only.

## Naming

`YYYY-MM-DD-slug.md` — e.g. `2026-08-20-geo-sync.md`

## Template

```markdown
# Run: <slug>

- Date:
- Goal:
- Branch / CONTRACT: docs/agent/branches/<slug>/CONTRACT.md
- Sprint contract: (inline or link)
  - Scope:
  - Verification commands:
  - Exclusions:
- Files read:
- Changes:
- Verify:
  - Layer 1 `make verify` → pass/fail
  - Layer 2 targeted tests → pass/fail / n/a
  - Layer 3 `make e2e` → pass/fail / n/a
- Checker: Pass/Fail + rubric notes (cite evidence)
- Handoff / next:
```

## Related

- [Branch contracts](../branches/README.md)
- [Sprint contract pointer](../sprint-contract.md)
- [Scoring rubric](../scoring-rubric.md)
- [Maker / checker](../../howto/maker-checker.md)
