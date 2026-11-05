---
name: roblox-git-workflows
description: Git for Rojo projects (branches, .gitignore, conflicts, releases). Use it when organizing branches, ignores, or releases of a Roblox game.
---

# Git for Rojo Projects

## Objective
Keep a Rojo repo clean and collaborative: predictable branches, correct `.gitignore`, resolvable `project.json` conflicts, and traceable releases, with no binaries or generated files in history.

## Scope and limits
Differentiation: `roblox-tooling` and `roblox-rojo` (installed) describe the tools; this skill covers team flows (branches, ignores, conflicts, releases). `roblox-ci-cd` covers what runs on GitHub Actions; here we cover how the repo feeding that pipeline is organized.

What it does NOT do:

- Does NOT define the CI pipeline (see `roblox-ci-cd`).
- Does NOT review code (see `roblox-code-review`).
- Does NOT store binary places as practice; everything is syncable text.

## Use cases
1. Create a Rojo repo from scratch with correct ignoring.
2. Collaborate with short branches and reviewable PRs.
3. Resolve a `default.project.json` conflict after moving files.
4. Clean a repo that pushed `build/`, `.rbxlx`, or credentials.
5. Tag `v*` releases that trigger publishing.

## Step-by-step process
1. Initialize with standard Rojo layout (`src/`, `default.project.json`, README with sync/build command). The whole game comes from versioned text.
2. Apply Roblox `.gitignore`: `build/`, `*.rbxlx`, `*.rbxl`, `_Index/`, `sourcemap.json`, `.DS_Store`, local logs, and any file with keys.
3. Adopt a branch model: protected `main`, short `feature/<topic>` (<3 days), `release/vX` for stabilization only. No direct commits to `main`.
4. Small commits with `type(area): what` messages (e.g. `feat(combat): validate damage on server`). One commit = one reviewable change.
5. Sync before branching (`git pull --ff-only`) and rebase your branch onto `main` if it diverged; resolve `project.json` conflicts by regenerating/ordering, not blindly by hand.
6. On a `project.json` conflict: open both versions, identify moved/renamed nodes, rebuild with `rojo build` locally, and confirm it compiles before marking resolved.
7. Tag releases with annotated tags (`v1.2.0` + notes: changes, data migrations, rollback). The tag is what `roblox-ci-cd` publishes.
8. If a binary or secret got in: remove it from history with the team's tool, rotate the secret, and add the missing ignore. Deleting it in a new commit is not enough.
9. Protect `main`: required checks (see `roblox-ci-cd`), minimum 1 approval (see `roblox-code-review`), no force-push.

## Technical knowledge
- Rojo + Git: `project.json` maps paths to hierarchy; moving a file without updating the map breaks the build. The local build is the test of a merge.
- Typical Roblox `.gitignore`: ignores artifacts (`build/`, `*.rbxlx`), generated indexes, and secrets. Source code and configs are versioned.
- Annotated tags (`git tag -a v1.2.0 -m "..."`) + `git push --tags` trigger `release.yml`. Respect semver: MAJOR breaks, MINOR adds, PATCH fixes.
- Clean `git status` before sync/build: avoids accidentally publishing uncommitted changes.
- LFS only if essential for large assets; by default, all text. Binaries in Git rot history.
- `sourcemap.json` is generated: ignored, not reviewed.

Illustrative example (minimal .gitignore):

```gitignore
# Build y artefactos (ilustrativo)
build/
*.rbxlx
*.rbxl
sourcemap.json
_Index/
*.log
.DS_Store
.env
```

Illustrative example (branch flow):

```text
git checkout -b feature/pity-garantizado
# ... cambios pequeños + commits ...
git pull --ff-only origin main
git rebase origin/main
rojo build default.project.json -o build/game.rbxlx
git push -u origin feature/pity-garantizado
```

Illustrative example (release tag):

```text
git tag -a v1.3.0 -m "Pity garantizado; migracion de inventario v2"
git push --tags
```

## Best practices
- Short branches and PRs under 400 lines; large work is split.
- `main` always green and playable (build + tests pass).
- Messages explaining why, not just what.
- Review your own diff before requesting review (catch binaries and secrets).
- Document in README: requirements, `rojo` version, sync/build/test commands.

## Common mistakes
1. Pushing `.rbxlx`/binaries: giant history. Ignore them and generate in CI.
2. Direct commits to `main` or force-push: breaks the team. Protect the branch.
3. Resolving `project.json` by deleting nodes "so it compiles": incomplete map that publishes without systems. Rebuild and verify build.
4. `.gitignore` ignoring `src/` or real configs: the game can't be rebuilt from scratch. Test clean clone + build.
5. Committed secret "fixed" by deleting it later: still in history. Rotate + clean history.
6. Hand-moved tags (`-f`) after publishing: staging ≠ production. New tag, never move.
7. Eternal branches (>1 week): monster conflicts. Integrate every 1–2 days via rebase or split.

## Quality and done criteria
- [ ] Clean clone + `rojo build` works with no extra files (verifiable by a teammate).
- [ ] Zero binaries/secrets in recent history; `.gitignore` covers artifacts.
- [ ] Protected `main` with required checks and minimum approval.
- [ ] Releases with annotated tags + notes (changes, migration, rollback).
- [ ] `project.json` conflicts resolved with green local build before push.
- [ ] README with reproducible commands (sync/build/test).

## Tools
- Git (branches, tags, rebase) + GitHub (protection, PRs).
- Rojo CLI to validate builds after merges.
- CI (`roblox-ci-cd`) as the repo safety net.
- `TestService` + TestEZ to validate the merge broke nothing (see `roblox-testez`).

## Limitations
- Does not cover CI or review; see `roblox-ci-cd` and `roblox-code-review`.
- Exact history-cleanup commands depend on the chosen tool; verify before rewriting shared history.
- If you doubt a Rojo or Git option, note "(verificar en create.roblox.com/docs)" or in the tool help.
