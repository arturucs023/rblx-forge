---
name: roblox-ci-cd
description: CI/CD with GitHub Actions for Roblox (selene, StyLua, Rojo build/test/publish). Use it when automating checks, builds, or game publications.
---

# CI/CD for Roblox with GitHub Actions

## Objective
Automate quality and publishing: every push runs lint (selene), format (StyLua), and tests; every tag builds with Rojo and publishes to Roblox via Open Cloud with keys, with traceable versions and a known rollback.

## Scope and limits
Differentiation: `roblox-tooling`, `roblox-rojo`, and `roblox-mcp` (installed) describe tools; this skill covers team flows (pipeline, secrets, versions, gates). `roblox-git-workflows` covers branches and conflicts; here what runs on each GitHub event is covered.

What it does NOT do:

- Does NOT manage branches or resolve conflicts (see `roblox-git-workflows`).
- Does NOT write tests; it requires that they exist (see `roblox-testez`).
- Does NOT expose keys or publish from the local machine as a routine practice.

## Use cases
1. PR with automatic lint + format + test checks.
2. `project.json` build with Rojo on every merge to `main`.
3. Publish to a staging place on every `v*` tag.
4. Staging → production promotion with manual approval.
5. Traceable versioning (tag ↔ commit ↔ published artifact).

## Step-by-step process
1. Set the minimum pipeline: `lint (selene)` → `format-check (StyLua)` → `tests` → `build (Rojo)`. If one step fails, later ones don't run.
2. Create separate workflows: `ci.yml` (on push/PR), `release.yml` (on `v*` tag, with `workflow_dispatch` for relaunch).
3. Pin action and tool versions (selene, StyLua, Rojo CLI) with SHA or exact version; document how to update them.
4. Store secrets in GitHub Secrets/Environments: Open Cloud key, universe/place IDs. Never in the repo or logs (mask outputs).
5. Publish only from `release.yml` and only with the artifact built in the same run (don't rebuild between jobs without sharing the artifact).
6. Add gates: protected `main` (required checks), production publish requires environment approval.
7. Publish to staging first, verify (smoke test or `roblox-ui-testing` checklist), then promote the same artifact to production.
8. Tag every publication with a version visible in game (attribute or credits screen read from the tag) to trace bugs to builds.
9. Define rollback: republish the previous artifact (keep N artifacts) + written steps. Practice it once before you need it.

## Technical knowledge
- Typical jobs: checkout → setup tools → selene → `stylua --check` → tests → `rojo build` → upload-artifact → Open Cloud publish.
- Selene and StyLua are fast gates: they fail the PR before human review (see `roblox-code-review`).
- Rojo CLI builds `project.json` → `.rbxlx`; the workflow must fail if the build warns about missing files.
- Open Cloud publish requires a key with minimal scopes and periodic rotation; use different Environments for staging/production.
- `workflow_dispatch` lets you republish a tag without fake commits.
- Cache dependencies only with a package manager; otherwise avoid premature caching that hides failures.
- CI tests must be the same as local ones (same seed/command) to avoid "fails differently in CI".

Illustrative example (minimal ci.yml):

```yaml
# .github/workflows/ci.yml (ilustrativo)
name: ci
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint (selene)
        run: selene src # versión pineada en el repo
      - name: Format check (StyLua)
        run: stylua --check src
      - name: Build (Rojo)
        run: rojo build default.project.json -o game.rbxlx
```

Illustrative example (test gate):

```yaml
# fragmento ilustrativo
      - name: Tests
        run: ./run-testez.sh # mismo script que en local (ver roblox-testez)
```

Illustrative example (visible version):

```luau
-- Ilustrativo: leer versión en juego
local buildTag = "v0.0.0+local" -- CI la sustituye por el tag en release
print("Build: " .. buildTag)
```

## Best practices
- Fast pipeline (<10 min) or it gets skipped. Parallelize lint/format/tests.
- One single path to production (release.yml). No manual publishes off the record.
- Minimal secrets per environment; scheduled, documented rotation.
- Immutable artifacts: what is tested on staging is what ships to production.
- Report the result to the PR (native checks suffice; don't add bots with no value).

## Common mistakes
1. Key in code or logs: emergency rotation. Use Secrets + masking.
2. Quick manual publish outside the pipeline: untraced version. Every publish goes through release.yml.
3. Unpinned tools (`latest`): the pipeline breaks on its own. Pin and update deliberately.
4. Different tests in CI and local: false reds/greens. One shared test script.
5. Build ignoring Rojo warnings (files outside `project.json`): publishes incomplete. Fail on warnings.
6. No practiced rollback: the incident lasts hours. Keep artifacts and write the procedure.
7. Gates without branch protection: red gets merged. Enable required checks on `main`.

## Quality and done criteria
- [ ] `ci.yml` runs lint + format + tests + build on every PR and blocks merge on red.
- [ ] `release.yml` publishes only from tags, to staging first, with approval for production.
- [ ] Zero secrets in repo/logs; minimal scopes and separate environments verifiable.
- [ ] Staging artifact === production artifact (same hash).
- [ ] Tag version visible/traceable from the game.
- [ ] Rollback documented and rehearsed at least once.

## Tools
- GitHub Actions + GitHub Secrets/Environments.
- Selene, StyLua, Rojo CLI (pinned versions).
- Git + tags for versions (see `roblox-git-workflows`).
- TestEZ via `TestService` for the test gate (see `roblox-testez`).

## Limitations
- Doesn't reliably run Studio with UI in CI; multi-client UI tests happen outside (see `roblox-multiplayer-testing`, `roblox-ui-testing`).
- Doesn't cover branching strategy; see `roblox-git-workflows`.
- Exact Open Cloud commands and endpoints change; check `(check create.roblox.com/docs)` before production.
