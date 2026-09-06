#!/usr/bin/env bash
# make checker (and framer/challenger helpers): prepare an isolated git
# worktree (write sandbox) and print the role prompt for a SEPARATE agent.
# Checker freshness is agent identity (subagent / Task / fresh empty-context
# session) — the worktree alone is not enough (ADR 0030). Plain
# `git worktree add --detach`, no IDE preference. Role prompts are never
# duplicated here — read verbatim from docs/howto/cadrage-lock.md
# (Framer/Challenger) and docs/agent/scoring-rubric.md (Checker).
# set -uo pipefail (no -e): git probes below are expected to fail in normal
# operation (e.g. no PROGRESS change yet) and are branched on, not fatal.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT="${FEATURE_FLOW_ROOT:-$HARNESS_ROOT}"
cd "$ROOT" || exit 1
# shellcheck source=lib/branch-slug.sh
source "$SCRIPT_DIR/lib/branch-slug.sh"

usage() {
  echo "Usage: scripts/role-worktree.sh <framer|challenger|checker>" >&2
  echo "       scripts/role-worktree.sh checker --publish <worktree-path>" >&2
}

ROLE="${1:-}"
if [[ "$ROLE" != "framer" && "$ROLE" != "challenger" && "$ROLE" != "checker" ]]; then
  usage
  exit 2
fi
shift || true

BRANCH="$(branch_name)"
if is_integration_branch "$BRANCH"; then
  echo "On $BRANCH: role-worktree refuses (not a feature-dev branch)." >&2
  exit 1
fi
SLUG="$(branch_slug "$BRANCH")"

# --- N10: read the role prompt verbatim from its single source of truth ---
extract_role_prompt() {
  case "$ROLE" in
    framer)
      awk '/^### Framer$/{f=1; next} /^### Challenger$/{f=0} f' "$HARNESS_ROOT/docs/howto/cadrage-lock.md" \
        | awk '/^```/{c++; next} c==1'
      ;;
    challenger)
      awk '/^### Challenger$/{f=1; next} /^### Teach-back$/{f=0} f' "$HARNESS_ROOT/docs/howto/cadrage-lock.md" \
        | awk '/^```/{c++; next} c==1'
      ;;
    checker)
      awk '/^## Checker prompt/{f=1; next} f' "$HARNESS_ROOT/docs/agent/scoring-rubric.md" \
        | awk '/^```/{c++; next} c==1'
      ;;
  esac
}

# --- publish mode: bring a Checker's PROGRESS.md edit back, enforcing E7 ---
if [[ "${1:-}" == "--publish" ]]; then
  WT="${2:-}"
  if [[ "$ROLE" != "checker" || -z "$WT" || ! -d "$WT" ]]; then
    usage
    exit 2
  fi
  PROGRESS_REL="docs/agent/branches/$SLUG/PROGRESS.md"
  changed="$(git -C "$WT" status --porcelain 2>/dev/null | awk '{print $2}')"
  offenders="$(echo "$changed" | grep -v -F "$PROGRESS_REL" | grep -v '^$' || true)"
  if [[ -n "$offenders" ]]; then
    echo "role-worktree checker --publish: FAIL — worktree touched file(s) other than $PROGRESS_REL:" >&2
    echo "$offenders" | sed 's/^/  - /' >&2
    exit 1
  fi
  if [[ -z "$changed" ]]; then
    echo "role-worktree checker --publish: nothing changed in $WT — nothing to publish." >&2
    exit 1
  fi
  mkdir -p "$(dirname "$PROGRESS_REL")"
  cp "$WT/$PROGRESS_REL" "$PROGRESS_REL"
  echo "role-worktree checker --publish: OK — copied $PROGRESS_REL from $WT"
  exit 0
fi

PROMPT="$(extract_role_prompt)"
if [[ -z "$PROMPT" ]]; then
  echo "Could not extract the $ROLE prompt — check cadrage-lock.md / scoring-rubric.md headings." >&2
  exit 1
fi

# --- always a plain git worktree: no external tool dependency, no
# IDE/agent-specific preference — works identically in Cursor, Claude Code,
# Codex, Orca, or a raw terminal, since it's nothing but git.
WT_DIR="${FEATURE_FLOW_WORKTREE_DIR:-../$(basename "$ROOT")-$SLUG-$ROLE}"
if [[ -d "$WT_DIR" ]]; then
  echo "Reusing existing worktree at $WT_DIR"
else
  git worktree add --detach "$WT_DIR" "$BRANCH" >/dev/null
  echo "Created worktree at $WT_DIR (detached at $BRANCH's current commit)"
fi
echo ""
if [[ "$ROLE" == "checker" ]]; then
  echo "=== AGENT ISOLATION (required) ==="
  echo "The Maker session MUST NOT score this work (same-session self-check is a harness violation)."
  echo "Spawn a SEPARATE agent — subagent / Task tool / fresh empty-context session —"
  echo "whose working directory is:"
  echo "  $WT_DIR"
  echo "Give it ONLY the Checker prompt below. Do not continue grading in the Maker chat."
  echo "When that agent finishes, publish its PROGRESS edit back with:"
  echo "  scripts/role-worktree.sh checker --publish $WT_DIR"
  echo ""
  echo "The Checker may write ONLY docs/agent/branches/$SLUG/PROGRESS.md in that worktree."
  echo ""
  echo "--- $ROLE prompt (give to the separate agent; cwd = $WT_DIR) ---"
else
  echo "--- $ROLE prompt (prefer a fresh empty-context session in $WT_DIR) ---"
fi
echo "$PROMPT"
