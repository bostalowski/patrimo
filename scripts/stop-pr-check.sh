#!/usr/bin/env bash
# Stop hook (Claude Code + Cursor): on a feature branch with a diff, refuse to end the session if `make pr-check` fails.
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
input=$(cat)
echo "$input" | grep -Eq '"stop_hook_active": *true|"loop_count": *[1-9]' && exit 0
branch=$(git branch --show-current 2>/dev/null)
[ -z "$branch" ] || [ "$branch" = main ] && exit 0
git diff --quiet main...HEAD 2>/dev/null && git diff --quiet && exit 0
out=$(make pr-check 2>&1) && exit 0
reason=$(printf '%s' "$out" | tail -15 | python3 -c 'import json,sys;print(json.dumps("make pr-check échoue — finir la boucle (verify, gauntlet, checker) :\n"+sys.stdin.read()))')
# Claude Code reads decision/reason; Cursor reads followup_message.
printf '{"decision":"block","reason":%s,"followup_message":%s}\n' "$reason" "$reason"
