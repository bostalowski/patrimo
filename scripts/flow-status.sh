#!/usr/bin/env bash
# Print which feature-flow gate this branch is on and the next command.
# See docs/howto/feature-flow.md. Convenience only — not itself a gate.
# Gate names are meaningful slugs (legacy docs may still say G0–G7).
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${FEATURE_FLOW_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$ROOT" || exit 1
# shellcheck source=lib/branch-slug.sh
source "$SCRIPT_DIR/lib/branch-slug.sh"

BRANCH="$(branch_name)"
SLUG="$(branch_slug "$BRANCH")"
CONTRACT="docs/agent/branches/$SLUG/CONTRACT.md"
PROGRESS="docs/agent/branches/$SLUG/PROGRESS.md"

echo "=== Flow status ($BRANCH) ==="

if is_integration_branch "$BRANCH"; then
  echo "On $BRANCH — not a feature branch. See docs/agent/branches/README.md."
  exit 0
fi

if [[ ! -f "$CONTRACT" ]]; then
  echo "branch-contract — no CONTRACT yet. Next: make branch-contract"
  exit 0
fi

if ! FEATURE_FLOW_ROOT="$ROOT" bash "$SCRIPT_DIR/branch-ready.sh" >/dev/null 2>&1; then
  echo "branch-ready — cadrage not locked yet. Next: fill CONTRACT, then make branch-ready"
  exit 0
fi

if [[ -f "$PROGRESS" ]] && grep -qE '^-?[[:space:]]*Checker evidence:[[:space:]]*\S' "$PROGRESS" \
  && grep -qE '^-?[[:space:]]*Checker:[[:space:]]*Pass' "$PROGRESS"; then
  echo "pr-check — Checker Pass recorded. Next: make pr-check, then push/open the PR"
  exit 0
fi

echo "dod-verify…gauntlet — cadrage locked. Next: make red / make verify / make gauntlet, then make checker"
