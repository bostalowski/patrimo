#!/usr/bin/env bash
# Build Stryker --mutate specs from the packages/core production diff.
# - Never include *.test.ts(x) (tests are not production code to mutate).
# - Prefer line ranges from `git diff -U0` so large touched files are not
#   scored on pre-existing, untouched debt (ADR 0026 invariant 2 / option C).
# shellcheck shell=bash

# Requires diff_base / changed_files from lib/diff.sh (sourced by caller).

# Changed production packages/core sources (excludes *.test.ts / *.test.tsx).
changed_core_production_files() {
  changed_files | grep -E '^packages/core/src/.*\.tsx?$' | grep -vE '\.test\.tsx?$' || true
}

# Print "start-end" ranges for added hunks in file vs base (one per line).
# Uses node for portable @@-hunk parsing (BSD sed BRE is too fragile here).
added_line_ranges() {
  local file="$1"
  local base="$2"
  git --no-pager diff -U0 "${base}...HEAD" -- "$file" 2>/dev/null | node --input-type=module -e '
const chunks = [];
let buf = "";
for await (const b of process.stdin) buf += b;
for (const line of buf.split(/\n/)) {
  const m = /^@@ .*\+(\d+)(?:,(\d+))? /.exec(line);
  if (!m) continue;
  const start = Number(m[1]);
  const count = m[2] === undefined ? 1 : Number(m[2]);
  if (count === 0) continue;
  chunks.push(`${start}-${start + count - 1}`);
}
process.stdout.write(chunks.join("\n"));
if (chunks.length) process.stdout.write("\n");
'
}

# Print Stryker mutate tokens for one file: either `path` (whole new file) or
# `path:start-end` per added hunk. Empty stdout means "skip this file".
mutate_specs_for_file() {
  local file="$1"
  local base="$2"
  local ranges line

  # Brand-new file vs base → mutate the whole file.
  if ! git cat-file -e "${base}:${file}" 2>/dev/null; then
    echo "$file"
    return
  fi

  ranges="$(added_line_ranges "$file" "$base")"
  if [[ -z "$ranges" ]]; then
    return
  fi

  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    echo "${file}:${line}"
  done <<< "$ranges"
}

# Comma-separated --mutate argument for all changed core production files.
# Prints nothing (and is therefore "empty") when there is nothing to mutate.
mutate_arg_for_core_diff() {
  local base specs file file_specs line
  base="$(diff_base)"
  specs=()
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    file_specs="$(mutate_specs_for_file "$file" "$base")"
    if [[ -z "$file_specs" ]]; then
      continue
    fi
    while IFS= read -r line; do
      [[ -z "$line" ]] && continue
      specs+=("$line")
    done <<< "$file_specs"
  done < <(changed_core_production_files)

  if [[ ${#specs[@]} -eq 0 ]]; then
    return
  fi
  local IFS=,
  echo "${specs[*]}"
}
