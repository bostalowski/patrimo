#!/usr/bin/env bash
# Cold-start map check — can the repo answer the five harness questions without chat memory?
# See docs/howto/cold-start-test.md
set -euo pipefail
cd "$(dirname "$0")/.."

score=0
misses=()

pass() { score=$((score + 1)); echo "  OK  $1"; }
fail() { misses+=("$1"); echo "  MISS $1"; }

echo "=== Cold-start map check ==="
echo ""

echo "1. What is this system?"
if grep -q "wealth-tracking\|patrimoine\|portfolio source of truth" AGENTS.md 2>/dev/null; then
  pass "AGENTS.md states product purpose"
else
  fail "AGENTS.md missing clear product purpose"
fi

echo "2. How is it organized?"
missing_arch=0
for f in packages/core/ARCHITECTURE.md src/ARCHITECTURE.md mobile/ARCHITECTURE.md electron/ARCHITECTURE.md; do
  [[ -f "$f" ]] || missing_arch=1
done
if [[ "$missing_arch" -eq 0 ]] && grep -q "ARCHITECTURE.md" AGENTS.md; then
  pass "Colocated ARCHITECTURE.md files linked from AGENTS.md"
else
  fail "Package ARCHITECTURE.md map incomplete"
fi

echo "3. How do I run it?"
if grep -qE 'make (setup|init)|npm (ci|run dev)' AGENTS.md Makefile docs/howto/local-dev-setup.md 2>/dev/null; then
  pass "Run instructions present (AGENTS / Makefile / local-dev-setup)"
else
  fail "No clear run instructions"
fi

echo "4. How do I verify it?"
if grep -q "make verify" AGENTS.md CONSTRAINTS.md Makefile && grep -qE "verify-full|make e2e" AGENTS.md Makefile; then
  pass "Verify + e2e/verify-full documented"
else
  fail "Verification commands incomplete"
fi

echo "5. What is the current progress?"
if [[ -f PROGRESS.md ]] && grep -qE "Current focus|In progress|Last verify" PROGRESS.md; then
  pass "PROGRESS.md has focus / verify sections"
else
  fail "PROGRESS.md missing or incomplete"
fi

echo ""
echo "Score: $score / 5"
if [[ ${#misses[@]} -gt 0 ]]; then
  echo "Gaps (fix the map, not agent memory):"
  for m in "${misses[@]}"; do
    echo "  - $m"
  done
  exit 1
fi

echo "Map healthy. Still run a fresh-session human/agent cold-start periodically."
exit 0
