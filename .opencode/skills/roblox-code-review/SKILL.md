---
name: roblox-code-review
description: Pre-merge code review in Roblox Luau (authority, pcall, leaks, types, naming). Use it when requesting or giving review before merging.
---

# Code Review in Roblox Luau

## Objective
Turn every review into a reliable gate before merge: catch authority bugs, errors without `pcall`, connection leaks, weak types, and confusing naming, with an ask/give format that unblocks instead of blocking.

## Scope and limits
Differentiation: `roblox-code-maintenance-refactor` (installed) restructures already-merged code; this skill reviews BEFORE merging to decide whether it goes in. `luau-types` and `luau-performance` cover types and performance in depth; here they are checked as a checklist. `roblox-testing` (installed) is the QA umbrella; here the minimum test evidence per change is required.

What it does NOT do:

- Does NOT refactor for you; leaves actionable comments and the author fixes.
- Does NOT replace tests (see `roblox-testez`, `roblox-multiplayer-testing`, `roblox-ui-testing`).
- Does NOT define CI (see `roblox-ci-cd`); but blocks merge if CI is red.

## Use cases
1. Reviewing a PR with an authority change (who decides damage, currency, inventory).
2. Reviewing a new `ModuleScript` with events and connections.
3. Requesting review: describing what changes, risks, and how to test it.
4. Reviewing a `DataStoreService`/`MemoryStoreService` change with retries and `pcall`.
5. Reviewing UI with new flows (defer detail to `roblox-ui-testing`).

## Step-by-step process
1. The author opens the PR with the template: what changes, why, risks, how to test (commands/steps), captures if UI.
2. The reviewer does a first security/authority pass: does the client decide anything the server should decide? If yes, Request Changes immediately.
3. Second pass with the Roblox checklist (Knowledge section): `pcall`, leaks, types, naming, limits. Tag each finding with severity: Blocking / Suggestion / Nit.
4. Verify evidence: green CI, new tests or justification, and described manual playtest. Without evidence, don't approve.
5. Comment actionable: cite line/file, explain the concrete risk, propose a fix or example. No "this is wrong".
6. The author replies to each thread (fix or reasoned rebuttal). Don't resolve others' threads.
7. Re-review only what changed. Approve when no Blockers remain and CI is green.
8. After merge, note 1 lesson in the PR if there was a repeated-pattern bug (authority, leak, `pcall`).

## Technical knowledge
Mandatory Roblox checklist:

- Authority: the server validates all client input (amounts, positions, cooldowns). No reward is granted on the client alone.
- `pcall`/`xpcall`: every call to `DataStoreService`, `OrderedDataStore`, `MemoryStoreService`, `MessagingService` is wrapped with retry + backoff. Bare `pcall` is Blocking.
- Leaks: every `Connect` has a matching `Disconnect` (`Destroy`, `onRemoved`, end of round). Look for connections in loops and in `onAdded` without cleanup.
- Types: strict modes where they pay off, annotations on public APIs, no silent `any` in new signatures (see `luau-types` for detail).
- Naming: `Service`/`Factory`/`Component` by role; events with verbs; states as conditions. Forbid `Manager2`, `HelperFinal`, `Util`.
- Limits: validate ranges (NaN, negatives, giant strings) at boundaries; fail with useful asserts.
- `CollectionService`/`Attributes`: review Tags and attribute types with `typeof`; never assume types.
- Rojo/Git compatibility: no generated files or absolute paths (see `roblox-git-workflows`).

Illustrative example (good vs bad actionable comment):

```text
-- Malo: "esto puede fallar"
-- Bueno (Bloqueante): "DataStore sin pcall en CoinService.lua:42. Si falla,
-- el jugador pierde la compra sin error visible. Envuelve en pcall con
-- reintento x3 + backoff y registra en el log (ver roblox-error-handling)."
```

Illustrative example (minimal PR template):

```text
## What changes
## Risk (authority/data/performance)
## How to test (steps + edge cases)
## Evidence (CI/tests/captures)
```

## Best practices
- Review little and often: small PRs (<400 lines) review better and faster.
- Separate Blocking from taste: blockers prevent merge; taste is a suggestion.
- One thread, one topic. Don't mix naming with authority in the same comment.
- Praise the specific when a pattern is well applied; set the standard.
- Timebox: first response in <24 working hours; if you can't, ask for another reviewer.

## Common mistakes
1. Approving with red CI "because it works locally": breaks `main`. Rule: red = no merge.
2. Style-only review (commas, spaces) ignoring authority: the exploit passes. Authority first, style later (or leave it to StyLua in `roblox-ci-cd`).
3. Vague comments ("check this", "don't like it"): block without unblocking. Include line + risk + proposal.
4. Resolving others' threads and merging: the author didn't learn and the bug returns. The author closes their threads.
5. Giant unreviewable PRs: approved blind. Split by system or layer.
6. Ignoring leaks because "it's just one connection": N players × M rounds = crash. Demand a visible `Disconnect`.
7. Requesting review with no test steps: the reviewer guesses. Without "how to test", send the PR back.

## Quality and done criteria
- [ ] Authority verified: no client power without server validation.
- [ ] All data/messaging access with `pcall` + retry (or written justification).
- [ ] Zero connections without an identifiable paired `Disconnect`.
- [ ] Zero open Blockers + green CI + cited test/playtest evidence.
- [ ] Every thread answered (fix or rebuttal) with re-review of what changed.
- [ ] PR with full template; merge with squash or the repo's strategy (see `roblox-git-workflows`).

## Tools
- Git (diff, blame) + branch convention (see `roblox-git-workflows`).
- CI with selene/StyLua/tests (see `roblox-ci-cd`) as the merge gate.
- `TestService` + TestEZ for evidence per change (see `roblox-testez`).
- `ScriptProfiler` / MicroProfiler if the PR touches hot paths.

## Limitations
- This skill doesn't run CI or merge for you; it defines the review standard.
- Doesn't go deep into types or profiling; see `luau-types`, `luau-performance`.
- If in doubt about an API cited in the diff, flag `(check create.roblox.com/docs)` in the thread.
