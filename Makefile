.PHONY: setup test lint typecheck verify verify-full init e2e next-feature cold-start branch-contract branch-status branch-ready platform-gaps red gauntlet pr-check flow checker rework-log-stamp rework-log-propose

setup:
	npm ci

test:
	npm test

lint:
	npm run lint

typecheck:
	npm run typecheck

verify: lint typecheck test

verify-full: verify e2e

init:
	bash scripts/agent-init.sh

e2e:
	npm run e2e

branch-contract:
	bash scripts/branch-contract.sh

branch-status:
	bash scripts/branch-status.sh

branch-ready:
	bash scripts/branch-ready.sh

platform-gaps:
	bash scripts/platform-gaps.sh

red:
	bash scripts/red-evidence.sh

gauntlet:
	bash scripts/gauntlet.sh

pr-check:
	bash scripts/pr-check.sh

rework-log-stamp:
	node scripts/lib/rework-log.mjs stamp

rework-log-propose:
	node scripts/lib/rework-log.mjs propose

flow:
	bash scripts/flow-status.sh

checker:
	bash scripts/role-worktree.sh checker

# Deprecated alias → platform-gaps + branch-status
next-feature:
	bash scripts/next-feature.sh

cold-start:
	bash scripts/cold-start-check.sh
