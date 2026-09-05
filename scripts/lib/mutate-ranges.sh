#!/usr/bin/env bash
# Emit Stryker --mutate specs for only the added/changed lines of each file
# (not the whole file). Shared schema/template modules otherwise drag the
# gate when a feature touches a few lines. See gauntlet.sh / CONSTRAINTS §27.
# shellcheck shell=bash

# stdin: one repo-relative path per line (packages/core/src/**/*.ts)
# stdout: comma-separated Stryker mutate specs (path:start-end,...)
# Uses FEATURE_FLOW_BASE / diff_base from diff.sh when sourced after it.
mutate_specs_for_changed_lines() {
  local base file ranges start count end specs=""
  base="$(diff_base)"
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    ranges=""
    while IFS= read -r hunk; do
      # @@ -old[,count] +new[,count] @@  → mutate the new-side range
      if [[ "$hunk" =~ ^@@\ -[0-9]+(,[0-9]+)?\ \+([0-9]+)(,([0-9]+))?\ @@ ]]; then
        start="${BASH_REMATCH[2]}"
        count="${BASH_REMATCH[4]:-1}"
        if [[ "$count" == "0" ]]; then
          continue
        fi
        end=$((start + count - 1))
        if [[ -n "$ranges" ]]; then
          ranges+=","
        fi
        ranges+="${file}:${start}-${end}"
      fi
    done < <(git diff -U0 "$base"...HEAD -- "$file" 2>/dev/null | grep -E '^@@ ' || true)
    if [[ -z "$ranges" ]]; then
      # No parseable hunks (rename / binary / empty) — fall back to whole file
      ranges="$file"
    fi
    if [[ -n "$specs" ]]; then
      specs+=","
    fi
    specs+="$ranges"
  done
  echo "$specs"
}
