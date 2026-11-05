---
name: roblox-testez
description: TestEZ done right (specs, mocks, runner in Studio/CLI, what to test). Use it when adding unit or system tests in Roblox Luau.
---

# TestEZ Done Right

## Objective
Install a test practice that catches regressions: organized specs, service mocks (`DataStoreService`, `MemoryStoreService`, `CollectionService`), a shared runner in Studio and CLI, and a clear criterion for what to test per system.

## Scope and limits
Differentiation: `roblox-testing` (installed) is the QA umbrella (general strategy); this skill is the dedicated TestEZ practice (structure, mocks, commands). `luau-types` covers types; here everything tested only needs a verifiable contract. Multiplayer and UI have their own skills.

What it does NOT do:

- Does NOT cover 2+ client tests (see `roblox-multiplayer-testing`).
- Does NOT cover visual walkthroughs per screen (see `roblox-ui-testing`).
- Does NOT replace CI (see `roblox-ci-cd`); it delivers the command that CI runs.

## Use cases
1. Test a pure `ModuleScript` (loot, pity, state machine).
2. Test a component with add/remove lifecycle without leaks.
3. Mock `DataStoreService`/`MemoryStoreService` that fail or throttle.
4. Run the suite in Studio before push and in CI via CLI.
5. Pin a regression: a test that reproduces the bug before the fix.

## Step-by-step process
1. Structure: `specs/<System>_<aspect>.spec.lua` mirroring `src/`. One spec per behavior, with a name that says what it verifies.
2. Use canonical TestEZ `describe/it/expect`; each `it` verifies ONE thing with a present-tense name ("returns Epic when reaching pity 50").
3. Isolate with mocks: replace services with injected doubles (tables with the same interface). Never touch real data from tests.
4. Pin the RNG seed in probability tests; distribution assertions use counts, not a single roll.
5. Add lifecycle hooks (`beforeEach/afterEach`) that clean up connections, tables, and Tags so specs don't interfere.
6. Create ONE test runner script (`run-testez.sh` or equivalent) that uses the same command locally and in CI. Document how to run 1 spec and the whole suite.
7. Run in Studio (`TestService`) for fast iteration during development; validate in CLI/headless for CI. Both must give the same result.
8. Measure what to test per system with the matrix: pure modules (100% branches), components (lifecycle + leaks), data (retry + degradation), UI logic (states, not pixels).
9. On a bug: first write the failing test, then the fix, and keep the test as a regression. Without the test, the fix doesn't merge.

## Technical knowledge
- TestEZ runs under `TestService`; specs are `ModuleScript`s returning a `describe` function. The runner discovers them by naming convention.
- Mocks: pass dependencies as parameters (constructor/`Init`) so doubles can be injected. Code that can't be tested is usually code coupled to globals.
- `CollectionService` in tests: use a unique temporary Tag per spec (e.g. `Test_Spin_<id>`) and clean it in `afterEach` so Studio isn't contaminated.
- Data services: mock with modes (ok / fails N times / throttling) to verify `roblox-error-handling` retries.
- `BindableEvent` in same-context tests: verifies the system emits what's expected without networking.
- Useful coverage > total coverage: demand branches on guards, pity, retries, and `onRemoved`; don't chase 100% of cosmetic lines.
- Timing: each spec should run in ms; if a test needs long `task.wait`s, it's an integration test — separate it and label it.

Illustrative example (pity spec):

```luau
-- specs/Loot_pity.spec.lua (illustrative)
return function()
	local Loot = require(game.ReplicatedStorage.src.LootConfig)

	describe("pity", function()
		it("garantiza Epic al llegar al limite", function()
			local state = { sinceEpic = 49 }
			-- applyPity expuesto para test; ilustrativo
			local got = Loot.applyPity(state, "Common")
			expect(got).to.equal("Epic")
			expect(state.sinceEpic).to.equal(0)
		end)
	end)
end
```

Illustrative example (mock datastore with failures):

```luau
-- Ilustrativo: doble que falla 2 veces
local function flakyStore(failures: number)
	local calls = 0
	return {
		get = function(_key: string)
			calls += 1
			if calls <= failures then error("throttled") end
			return { coins = 10 }
		end,
		calls = function() return calls end,
	}
end
```

Illustrative example (single runner):

```bash
# run-testez.sh (illustrativo)
set -e
rojo build default.project.json -o build/test.rbxlx
run-in-roblox --place build/test.rbxlx --run TestService # adapta a tu runner CLI
```

## Best practices
- One `it`, one conceptual assertion. Names that read as a list tell the specification.
- Deterministic tests: pinned seed, no network, no real time except when labeled.
- Obsessive cleanup in `afterEach`: connections, Tags, global test tables.
- Pin the bug with a test first; document the bug ID in the spec if it helps.
- Fast suite (<2 min). Slow stuff goes to nightly, not the PR.

## Common mistakes
1. Hitting real `DataStoreService` from tests: corrupt data and flaky tests. Always mock.
2. Unseeded RNG: a test that passes 9/10 times. Pin the seed and assert distribution, not one case.
3. Specs sharing global state: order-dependent. `beforeEach` creates, `afterEach` destroys.
4. Test Tags left in the place: contaminate later runs. Clean in `afterEach`.
5. Only "happy" tests: pity, retry, and `onRemoved` uncovered. Test edges and failures.
6. Different runner locally vs CI: "works here". One shared script.
7. Slow tests with `task.wait(5)` in the PR path: everyone avoids running them. Separate as integration.

## Quality and done criteria
- [ ] `specs/` structure mirrors `src/`; every critical system has a spec.
- [ ] Mocks for every external boundary; zero real calls in the PR suite.
- [ ] `beforeEach`/`afterEach` clean state; the suite passes in any order 3 times in a row.
- [ ] Same command locally = CI, documented in README.
- [ ] Pinned regressions with a test that failed before the fix (evidence in the PR).
- [ ] PR suite time <2 min or justified nightly split.

## Tools
- TestEZ under `TestService` as the base runner.
- `ModuleScript` + `require` with injection for mocks.
- `CollectionService` / `BindableEvent` as same-context test points.
- Git + CI as gate (see `roblox-ci-cd`, `roblox-code-review`).

## Limitations
- Does not cover multi-client or visual UI; defer to `roblox-multiplayer-testing` and `roblox-ui-testing`.
- The exact CLI runner depends on the team's stack; adapt the script and verify.
- If you doubt TestEZ or runner APIs, note "(verify at create.roblox.com/docs)".
