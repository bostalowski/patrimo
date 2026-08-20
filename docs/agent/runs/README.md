# Agent run logs

Handoff notes for multi-session or non-trivial work. Short sessions may update only root [PROGRESS.md](../../PROGRESS.md).

## Naming

`YYYY-MM-DD-slug.md` — e.g. `2026-08-20-geo-sync.md`

## Template

```markdown
# Run: <slug>

- Date:
- Goal:
- Feature (FEATURES.md):
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

- [Sprint contract](../sprint-contract.md)
- [Scoring rubric](../scoring-rubric.md)
- [Maker / checker](../../howto/maker-checker.md)
