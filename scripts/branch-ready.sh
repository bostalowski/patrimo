#!/usr/bin/env bash
# Gate: is this feature branch ready to implement? (cadrage filled, not just stubs)
# Tier A (Layer 2 n/a): classic checks only.
# Tier B (behavior): Intent, behavior cases, no OPEN decisions, teach-back accepted;
#   Challenger Pass if CONTRACT says Challenger: required.
# See docs/howto/cadrage-lock.md
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
warn() { echo "  WARN $1"; }

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

# Tier: A if Layer 2 is n/a; else B
TIER=B
if grep -qE 'Layer 2:[[:space:]]+n/a' "$CONTRACT"; then
  TIER=A
fi
echo "   Tier: $TIER (from Layer 2)"

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

echo "4. Cadrage lock (Tier $TIER)"
if [[ "$TIER" == "A" ]]; then
  pass "Tier A — Intent / decisions / teach-back deep checks skipped"
else
  # Intent: skip empty template stubs; count filled label bullets (text after ':')
  if awk '
    /^## Intent/ { section=1; next }
    /^## / { if (section) exit }
    section {
      line=$0
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
      if (line == "") next
      if (line ~ /^Tier [AB]:/) next
      # Template Intent labels — empty after colon = stub; ≥8 chars after = filled
      if (line ~ /^- (Symptom \(who|Suspected cause|Lever \(where|Success signal|Band-aid risk)/) {
        idx = index(line, ":")
        if (idx == 0) next
        rest = substr(line, idx + 1)
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", rest)
        if (length(rest) >= 8) { found=1; exit }
        next
      }
      if (length(line) >= 8) { found=1; exit }
    }
    END { exit found ? 0 : 1 }
  ' "$CONTRACT"; then
    pass "Intent section has concrete content"
  else
    fail "Tier B: fill ## Intent (symptom / cause / lever / success / band-aid) — see cadrage-lock.md"
  fi

  # At least 2 checkbox/bullet cases under Nominal or Edge (or Behavior cases without only n/a)
  case_count="$(awk '
    /^## Behavior cases/ { section=1; next }
    /^## / { if (section) exit }
    section && (/^- \[[ xX]\] / || /^[-*] /) {
      line=$0
      sub(/^- \[[ xX]\] /, "", line)
      sub(/^[-*] /, "", line)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", line)
      if (line == "" || line ~ /^n\/a/ || line ~ /^If … then/ || line ~ /^Explicitly not/) next
      if (line ~ /^Tier A:/) next
      # Skip pure section labels
      if (length(line) >= 8) count++
    }
    END { print count+0 }
  ' "$CONTRACT")"
  if [[ "$case_count" -ge 2 ]]; then
    pass "Behavior cases: $case_count concrete case(s) (≥2)"
  else
    fail "Tier B: need ≥2 concrete Behavior cases (nominal/edge) — got $case_count"
  fi

  # No OPEN decisions in product decisions table
  if grep -qE '\|\s*\*\*OPEN\*\*\s*\||\|\s*OPEN\s*\|' "$CONTRACT"; then
    fail "Tier B: product decision(s) still OPEN — lock or move to exclusions before coding"
  else
    # Require a Product decisions heading and either LOCKED rows or explicit n/a (should not be n/a on Tier B)
    if grep -qE '^## Product decisions' "$CONTRACT"; then
      if grep -qiE 'n/a — Tier A' "$CONTRACT" && ! grep -qE '\|\s*\*\*LOCKED\*\*\s*\||\|\s*LOCKED\s*\|' "$CONTRACT"; then
        fail "Tier B: Product decisions marked Tier A only — add LOCKED decisions"
      elif grep -qE '\|\s*\*\*LOCKED\*\*\s*\||\|\s*LOCKED\s*\|' "$CONTRACT"; then
        pass "Product decisions: no OPEN; at least one LOCKED"
      else
        fail "Tier B: add Product decisions with Status LOCKED (and alternatives) — see cadrage-lock.md"
      fi
    else
      fail "Tier B: missing ## Product decisions section"
    fi
  fi

  # Teach-back accepted — PROGRESS only (avoid matching decision-table prose in CONTRACT)
  if [[ -f "$PROGRESS" ]] && grep -qiE '^[[:space:]]*-[[:space:]]*Teach-back:[[:space:]]*accepted' "$PROGRESS"; then
    pass "Teach-back accepted (PROGRESS)"
  else
    fail "Tier B: record '- Teach-back: accepted (date)' under Cadrage lock in PROGRESS — see cadrage-lock.md"
  fi

  # Challenger required? Only the CONTRACT header bullet, not table cells quoting the phrase
  if grep -qiE '^[[:space:]]*-[[:space:]]*Challenger:[[:space:]]*required\b' "$CONTRACT"; then
    if [[ -f "$PROGRESS" ]] && grep -qiE '^[[:space:]]*-[[:space:]]*Challenger:[[:space:]]*(Pass|passed)\b' "$PROGRESS"; then
      pass "Challenger required — Pass recorded in PROGRESS"
    else
      fail "Challenger: required — record '- Challenger: Pass (date)' under Cadrage lock in PROGRESS"
    fi
  else
    pass "Challenger not required (recommended/n/a/skipped OK)"
    if [[ -f "$PROGRESS" ]] && ! grep -qiE '^[[:space:]]*-[[:space:]]*Challenger:' "$PROGRESS"; then
      warn "Consider a Challenger pass or note skip reason under Cadrage lock in PROGRESS"
    fi
  fi
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
  echo "Procedure: docs/howto/cadrage-lock.md"
  exit 1
fi

echo "Ready to implement this branch CONTRACT."
exit 0
