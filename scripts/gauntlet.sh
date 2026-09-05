#!/usr/bin/env bash
# Gate: test-removal guard + scoped mutation testing on packages/core diff.
# See docs/adr/0026-feature-flow-cadrage-to-merge.md, CONSTRAINTS §27.
# set -uo pipefail (no -e): we deliberately capture the mutation step's exit
# code ourselves (mutation_status=$?) so a later step (duplication signal)
# can still run instead of the whole script aborting on it.
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
mutation_status=0
if [[ -z "$core_files" ]]; then
  echo "  skipped — no packages/core/src files in diff vs $BASE"
elif [[ ! -f stryker.conf.json ]]; then
  echo "  skipped — stryker.conf.json not present yet (lands in a later tranche)"
else
  echo "  changed packages/core files:"
  echo "$core_files" | sed 's/^/    /'
  mutate_arg="$(echo "$core_files" | paste -sd, -)"
  npx stryker run --mutate "$mutate_arg" || mutation_status=$?
fi

echo ""
echo "3. Duplication signal (informational only — never fails the gate; the real"
echo "   judgment call is the /clean-code skill in the Checker's review)"
changed_src="$(changed_files | grep -E '\.tsx?$' | grep -v '\.test\.' || true)"
if [[ -z "$changed_src" ]]; then
  echo "  no changed non-test .ts/.tsx files to check"
else
  # shellcheck disable=SC2086
  node "$SCRIPT_DIR/lib/dup-check.mjs" $changed_src
fi

exit "$mutation_status"
