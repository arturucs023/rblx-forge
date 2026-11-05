---
name: roblox-checkpoints
description: Checkpoints with progress saving, respawn, and anti-skip. Use it when you need obbies, towers, races, or levels with verified stages.
---

# Checkpoints (Progress Saving and Anti-Skip)

## Objective
Save progress fairly by stages: fast respawn at the last valid checkpoint, no skips via teleport, and states that survive rejoin.

## Scope and limits
Covers linear and branched checkpoints, respawn, purchasable skips, order validation, and persistence.
Declared differentiation: `roblox-game-systems` (installed) is a thin recipe book; this skill is the deep version with validated order and anti-skip. It does NOT cover jump difficulty design (compose with `roblox-obby` for obbies), global rewards (covered by `roblox-economy-balancing`), or quests (covered by `roblox-quest-progression-systems`). `roblox-genre-patterns` does not go deep.

## Use cases
- 50–200-stage obby with saving.
- Tower with floors and paid skips.
- Race with laps and sectors.
- Dungeon with doors requiring a prior checkpoint.
- Story mode with replayable chapters.

## Game or system loop (design)
1. Advance stage (jump/race/door).
2. Touch checkpoint → visual/audio confirmation.
3. Die/fall → respawn in 1–2 s at last valid one.
4. Optional: skip with rising cost.
5. Complete → time, deaths, and reward.
Balance example: checkpoints every 3–7 hard jumps or 60–90 s; skip = 25 Robux or 500 coins, +50% per extra skip in the same session; respawn <2 s; if churn on a stage exceeds 35%, add an intermediate checkpoint or nerf the jump.

## Step-by-step process
1. Number checkpoints `Stage_001...N` with `Attributes` (`StageIndex`, `RespawnCFrame`, `RequiereAnterior`).
2. Tag with the `Checkpoint` `CollectionService` tag; a server `Script` records touches, not `LocalScript`s.
3. Server validates order: only accepts `Stage_N` if `maxStage >= N-1` (linear) or if the graph allows the jump (branched with adjacency list).
4. Zone detection (`Touched` with debounce + `HumanoidRootPart` verification) or proximity every 0.25 s; prefer zone + order.
5. Save `maxStage` in memory and in `DataStoreService` at major checkpoints (every 5 or every tower), not every touch.
6. Respawn: `Humanoid.Died` → `PivotTo(RespawnCFrame + offset)` + 1.5 s invulnerability + steady camera.
7. Skips: `RemoteFunction SkipRequest` validates cost and moves to `N+1` as if touched (with audit).
8. UI: `12/50` progress, per-tower bar, skip button with cost, best-time table.

## Technical knowledge
### What the server validates
- Real touch: distance to checkpoint ≤10 studs and the correct player's living `Humanoid`.
- Order: rejects jumps of >1 stage except purchased skip or declared shortcut.
- Skip: sufficient funds, stage exists, 5 s cooldown between skips.
- Times: completing 50 stages in <120 s with 5-stud jumps flags for review (teleport).
### Persistence
- Save `maxStage`, deaths, best time, skips used with `DataStoreService` (`progress_v2`).
- On rejoin offer "continue at stage X" or restart; never spawn at a stage without validating requirements.
- Version per tower/map (`towerA_v3`); layout change resets or migrates with notice.
### Errors/disconnections
- Death during save: respawn uses the last confirmed checkpoint, not the pending one.
- Moved/destroyed checkpoint: fallback to previous valid one + log.
- Double touch from lag: idempotent (if already max, ignore).
### Anti-exploit
- Anti-teleport: validate travel between consecutive checkpoints (distance/time coherent with walk speed +20%).
- Anti-fly: if the player touches checkpoints without touching intermediate ground (sampling), void the streak.
- Client `Touched` never grants a stage; only the server writes `maxStage`.
- Skips with rate limit and log to detect refund abuse.

## Best practices
- Checkpoints visible at 40 m with distinct light/sound when activated.
- Respawns with no instant death or spun camera; brief signaled invulnerability.
- Difficulty in waves: 3 easy, 1 challenge, checkpoint; avoid 10 hard ones in a row.
- Use `Attributes` for current stage and replicate to UI without polling.
- Practice mode with infinite checkpoints and no ranking to curb rage-quit.

## Common mistakes
1. `Touched` without debounce → 20 touches/s and spam; 1 s debounce per player.
2. Saving every stage to DataStore → throttling; save every 5 and on exit.
3. Respawning at the edge → death loop; +2-stud offset and ground check.
4. Allowing touches in any order → free skips; validate `N-1`.
5. No invulnerability → double death in lava; 1–1.5 s with blinking.

## Quality and done criteria
- [ ] Teleport to stage 40 from 5 rejected 10/10 times.
- [ ] 100 legitimate touches at 150 ms lag accepted with <3% false rejections.
- [ ] Rejoin continues at saved stage in 5/5 tests.
- [ ] Average respawn 1.2–2 s measured over 20 deaths.
- [ ] Skip charges exact cost and advances 1 stage with audit.
- [ ] Per-stage churn measured to catch spikes >35%.

## Tools
Services/classes: `Players`, `CollectionService`, `Attributes`, `DataStoreService`, `RemoteEvent`, `RemoteFunction`, `BadgeService` (per-tower award). Check create.roblox.com/docs.

## Limitations
- Does not design jumps or full towers; compose with `roblox-obby`.
- Does not manage cross-server global rankings; use `OrderedDataStore`/`MemoryStoreService` as an extension.
- Does not cover complex keyed doors; that's `roblox-quest-progression-systems`.

```luau
-- Ilustrativo: validación de orden lineal.
local maxStage = {}
local function tocaCheckpoint(player, n: number): boolean
	local actual = maxStage[player.UserId] or 0
	if n == actual + 1 or n <= actual then
		maxStage[player.UserId] = math.max(actual, n)
		return true
	end
	return false -- skip no válido
end
```
