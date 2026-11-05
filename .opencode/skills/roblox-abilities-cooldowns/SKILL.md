---
name: roblox-abilities-cooldowns
description: Abilities with cooldowns, charges, and ultimates (dash, dodge, AoE). Use it when you need to design, balance, or validate abilities with cooldown UI and server-side anti-spam.
---

# Abilities and Cooldowns

## Objective
Design and implement active abilities (dash, dodge, stun, ultimate) with readable cooldowns, authoritative server-side validation, and UI that always reflects the real state.

## Scope and limits
This skill covers the full ability cycle: unlock, activation, cooldown, interruption, UI, and telemetry. It is the deep, production version.
Declared differentiation: `roblox-game-systems` (installed) is a thin recipe book with minimal examples; this skill is the deep version with numeric balance, state machines, and anti-spam. It does NOT cover full combat with hitboxes and damage (covered by `roblox-combat-systems`), quest-unlock progression (covered by `roblox-quest-progression-systems`), or premium ability pricing (covered by `roblox-economy-balancing`). `roblox-genre-patterns` is only a genre catalog and does not go deep into abilities.

## Use cases
- Dash with i-frames and double charge.
- Directional dodge with shared stamina.
- Ultimate charged by damage dealt with a short cinematic.
- Healing ability with interruptible cast.
- Tactical sprint with a noise penalty in horror/stealth.

## Game or system loop (design)
1. Player reads state (icon + radial + key + charges).
2. Attempts activation (input → request to server).
3. Server validates (cooldown, resource, state, distance/LOS if applicable).
4. Execution (gameplay effect + VFX/SFX + cost).
5. Recovery (cooldown/charges) and readable failure feedback.
Balance example: 12 m dash, 6 s CD, 2 charges, 6 s/charge recharge; sustained DPS should not rise more than +18% vs. not using the ability; ultimate every 90–120 s of active play. If an ability's pick rate exceeds 70% or its build win rate exceeds 55%, rebalance costs.

## Step-by-step process
1. Define catalog: ID, type (instant / cast / channeled / toggle), cost, CD, range, duration, tags.
2. Define per-player state machine: `Ready → Casting → Active → Recovering → Ready`, plus `Locked` and `Silenced`.
3. Implement client input as intent only: send `RemoteEvent AbilityRequest(ID, tick, aimCFrameCompacto)`, never apply a definitive local effect.
4. Implement authority on the server: table `estado[Player][AbilityID] = {nextReady, cargas, casteoHasta}`; reject if `os.clock() < nextReady`.
5. Apply the effect from the server (speed, damage via `roblox-combat-systems`, buff with `Attributes`), replicate with `Attributes` or `RemoteEvent AbilityFired`.
6. Build UI: cooldown radial, countdown, charge pips, "not ready" flash with reason (`CD`, `STUN`, `NO MANA`).
7. Add interruptions: damage above threshold cancels casts; death/stun clears states; tool switching never duplicates timers.
8. Telemetry: uses/min, server rejection rate, pick rate; tune numbers each iteration.

## Technical knowledge
### What the server validates
- Cooldown and charges with the server clock (`os.clock()`), never client `tick()`.
- Sufficient resource (mana/stamina read from server-side `Attributes`).
- Allowed state: not dead, not stunned, not in menu/shop.
- Parameters within range: target distance ≤ range + 2-stud tolerance, angle and line of sight if directed.
- Rate limit: maximum 8 requests/s per player; excess = ignore + count strike.
### Persistence
- Save with `DataStoreService` only ability unlocks and level, never active cooldowns. On load, everything enters `Ready` except the ultimate, which starts at 30% charge.
- Version the `abilities_v1` table; migrate with pcall and default values.
### Errors/disconnections
- If the client drops packets, the server is the source of truth: the client reconciles UI when receiving `AbilityState`.
- `PlayerRemoving` clears timers and casts. Respawn resets states to `Ready`.
- Failed `RemoteEvent` or detected exploit: respond with a typed error code, not a kick, except for repeat offenses (3 strikes in 60 s).
### Anti-exploit
- The client never sends "I deal 500 damage" or "my CD is over"; the server recalculates everything.
- Sanitize `aimCFrame`: clamp magnitude, NaN check (`v ~= v`), and maximum distance from `HumanoidRootPart`.
- Spam detection: sliding window; more than 12 attempts in 2 s = silence inputs for 5 s and log.
- Don't trust the local `CooldownGui`; an exploiter can hide it, the server still blocks.

## Best practices
- One server `Script` `AbilityServer` + one shared `ModuleScript` `AbilityDefs`; one `LocalScript` only for input and visual ghosts.
- Use `CollectionService` to tag zones that silence abilities (`NoAbilityZone`).
- Short global cooldown (0.35 s) in addition to the specific one to prevent double-ability macros.
- Feedback in <150 ms even though the server authorizes the effect: non-authoritative local pre-visual + correction.
- Accessibility: rebindable keys, touch alternative with big buttons, color-blind-safe radials.

## Common mistakes
1. Cooldown only on client → infinite spam with executors; fix by moving the clock to the server.
2. Charges duplicated on tool re-equip → keep state per `Player`, not per tool.
3. Dash through walls → validate destination with `Raycast`/`Shapecast` on the server and slide or cancel.
4. Ultimate not interrupted on death → the ghost keeps dealing damage; clean up with `Humanoid.Died`.
5. Desynced UI after lag → don't animate CD with `TweenService` alone; reconcile with the server timestamp.

## Quality and done criteria
- [ ] 100 consecutive legitimate activations with no false rejection at 80–200 ms ping.
- [ ] Spam script (20 req/s for 10 s) blocked with no server degradation and no effect applied.
- [ ] UI shows the failure reason for 100% of tested rejections (CD, resource, state).
- [ ] Dash respects collisions in 50/50 attempts against thin and thick walls.
- [ ] Ability pick rates between 15–70% and build win-rate delta <6 pp in a 200-round sample.
- [ ] Rejoin preserves no cooldowns and duplicates no charges.

## Tools
Services/classes: `RemoteEvent`, `Players`, `Attributes`, `CollectionService`, `TweenService`, `ProximityPrompt` (for interaction abilities if applicable), `PathfindingService` (not needed here), `DataStoreService` (unlocks only). All with stable APIs; if in doubt, check create.roblox.com/docs.

## Limitations
- Does not implement precise hitboxes or sustained-damage balance; compose with `roblox-combat-systems`.
- Does not implement talent trees or quest unlocks; compose with `roblox-quest-progression-systems`.
- Latencies above 300 ms require prediction design beyond this scope.

```luau
-- Ilustrativo: validación mínima de cooldown en servidor.
local estado = {}
local CD = 6
local function puedeUsar(playerId: string): boolean
	local s = estado[playerId]
	if not s then s = { listoEn = 0 } estado[playerId] = s end
	return os.clock() >= s.listoEn
end
local function marcarUso(playerId: string)
	estado[playerId].listoEn = os.clock() + CD
end
```
