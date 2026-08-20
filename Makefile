.PHONY: setup test lint typecheck verify verify-full init e2e next-feature cold-start

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

next-feature:
	bash scripts/next-feature.sh

cold-start:
	bash scripts/cold-start-check.sh
