#!/usr/bin/env bash
# Deprecated: global open-work queue removed. Prefer branch contracts.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "make next-feature is deprecated."
echo "Claim work with a feature branch + make branch-contract."
echo ""
bash scripts/platform-gaps.sh "$@"
echo ""
bash scripts/branch-status.sh || true
