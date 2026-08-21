#!/usr/bin/env bash
# Print branch-local CONTRACT + PROGRESS (or how to create them).
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=lib/branch-slug.sh
source "$(dirname "$0")/lib/branch-slug.sh"

BRANCH="$(branch_name)"
SLUG="$(branch_slug "$BRANCH")"
DIR="docs/agent/branches/$SLUG"

echo "=== Branch status ==="
echo "Branch: $BRANCH"
echo "Slug:   $SLUG"
echo "Dir:    $DIR"
echo ""

if is_integration_branch "$BRANCH"; then
  echo "On $BRANCH: use root FEATURES.md (matrix) + root PROGRESS.md."
  echo "For scoped work: git checkout -b feat/… && make branch-contract"
  echo ""
  echo "=== Root PROGRESS.md (summary) ==="
  if [[ -f PROGRESS.md ]]; then
    head -n 40 PROGRESS.md
  fi
  exit 0
fi

if [[ ! -f "$DIR/CONTRACT.md" ]]; then
  echo "No branch contract yet."
  echo "Run: make branch-contract"
  exit 1
fi

echo "=== CONTRACT.md ==="
cat "$DIR/CONTRACT.md"
echo ""
echo "=== PROGRESS.md ==="
cat "$DIR/PROGRESS.md"
