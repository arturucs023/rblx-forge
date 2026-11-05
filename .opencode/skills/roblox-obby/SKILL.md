---
name: roblox-obby
description: Obbies with staged difficulty, checkpoints, and rage-quit control. Use it when you need towers, fair rage games, skips, and verified times.
---

# Obbies (Difficulty, Checkpoints, Towers)

## Objective
Design addictive and fair obbies: staged curve, frequent checkpoints, optional paid skips, and anti-rage that retains without giving away.

## Scope and limits
Deep genre version: loops, progression, mechanics, UX, performance, and pitfalls.
Declared differentiation: `roblox-genre-patterns` is a 1-line catalog; this skill is the deep obby version. `roblox-game-systems` is a fine recipe book; here it is composed. Does NOT repeat: technical checkpoints compose with `roblox-checkpoints`, movement abilities (dash/double jump) with `roblox-abilities-cooldowns`, quests/achievements with `roblox-quest-progression-systems`, monetization with `roblox-economy-balancing`.

## Use cases
- 100-floor tower with 3 difficulties.
- Short rage obby with paid skip.
- Cooperative obby with 2-player buttons.
- Obby race with timer and leaderboard.
- 1000-stage mega-obby with per-world saving.

## Game or system loop (design)
- 30 s loop: attempt jump → fail cheaply → retry in <2 s.
- 10 min loop: beat a themed section and watch progress % rise.
- Session loop: crown the tower, photo + badge + time.
Difficulty: measure `deaths/attempts` per stage; easy <15%, medium 15–35%, hard 35–60%, extreme >60% only optional; 70% easy/medium stages, 25% hard, 5% extreme; checkpoint every 4–8 jumps or 60–90 s; if quits on a stage exceed 40% over 500 attempts, nerf it (+0.5-stud platform or extra checkpoint).

## Step-by-step process
1. Lock the layout in themed 10-stage sections with a big checkpoint at the end (compose saving with `roblox-checkpoints`).
2. Standardize jumps: base distance 7 studs walking, 10–12 running; height 2–3; lava = instant death with 1.5 s respawn.
3. Rotating variety: jumps, `Conveyor`, ice (low friction), timed buttons, patterned lasers; introduce 1 new mechanic per section with a safe practice zone.
4. Skips: 1 free per tower + rest with Robux/currency at rising cost; skips grant no leaderboard time.
5. Modes: normal (checkpoints), hardcore (no checkpoints, separate badge), time trial (server timer).
6. UX: current/total stage, tower %, deaths, timer, best-attempt ghost where applicable.
7. Time validation: server-only timer; complete with ordered `Touched` (compose with `roblox-checkpoints`).
8. Cohort playtest: newcomers must complete the easy tower in 15–25 min with <80 deaths.

## Technical knowledge
### What the server validates
- Checkpoint order and coherent times (walking speed + tolerance).
- Skip with payment and audit; leaderboard excludes skipped runs.
- Winner/badge only if required stages were covered in order.
- Checkpoint touch rate-limit 10/s.
### Persistence
- `DataStoreService`: `maxStage` per tower, best skip-less time, total deaths, skips used.
- Save at each big checkpoint + on exit; version per tower (`obbyTorreA_v2`).
- Rejoin offers continue; hardcore never saves mid-run.
### Errors/disconnections
- Mid-tower crash: rejoin at the last big checkpoint, not the exact one if the layout changed.
- Desynced moving platform: use server-time `TweenService`/CFrame, not client physics.
- Player pushing: optional collision toggleable in narrow zones.
### Anti-exploit
- Anti-fly/teleport between checkpoints (distance/time); 3 strikes = invalidated run, no ban.
- Anti-noclip on thin walls: minimum 1-stud thickness + kill-brick behind if critical.
- Speed-hack: if section time <60% of the human record, invalidate.
- Fake skips: only the server can advance a stage.

## Best practices
- Cheap fast death: respawn ≤2 s, no loading screen.
- Signpost: green = safe, red = death, yellow = timed; 5-jump tutorial.
- Visible distinct checkpoints; short achievement sound.
- Rage control: humorous message, practice button, suggested pause after 10 deaths in a row.
- Performance: reuse pieces, `CanCollide` only where it matters, LOD on 500+ part towers.

## Common mistakes
1. 20 hard jumps with no checkpoint → 60% rage-quit; checkpoint every 5.
2. 1-stud platforms with lag → impossible on mobile; minimum 3×3 for normal.
3. Lava with a giant hitbox → unfair deaths; hitbox 10% smaller than the visual.
4. Client-side timer → fake records; server timer.
5. No practice mode → newcomers quit; practice with no ranking.

## Quality and done criteria
- [ ] Easy tower completed by 5 new testers in 15–25 min.
- [ ] No stage with quits >40% over 500 attempts.
- [ ] Teleport to the top rejected 10/10 with no badge.
- [ ] Average respawn <2 s over 20 deaths.
- [ ] Skipped run automatically excluded from the leaderboard.
- [ ] 30 players in the tower at ≥45 FPS.

## Tools
Services/classes: `Players`, `CollectionService`, `Attributes`, `DataStoreService`, `OrderedDataStore` (times), `RemoteEvent`, `BadgeService`, `TweenService`. Compose with `roblox-checkpoints` and `roblox-abilities-cooldowns`. Check create.roblox.com/docs.

## Limitations
- Does not cover advanced movement abilities; compose with abilities.
- Does not cover complex cross-server rankings; extension with `MemoryStoreService`.
- Does not generate procedural towers; manual layout or separate generator.

```luau
-- Ilustrativo: tasa de abandono por etapa.
local function abandono(intentos: number, abandonos: number): number
	if intentos == 0 then return 0 end
	return abandonos / intentos
end
-- Si > 0.40 en 500 intentos, nerfear etapa.
```
