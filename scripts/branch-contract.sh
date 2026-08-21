#!/usr/bin/env bash
# Create docs/agent/branches/<slug>/{CONTRACT,PROGRESS}.md for the current branch.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=lib/branch-slug.sh
source "$(dirname "$0")/lib/branch-slug.sh"

BRANCH="$(branch_name)"
if is_integration_branch "$BRANCH"; then
  echo "Refuse: create a feature branch first (currently on $BRANCH)." >&2
  echo "Then: make branch-contract" >&2
  exit 1
fi

SLUG="$(branch_slug "$BRANCH")"
DIR="docs/agent/branches/$SLUG"
TEMPLATE_DIR="docs/agent/branches/_templates"

mkdir -p "$DIR"

if [[ -f "$DIR/CONTRACT.md" || -f "$DIR/PROGRESS.md" ]]; then
  echo "Already exists: $DIR"
  echo "Edit CONTRACT.md / PROGRESS.md, or remove the folder to recreate."
  ls -la "$DIR"
  exit 0
fi

sed -e "s|<branch>|$BRANCH|g" -e "s|<slug>|$SLUG|g" \
  "$TEMPLATE_DIR/CONTRACT.md" >"$DIR/CONTRACT.md"
sed -e "s|<slug>|$SLUG|g" \
  "$TEMPLATE_DIR/PROGRESS.md" >"$DIR/PROGRESS.md"

echo "Created $DIR/"
echo "  CONTRACT.md  — cadrage (edit scope / verify / exclusions)"
echo "  PROGRESS.md  — branch handoff"
echo ""
echo "Next: fill CONTRACT, then make branch-ready (must pass before coding)"
