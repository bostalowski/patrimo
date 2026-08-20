.PHONY: setup test lint typecheck verify verify-full init e2e

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
