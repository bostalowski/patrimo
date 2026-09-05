#!/usr/bin/env bash
# Shared RED-evidence header format — single source for the write side
# (red-evidence.sh) and the read side (pr-check.sh section 3), so they
# cannot drift independently (Checker re-check 2026-09-05 nit).
# shellcheck shell=bash

RED_EVIDENCE_HEADER_PREFIX="### RED evidence — "

red_evidence_header() {
  local case="$1" date="$2"
  echo "${RED_EVIDENCE_HEADER_PREFIX}${case} (${date})"
}

# ERE fragment matching a real RED evidence header for case id "$1" — used
# with grep -qE. Anchored on the exact prefix red_evidence_header() writes.
red_evidence_header_pattern() {
  echo "^${RED_EVIDENCE_HEADER_PREFIX}.*\\b$1\\b"
}
