#!/usr/bin/env bash
# Gate: write RED evidence only if CMD actually fails right now.
# Usage: make red CASE="N2: red-evidence writes on failure" CMD="npm test -- <path>"
#     or: scripts/red-evidence.sh --case "..." --cmd "..."
# See docs/howto/tdd-red-green.md, CONSTRAINTS §24.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${FEATURE_FLOW_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$ROOT" || exit 1
# shellcheck source=lib/branch-slug.sh
source "$SCRIPT_DIR/lib/branch-slug.sh"

CASE="${CASE:-}"
CMD="${CMD:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --case) CASE="$2"; shift 2 ;;
    --cmd) CMD="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

BRANCH="$(branch_name)"
if is_integration_branch "$BRANCH"; then
  echo "On $BRANCH: make red refuses (not a feature-dev branch)." >&2
  exit 1
fi

if [[ -z "$CASE" || -z "$CMD" ]]; then
  echo 'Usage: make red CASE="<case id + description>" CMD="<test command>"' >&2
  exit 2
fi

SLUG="$(branch_slug "$BRANCH")"
PROGRESS="docs/agent/branches/$SLUG/PROGRESS.md"
if [[ ! -f "$PROGRESS" ]]; then
  echo "Missing $PROGRESS — run make branch-contract first." >&2
  exit 1
fi

OUT="$(mktemp)"
trap 'rm -f "$OUT"' EXIT

bash -c "$CMD" >"$OUT" 2>&1
STATUS=$?

if [[ $STATUS -eq 0 ]]; then
  echo "CMD passed (exit 0) — refusing to write RED evidence for a case that is not red." >&2
  echo "--- command output (tail) ---" >&2
  tail -n 20 "$OUT" >&2
  exit 1
fi

SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "no-commit-yet")"
DATE="$(date +%F)"
EXCERPT="$(tail -n 15 "$OUT")"

{
  echo ""
  echo "### RED evidence — $CASE ($DATE)"
  echo ""
  echo "- Command: \`$CMD\`"
  echo "- SHA: $SHA"
  echo "- Failure excerpt:"
  echo '```'
  echo "$EXCERPT"
  echo '```'
} >> "$PROGRESS"

echo "RED evidence recorded in $PROGRESS for: $CASE"
exit 0
