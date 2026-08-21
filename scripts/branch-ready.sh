#!/usr/bin/env bash
# Gate: is this feature branch ready to implement? (cadrage filled, not just stubs)
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=lib/branch-slug.sh
source "$(dirname "$0")/lib/branch-slug.sh"

BRANCH="$(branch_name)"
SLUG="$(branch_slug "$BRANCH")"
DIR="docs/agent/branches/$SLUG"
CONTRACT="$DIR/CONTRACT.md"
PROGRESS="$DIR/PROGRESS.md"

score=0
misses=()

pass() { score=$((score + 1)); echo "  OK  $1"; }
fail() { misses+=("$1"); echo "  MISS $1"; }

echo "=== Branch ready ($BRANCH → $SLUG) ==="
echo ""

if is_integration_branch "$BRANCH"; then
  echo "On $BRANCH: not a feature-dev branch."
  echo "Create a feature branch, make branch-contract, fill CONTRACT, then make branch-ready."
  exit 1
fi

echo "1. Artifacts present"
if [[ -f "$CONTRACT" ]]; then
  pass "CONTRACT.md exists"
else
  fail "CONTRACT.md missing — run make branch-contract"
fi
if [[ -f "$PROGRESS" ]]; then
  pass "PROGRESS.md exists"
else
  fail "PROGRESS.md missing — run make branch-contract"
fi

if [[ ! -f "$CONTRACT" ]]; then
  echo ""
  echo "Score: $score / incomplete"
  echo "Not ready."
  exit 1
fi

echo "2. CONTRACT filled (not template stubs)"
if grep -qE '^# Contract: <feature name>' "$CONTRACT"; then
  fail "Title still template (# Contract: <feature name>)"
elif grep -qE '^# Contract: .+' "$CONTRACT"; then
  pass "Title set"
else
  fail "Missing # Contract: title"
fi

if awk '
  /^## Scope/ { section=1; next }
  /^## / { if (section) exit }
  section && /^- / {
    line=$0
    sub(/^- \[[ xX]\] /, "", line)
    sub(/^- /, "", line)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
    if (line == "") next
    if (line ~ /^(One behavior for this branch|Files \/ packages expected to change):?[[:space:]]*$/) next
    if (length(line) >= 8) { found=1; exit }
  }
  END { exit found ? 0 : 1 }
' "$CONTRACT"; then
  pass "Scope has at least one concrete item"
else
  fail "Scope empty or still template prompts — fill behavior + expected files"
fi

if grep -qE 'Layer 1:.*make verify' "$CONTRACT"; then
  pass "Layer 1 lists make verify"
else
  fail "Verification must include Layer 1: make verify"
fi

if awk '
  /^## Verification/ { section=1; next }
  /^## / { if (section) exit }
  section {
    if ($0 ~ /^[-*] Feature-specific:[[:space:]]*$/) next
    if ($0 ~ /^[-*] Feature-specific:[[:space:]]+\S/) has_extra=1
    if ($0 ~ /Feature-specific:[[:space:]]+\S/) has_extra=1
    if ($0 ~ /Layer 2:[[:space:]]+n\/a/) has_extra=1
    if ($0 ~ /Layer 2:[[:space:]]+`?npm test/) has_extra=1
    if ($0 ~ /Layer 3:[[:space:]]+n\/a/) has_extra=1
    if ($0 ~ /Layer 3:[[:space:]]+`?make e2e/) has_extra=1
  }
  END { exit has_extra ? 0 : 1 }
' "$CONTRACT"; then
  pass "Verification tailored (feature-specific and/or Layer 2/3 / n/a)"
else
  fail "Set Feature-specific: … or Layer 2/3 (command or n/a) — do not leave stubs blank"
fi

if awk '
  /^## Exclusions/ { section=1; next }
  /^## / { if (section) exit }
  section && /^- / {
    line=$0
    sub(/^- /, "", line)
    gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
    if (line == "" || line == "Not in this branch:" || line == "Do not refactor unrelated modules") next
    if (line ~ /^Not in this branch:[[:space:]]+\S/) { found=1; exit }
    if (length(line) >= 8) { found=1; exit }
  }
  END { exit found ? 0 : 1 }
' "$CONTRACT"; then
  pass "Exclusions state what is out of scope"
else
  fail "Exclusions empty — write what this branch will not do"
fi

echo "3. PROGRESS handoff"
if [[ -f "$PROGRESS" ]]; then
  if grep -qiE '\*\*Blocked:\*\*[[:space:]]*(none)?[[:space:]]*$' "$PROGRESS" \
    || grep -qiE '\*\*Blocked:\*\*[[:space:]]*none\b' "$PROGRESS"; then
    pass "Blocked is none (or empty)"
  elif grep -qiE '\*\*Blocked:\*\*[[:space:]]+\S' "$PROGRESS"; then
    fail "PROGRESS reports a blocker — clear or resolve before coding"
  else
    fail "PROGRESS missing Blocked line"
  fi
  if grep -qE 'Current focus|In progress' "$PROGRESS"; then
    pass "PROGRESS has Current focus / In progress"
  else
    fail "PROGRESS missing Current focus section"
  fi
else
  fail "PROGRESS.md missing"
fi

echo ""
total=$((score + ${#misses[@]}))
echo "Score: $score / $total"
if [[ ${#misses[@]} -gt 0 ]]; then
  echo "Not ready — fix:"
  for m in "${misses[@]}"; do
    echo "  - $m"
  done
  echo ""
  echo "Edit $CONTRACT (and PROGRESS), then re-run: make branch-ready"
  exit 1
fi

echo "Ready to implement this branch CONTRACT."
exit 0
