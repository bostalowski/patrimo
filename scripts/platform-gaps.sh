#!/usr/bin/env bash
# List FEATURES.md matrix rows that are not fully done on both platforms.
# Inventory helper — not a claim / queue. Claim = feature branch + CONTRACT.
set -euo pipefail
cd "$(dirname "$0")/.."

FEATURES="${1:-FEATURES.md}"

if [[ ! -f "$FEATURES" ]]; then
  echo "Missing $FEATURES" >&2
  exit 1
fi

echo "=== Platform gaps (FEATURES matrix: todo|partial|absent) ==="
echo "(Pick one → feature branch → make branch-contract. This list is not a lock.)"
echo ""

awk '
  BEGIN { in_matrix=0 }
  /^## Shared workbook/ { in_matrix=1; next }
  /^## / { if (in_matrix) exit }
  in_matrix && /^\|/ {
    line=$0
    if (line ~ /^\| *Feature */ || line ~ /^\|---/) next
    if (line ~ /\| *(todo|partial|absent) *\|/) print line
  }
' "$FEATURES"

echo ""
echo "Root matrix: $FEATURES"
