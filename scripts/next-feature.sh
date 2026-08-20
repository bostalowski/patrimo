#!/usr/bin/env bash
# Print the next open FEATURES.md work contract (WIP = 1 helper).
set -euo pipefail
cd "$(dirname "$0")/.."

FEATURES="${1:-FEATURES.md}"

if [[ ! -f "$FEATURES" ]]; then
  echo "Missing $FEATURES" >&2
  exit 1
fi

echo "=== Next open FEATURES contract (first match) ==="
echo ""

# Prefer the Open work contracts table (status todo|partial|absent).
awk '
  BEGIN { in_open=0 }
  /^## Open work/ { in_open=1; next }
  /^## / { if (in_open) exit }
  in_open && /^\|/ {
    line=$0
    if (line ~ /^\| *Feature */ || line ~ /^\|---/) next
    if (line ~ /\| *(todo|partial|absent) *\|/) {
      print line
      found=1
      exit
    }
  }
  END { if (!found) exit 2 }
' "$FEATURES" && {
  echo ""
  echo "Write a sprint contract: docs/agent/sprint-contract.md"
  echo "Then implement only this row. Stop after three-layer DoD + checker."
  exit 0
}

echo "No open contracts in FEATURES.md (todo/partial/absent)."
echo "Check the status matrix or update FEATURES.md."
exit 0
