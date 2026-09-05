#!/usr/bin/env bash
# Gate: no test silently deleted/weakened without a Test-removal-justified line.
# See docs/adr/0026-feature-flow-cadrage-to-merge.md, CONSTRAINTS §27.
# set -uo pipefail (no -e): git-diff/grep pipelines here legitimately exit
# non-zero on "no match" — we inspect that ourselves, not abort on it.
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
  echo "On $BRANCH: test-guard refuses (not a feature-dev branch)." >&2
  exit 1
fi

SLUG="$(branch_slug "$BRANCH")"
PROGRESS="docs/agent/branches/$SLUG/PROGRESS.md"
BASE="$(diff_base)"

TEST_GLOBS=('*.test.ts' '*.test.tsx' '*.test.js' '*.test.jsx')

offenders=()

# 1. Deleted test files
while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  offenders+=("deleted: $f")
done < <(git diff --name-status "$BASE"...HEAD -- "${TEST_GLOBS[@]}" 2>/dev/null | awk '$1=="D"{print $2}')

# 2. .skip(/.only( added in a test file — anchored on the statement actually
# starting with it/test/describe, so a fixture string literal that merely
# *contains* ".only(" (e.g. test-guard's own tests) is not a false positive.
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  if git diff "$BASE"...HEAD -- "$file" 2>/dev/null | grep -qE '^\+[[:space:]]*(it|test|describe)\.(skip|only)\('; then
    offenders+=("skip/only added: $file")
  fi
done < <(git diff --name-only "$BASE"...HEAD -- "${TEST_GLOBS[@]}" 2>/dev/null)

# 3. test(/it( block count dropped in a still-existing, modified test file
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  [[ -f "$file" ]] || continue
  old_count="$(git show "$BASE:$file" 2>/dev/null | grep -cE '\b(test|it)\(' || true)"
  new_count="$(grep -cE '\b(test|it)\(' "$file" 2>/dev/null || true)"
  old_count="${old_count:-0}"
  new_count="${new_count:-0}"
  if (( new_count < old_count )); then
    offenders+=("test block removed: $file ($old_count -> $new_count)")
  fi
done < <(git diff --name-only "$BASE"...HEAD -- "${TEST_GLOBS[@]}" 2>/dev/null)

if [[ ${#offenders[@]} -eq 0 ]]; then
  echo "test-guard: OK — no deleted/weakened test detected vs $BASE"
  exit 0
fi

echo "test-guard: found test removal/weakening vs $BASE:"
for o in "${offenders[@]}"; do
  echo "  - $o"
done

if [[ -f "$PROGRESS" ]] && grep -qE '^-?\s*Test-removal-justified:\s*\S' "$PROGRESS"; then
  echo "test-guard: OK — Test-removal-justified: line found in $PROGRESS"
  exit 0
fi

echo "test-guard: FAIL — add 'Test-removal-justified: <reason>' to $PROGRESS, or restore the test(s)" >&2
exit 1
