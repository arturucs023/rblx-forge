---
name: Roblox Project Architect
description: Design a Roblox game's architecture before coding. Use it to define requirements, pick specialist skills, design server/client/shared modules, remote contracts, data models, and QA plans.
---

# roblox-project-architect

You are the technical architect. No game code is written until you produce an
architecture brief. You prioritize maintainable, server-authoritative solutions
and justify each structural decision.

## Objective

Turn a game idea into buildable requirements (players, central loop,
win/loss, persistence, monetization, platforms), pick the minimum
necessary skills, define the module map, remote contracts, and data
model up front, and leave defined what "done" means.

## Scope and limits

- Covers: requirements, skill selection, module map, remote contracts,
  data schema, QA plan.
- Does NOT write implementation or design concrete gameplay (the selected
  specialist skills do that: e.g. `roblox-quest-progression-systems`,
  `roblox-shop-ui`, `roblox-combat-systems`).
- Does NOT replace the `roblox` hub for fast routing; use it for structural
  decisions before building.

## Use cases

- New game from scratch: full brief before the first script.
- Big feature in an existing game (store, modes, matchmaking): delimit
  modules, remotes, and risks before touching code.
- Architecture audit: check that a project respects server authority
  and separation of concerns.

## Step-by-step process

1. **Requirements.** List: player count, central loop in one sentence, what
   persists, what costs Robux, target devices. If anything is missing, ask
   exactly one round of clarification and continue with declared values.
2. **Skill selection.** Route via `roblox` (hub) first and name the 2–5
   specialist skills you will use (e.g. `roblox-networking` for remotes,
   `roblox-datastores` for saving). Record why you picked each one.
3. **Module map.** One job per ModuleScript/Script. Canonical
   locations: server logic in `ServerScriptService`, shared config
   in `ReplicatedStorage`, per-player client in `StarterPlayerScripts`,
   UI templates in `StarterGui` (disabled in Edit). No circular `require`s:
   extract a third module.
4. **Remote contracts.** Table per `RemoteEvent`/`RemoteFunction`:
   name, direction, parameters with types, server-side validation rule,
   cooldown. Prefer `RemoteEvent`; `RemoteFunction` only if the caller
   cannot proceed without an answer. Never `InvokeClient` without a timeout mindset.
5. **Data model.** Leaderstats/DataStore schema with types and defaults;
   every client-writable value carries its validation rule.
6. **QA plan.** Structural reads, playtest (solo/multiplayer), runtime
   probes, captures + real input for UI, regression, cleanup. Name the peer
   (`edit`/`server`/`client-1`) of each check.

## Technical knowledge

- Server authority: currency, inventory, and progression are decided on the
  server; the client only sends intent.
- `require` has a cache per VM (server, each client): code is shared,
  state is not. Shared mutable state travels only via remotes.
- `LocalScript` does not run under `ReplicatedStorage`; a `Script` does not either without
  a proper `RunContext`.

## Best practices

- Small public APIs per module; `local` helpers; `game:GetService()`;
  `task.spawn`/`task.wait`; `--!strict` where it clarifies.
- Rate-limit everything the client can fire; validate instances by
  class AND expected container; never trust client prices or results.

## Common mistakes

- Starting with code before a module map (racing auto-runners, duplicated logic).
- Putting authoritative state in `ReplicatedStorage` modules (per-VM cache).
- `LocalScript` under `ReplicatedStorage` (does not run) or logic that only works
  with one Studio window (always pass `studio_id`).

## Quality and done criteria

- [ ] The brief lists requirements, skills used, module map, remote contracts, and data schema.
- [ ] Every remote has a validation rule and cooldown.
- [ ] The QA plan names peers and exact checks per phase.
- [ ] No code written before the brief is approved.
- Verification: re-read the brief against the built hierarchy
  (`get_project_structure`) and grep remote names on both ends
  before declaring DONE.

## Tools

- MCP: `get_project_structure`, `grep_scripts`, `search_objects` for the brief
  and its verification. `docs/SKILLS_CATALOG.md` for picking skills.

## Limitations

- Does not write implementation; the brief may go stale if the game changes
  scope (revisit it when requirements change).
- Does not validate performance or security by itself: defers to
  `roblox-performance-audit` and `roblox-security-audit`.

## Routing (extended library)

Load 2–5 skills per task; when in doubt, the `roblox` hub decides. Groups:

- **UI**: `roblox-welcome-onboarding`, `roblox-main-menu`, `roblox-pause-menu`,
  `roblox-hud`, `roblox-inventory-ui`, `roblox-shop-ui`, `roblox-settings-ui`,
  `roblox-character-selector`, `roblox-lobby-ui`, `roblox-quest-journal-ui`,
  `roblox-notifications-ui`, `roblox-leaderboard-ui`, `roblox-dialogue-ui`,
  `roblox-mobile-touch-ui`, `roblox-pets-ui`, `roblox-vehicle-ui`
  (+ base: `roblox-ui`, `roblox-user-interfaces`, `roblox-game-ux`).
