#!/usr/bin/env bash
# Gate: test-removal guard + scoped mutation testing on packages/core diff.
# See docs/adr/0026-feature-flow-cadrage-to-merge.md, CONSTRAINTS §27.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${FEATURE_FLOW_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$ROOT" || exit 1
# shellcheck source=lib/branch-slug.sh
source "$SCRIPT_DIR/lib/branch-slug.sh"
# shellcheck source=lib/diff.sh
source "$SCRIPT_DIR/lib/diff.sh"

BRANCH="$(branch_name)"
if is_integration_branch "$BRANCH"; then
  echo "On $BRANCH: gauntlet refuses (not a feature-dev branch)." >&2
  exit 1
fi

echo "=== Gauntlet ($BRANCH) ==="
echo ""
echo "1. Test-removal guard"
if ! FEATURE_FLOW_ROOT="$ROOT" bash "$SCRIPT_DIR/test-guard.sh"; then
  exit 1
fi

echo ""
echo "2. Mutation testing (packages/core)"
BASE="$(diff_base)"
core_files="$(changed_files | grep -E '^packages/core/src/.*\.tsx?$' || true)"
if [[ -z "$core_files" ]]; then
  echo "  skipped — no packages/core/src files in diff vs $BASE"
  exit 0
fi
if [[ ! -f stryker.conf.json ]]; then
  echo "  skipped — stryker.conf.json not present yet (lands in a later tranche)"
  exit 0
fi
echo "  changed packages/core files:"
echo "$core_files" | sed 's/^/    /'
mutate_arg="$(echo "$core_files" | paste -sd, -)"
npx stryker run --mutate "$mutate_arg"
