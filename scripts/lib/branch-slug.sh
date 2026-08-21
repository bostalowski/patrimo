#!/usr/bin/env bash
# Resolve current git branch → filesystem slug for docs/agent/branches/<slug>/
# shellcheck shell=bash

branch_name() {
  git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown"
}

branch_slug() {
  local name="${1:-$(branch_name)}"
  echo "$name" | tr '[:upper:]' '[:lower:]' | sed -E 's|/|-|g; s/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//'
}

branch_dir() {
  local root
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  echo "$root/docs/agent/branches/$(branch_slug "${1:-}")"
}

is_integration_branch() {
  local name="${1:-$(branch_name)}"
  [[ "$name" == "main" || "$name" == "master" ]]
}
