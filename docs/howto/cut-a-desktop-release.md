# Cut a desktop release

Patrimo publishes macOS builds from GitHub Actions. The build workflow is [release.yml](../../.github/workflows/release.yml) (tag `v*` or reusable call).

## Option A — Label on the PR (recommended)

1. On the pull request into `main`, add **exactly one** of:
   - `release:patch`
   - `release:minor`
   - `release:major`
2. Merge the PR.
3. [release-on-merge.yml](../../.github/workflows/release-on-merge.yml) bumps `package.json`, pushes `vX.Y.Z`, then builds and publishes the GitHub Release.

No label → merge only, no release.

## Option B — Manual tag (unchanged)

From an up-to-date `main`:

```bash
npm version patch   # or minor / major
git push --follow-tags
```

That pushes a `v*` tag and runs `release.yml` directly.

## Optional secret

If branch protection blocks `github-actions[bot]` from pushing the version commit to `main`, add a classic PAT with `contents: write` as repository secret `RELEASE_GITHUB_TOKEN`. The merge workflow prefers that token when set.

## See also

- [Local development setup](local-dev-setup.md)
- [Monorepo layers](../architecture/monorepo-layers.md)
