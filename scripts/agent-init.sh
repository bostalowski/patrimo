#!/usr/bin/env bash
# Agent session initializer — install, verify, print branch handoff state.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> setup + verify"
make setup
make verify

echo ""
echo "==> Branch status (CONTRACT + PROGRESS)"
bash scripts/branch-status.sh || true

echo ""
echo "==> Platform gaps (matrix inventory)"
bash scripts/platform-gaps.sh || true

echo ""
echo "==> Cold-start map"
bash scripts/cold-start-check.sh || true

echo ""
echo "Ready. On a feature branch: fill CONTRACT → implement → DoD layers → checker."
echo "Update docs/agent/branches/<slug>/PROGRESS.md (not a global queue)."
