#!/usr/bin/env bash
# Gate: branch-ready + RED evidence (checked cases) + Checker Pass recency/
# citation + diff-size signal. See docs/howto/feature-flow.md (gate G6).
# set -uo pipefail (no -e): several checks below run a command and inspect
# its exit code themselves rather than aborting the whole gate on it.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${FEATURE_FLOW_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$ROOT" || exit 1
# shellcheck source=lib/branch-slug.sh
source "$SCRIPT_DIR/lib/branch-slug.sh"
# shellcheck source=lib/diff.sh
source "$SCRIPT_DIR/lib/diff.sh"
# shellcheck source=lib/red-evidence-format.sh
source "$SCRIPT_DIR/lib/red-evidence-format.sh"

BRANCH="$(branch_name)"
if is_integration_branch "$BRANCH"; then
  echo "On $BRANCH: pr-check refuses (not a feature-dev branch)." >&2
  exit 1
fi

SLUG="$(branch_slug "$BRANCH")"
CONTRACT="docs/agent/branches/$SLUG/CONTRACT.md"
PROGRESS="docs/agent/branches/$SLUG/PROGRESS.md"

fail=0
echo "=== PR check ($BRANCH) ==="
echo ""
echo "1. branch-ready"
BR_OUT="$(mktemp)"
trap 'rm -f "$BR_OUT"' EXIT
if FEATURE_FLOW_ROOT="$ROOT" bash "$SCRIPT_DIR/branch-ready.sh" >"$BR_OUT" 2>&1; then
  echo "  OK"
else
  echo "  FAIL"
  sed 's/^/    /' "$BR_OUT"
  fail=1
fi

TIER=B
if [[ -f "$CONTRACT" ]] && grep -qE 'Layer 2:[[:space:]]+n/a' "$CONTRACT"; then
  TIER=A
fi

echo ""
echo "2. Checker Pass recorded, dated on/after latest commit, with cited evidence"
if [[ ! -f "$PROGRESS" ]]; then
  echo "  FAIL — no PROGRESS.md"
  fail=1
else
  pass_line="$(grep -E '^-?[[:space:]]*Checker:[[:space:]]*Pass' "$PROGRESS" | tail -1 || true)"
  if [[ -z "$pass_line" ]]; then
    echo "  FAIL — no 'Checker: Pass (date)' line in PROGRESS"
    fail=1
  else
    pass_date="$(echo "$pass_line" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1 || true)"
    last_commit_date="$(git log -1 --format=%cd --date=short 2>/dev/null || true)"
    if [[ -z "$pass_date" ]]; then
      echo "  FAIL — Checker Pass line has no (YYYY-MM-DD) date"
      fail=1
    elif [[ -n "$last_commit_date" && "$pass_date" < "$last_commit_date" ]]; then
      echo "  FAIL — Checker Pass ($pass_date) predates latest commit ($last_commit_date)"
      fail=1
    else
      echo "  OK — Checker Pass ($pass_date)"
    fi
  fi
  if grep -qE '^-?[[:space:]]*Checker evidence:[[:space:]]*\S' "$PROGRESS"; then
    echo "  OK — Checker evidence line present"
  else
    echo "  FAIL — no 'Checker evidence: …' line — a bare Pass is not enough"
    fail=1
  fi
fi

echo ""
echo "3. RED evidence for every checked-off behavior case (Tier B)"
if [[ "$TIER" == "B" && -f "$CONTRACT" ]]; then
  missing=()
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    # Require the actual header red-evidence.sh writes, via the shared
    # lib/red-evidence-format.sh pattern (not a bare substring — a decoy
    # prose line like "no RED evidence for N1 yet" matched the old check
    # and made this gameable).
    if [[ ! -f "$PROGRESS" ]] || ! grep -qE "$(red_evidence_header_pattern "$id")" "$PROGRESS"; then
      missing+=("$id")
    fi
  done < <(grep -oE '^[[:space:]]*-[[:space:]]*\[[xX]\][[:space:]]*(N[0-9]+|E[0-9]+):' "$CONTRACT" 2>/dev/null | grep -oE '(N[0-9]+|E[0-9]+)')
  if [[ ${#missing[@]} -eq 0 ]]; then
    echo "  OK — every checked-off case has RED evidence (or none are checked off yet)"
  else
    echo "  FAIL — checked-off case(s) with no RED evidence in PROGRESS: ${missing[*]}"
    fail=1
  fi
else
  echo "  skipped (Tier A)"
fi

echo ""
echo "4. Diff size (informational — CONSTRAINTS §26, not a blocker)"
BASE="$(diff_base)"
stat="$(git diff --shortstat "$BASE"...HEAD 2>/dev/null || true)"
echo "  ${stat:-no diff vs $BASE}"

echo ""
echo "5. Rework log reminder (informational — D8, not a blocker)"
if [[ -f docs/agent/rework-log.md ]] && grep -qF "$SLUG" docs/agent/rework-log.md; then
  echo "  OK — docs/agent/rework-log.md already has a row for $SLUG"
else
  echo "  REMINDER — docs/agent/rework-log.md has no row for $SLUG yet; add one after merge"
fi

echo ""
if [[ "$fail" -eq 1 ]]; then
  echo "pr-check: NOT READY"
  exit 1
fi
echo "pr-check: READY"
exit 0