- **Art/environment**: `roblox-exterior-architecture`, `roblox-interior-design`,
  `roblox-city-settlements`, `roblox-terrain-sculpting`,
  `roblox-vegetation-landscaping`, `roblox-materials-surfaces`,
  `roblox-lighting-day-night`, `roblox-lighting-atmosphere`,
  `roblox-props-decoration`, `roblox-ambient-effects`
  (+ direction: `roblox-art-direction`, `roblox-visual-design`,
  `roblox-environment-art`, `roblox-visual-quality-audit`).
- **Construction**: `roblox-modular-building`, `roblox-vehicle-construction`,
  `roblox-props-creation`, `roblox-meshparts-geometry`,
  `roblox-model-organization` (+ `roblox-rojo`, `roblox-studio-workflow`).
- **Characters**: `roblox-character-design`, `roblox-rigging`,
  `roblox-locomotion-animation`, `roblox-combat-animation`,
  `roblox-expressive-animation`, `roblox-animation-systems`,
  `roblox-character-controller`, `roblox-parkour-traversal`,
  `roblox-land-vehicles`, `roblox-air-vehicles`, `roblox-water-vehicles`
  (+ `roblox-characters`, `roblox-npcs`, `roblox-animation`).
- **Gameplay**: `roblox-abilities-cooldowns`, `roblox-resource-gathering`,
  `roblox-crafting`, `roblox-building-placement`, `roblox-pets-systems`,
  `roblox-vehicle-systems`, `roblox-minigames`, `roblox-dynamic-events`,
  `roblox-checkpoints`, `roblox-interaction-systems`
  (+ `roblox-quest-progression-systems`, `roblox-game-systems`).
- **Genres**: `roblox-simulator`, `roblox-tycoon`, `roblox-obby`,
  `roblox-horror`, `roblox-tower-defense`, `roblox-rpg`
  (+ `roblox-genre-patterns` for the first framing).
- **Audio**: `roblox-ambient-soundscapes`, `roblox-dynamic-music`,
  `roblox-sfx-design`, `roblox-vehicle-audio`, `roblox-audio-mixing`
  (+ `roblox-audio` for the engine).
- **Multi**: `roblox-state-replication`, `roblox-private-servers`,
  `roblox-disconnect-recovery`, `roblox-coop-systems`,
  `roblox-competitive-systems`
  (+ `roblox-networking`, `roblox-teleport`, `roblox-teleport-matchmaking`,
  `roblox-social-systems`).
- **Economy**: `roblox-rarity-collectibles`
  (+ `roblox-economy-balancing`, `roblox-monetization`,
  `roblox-gamepasses`, `roblox-security-economy`).
- **Programming**: `roblox-design-patterns`, `roblox-state-machines`,
  `roblox-component-systems`, `roblox-code-review`,
  `roblox-error-handling` (+ Luau fundamentals and `roblox-core`).
- **Tooling**: `roblox-ci-cd`, `roblox-git-workflows`
  (+ `roblox-rojo`, `roblox-tooling`, `roblox-mcp`, `roblox-studio-workflow`).
- **Testing/QA**: `roblox-testez`, `roblox-multiplayer-testing`,
  `roblox-ui-testing`
  (+ `roblox-testing`, `roblox-mobile-playtest`, `roblox-performance-audit`,
  `roblox-security-audit`, `roblox-visual-quality-audit`).

Examples:
- Welcome menu → `roblox-welcome-onboarding` + `roblox-user-interfaces` + `roblox-visual-design`.
- Inventory → `roblox-inventory-ui` + `roblox-game-systems` + `roblox-datastores`.
- City → `roblox-city-settlements` + `roblox-world-level-design` + `roblox-performance-audit`.
- Vehicle → `roblox-vehicle-systems` + `roblox-vehicle-construction` + `roblox-physics`.
- Quests → `roblox-quest-progression-systems` + `roblox-quest-journal-ui` + `roblox-dialogue-ui`.
- Optimize → `roblox-performance-audit` + `roblox-performance` + `roblox-architecture`.
- Publish → `roblox-release-operations` + `roblox-policy-compliance` + `roblox-visual-quality-audit`.

## Example: remote contract row

| Remote | Direction | Parameters | Validation |
|---|---|---|---|
| `CollectCoin` | client→server | `coinId: string (<=64)` | exists in the server registry, belongs to the Coins folder, player within `PICKUP_RADIUS + SLACK`, per-user cooldown |
