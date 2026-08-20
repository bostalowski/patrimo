#!/usr/bin/env bash
# Agent session initializer — install, verify, print handoff state.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> setup + verify"
make setup
make verify

echo ""
echo "=== PROGRESS.md ==="
cat PROGRESS.md

echo ""
echo "==> Open FEATURES contracts"
bash scripts/next-feature.sh || true

echo ""
echo "==> Cold-start map"
bash scripts/cold-start-check.sh || true

echo ""
echo "Ready. One feature at a time. Sprint contract → implement → DoD layers → checker."
echo "Stop only after green verify (and e2e when layer 3 applies)."
