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
echo "==> Branch ready (cadrage gate)"
# shellcheck source=lib/branch-slug.sh
source "$(dirname "$0")/lib/branch-slug.sh"
if is_integration_branch "$(branch_name)"; then
  echo "On $(branch_name): skip branch-ready (feature branches only)."
  echo "For product work: git checkout -b feat/… && make branch-contract && make branch-ready"
else
  if ! bash scripts/branch-ready.sh; then
    echo ""
    echo "Init incomplete: fill CONTRACT/PROGRESS, then make branch-ready (or make init again)."
    exit 1
  fi
fi

echo ""
echo "==> Platform gaps (matrix inventory)"
bash scripts/platform-gaps.sh || true

echo ""
echo "==> Cold-start map"
bash scripts/cold-start-check.sh || true

echo ""
echo "Ready to implement. DoD layers → checker; update branch PROGRESS.md."
