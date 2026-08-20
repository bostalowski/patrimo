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
echo "==> FEATURES.md (open items)"
grep -E '\| (todo|partial|absent|in progress) \|' FEATURES.md || true

echo ""
echo "Ready. One feature at a time. Stop only after green make verify."
