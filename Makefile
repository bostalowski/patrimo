.PHONY: setup test lint typecheck verify verify-full init e2e next-feature cold-start branch-contract branch-status platform-gaps

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

platform-gaps:
	bash scripts/platform-gaps.sh

# Deprecated alias → platform-gaps + branch-status
next-feature:
	bash scripts/next-feature.sh

cold-start:
	bash scripts/cold-start-check.sh
