#!/usr/bin/env bash
# Shared diff helpers for gauntlet / test-guard / pr-check.
# shellcheck shell=bash

# Resolve the base ref to diff against.
# Override with FEATURE_FLOW_BASE (used by tests and CI where origin/main
# may not be fetched under the expected name).
diff_base() {
  if [[ -n "${FEATURE_FLOW_BASE:-}" ]]; then
    echo "$FEATURE_FLOW_BASE"
    return
  fi
  if git rev-parse --verify -q origin/main >/dev/null 2>&1; then
    echo "origin/main"
    return
  fi
  if git rev-parse --verify -q main >/dev/null 2>&1; then
    echo "main"
    return
  fi
  git rev-list --max-parents=0 HEAD 2>/dev/null | tail -1
}

# Files changed on HEAD vs the base ref (one per line).
changed_files() {
  local base
  base="$(diff_base)"
  git diff --name-only "$base"...HEAD 2>/dev/null || true
}
