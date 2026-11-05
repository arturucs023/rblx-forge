---
name: roblox-tower-defense
description: Tower defense with waves, pathing, tower economy, and co-op. Use it when you need maps with a path, synergies, bosses, and wave balance.
---

# Tower Defense (Waves, Pathing, Economy)

## Objective
Design a complete TD: legible path, towers with roles, interest economy (kills→gold→more towers), waves with counter-play, and co-op without chaos.

## Scope and limits
Deep genre version: loops, progression, mechanics, UX, performance, and pitfalls.
Declared differentiation: `roblox-genre-patterns` is a 1-line catalog; this skill is the deep TD version. `roblox-game-systems` is a thin recipe book. Does NOT repeat: grid placement composes with `roblox-building-placement`, damage/abilities with `roblox-combat-systems`, progression/meta with `roblox-quest-progression-systems`, global economy with `roblox-economy-balancing`, co-op/matchmaking with `roblox-social-systems`.

## Use cases
- Classic 20-wave TD with 6 towers.
- Endless with bosses every 10 and leaderboard.
- 4-player co-op with roles (slow/DPS/economy).
- PvP TD with sending leaks to the rival.
- TD event with weekly modifiers.

## Game or system loop (design)
- 30s loop: place/upgrade → watch wave → adjust position.
- Match loop (15–25 min): 15–25 waves, 2–3 bosses, 1–2 "trap waves" (fast/flying/armored).
- Meta loop: unlock tower, level it, try it in endless.
Economy: 300 starting gold, 6–12 per kill, wave bonus 50+10×n; base tower 100–300, upgrade ×1.6, sell 70%; DPS/100 gold must converge: cannon 8, archer 6 + range, ice 0 + 40% slow; boss HP = 12× expected average DPS; if normal win-rate leaves 45–65% over 200 games, retune HP/gold ±10%.

## Step-by-step process
1. Path with `PathfindingService` or fixed waypoints; show line and range preview when placing (compose grid with `roblox-building-placement`).
2. 5–7 towers with unique roles: single-target, AoE, slow, sniper, economy, buff; no duplicates.
3. Waves in a `WaveDefs` table: `comp`, `hpMult`, `velMult`, `immunity`, `boss`; announce counter-play ("flyers incoming! use archers").
4. Server-validated placement: free cell, inside zone, funds, 30 towers/player limit.
5. Server-side combat at 0.15–0.2s ticks (not per-tower per-frame); visual projectiles on client, damage on server.
6. Interest: gold per kill + flawless wave bonus (no leaks) +5%; defeat = lives − leaks (20 lives).
7. Co-op: shared gold or per-player with donation; roles with "need slow here" pings.
8. Endless: HP ×1.18^n after wave 25, `OrderedDataStore` leaderboard by wave/time.

## Technical knowledge
### What the server validates
- Purchase/upgrade: funds, tower exists, max level 4, valid cell.
- Damage: computed on server per tick; clients never report kills.
- Gold: only the server grants it; sales at exactly 70%.
- Early wave call (skip): validates all alive players voted, or solo mode.
### Persistence
- Save unlocked towers, levels, best wave, and loadouts with `DataStoreService`.
- Ongoing matches are not persisted mid-run except a checkpoint every 5 waves (resumable in solo).
### Errors/disconnections
- Co-op player leaves: their towers go "neutral" for 2 min, then sell for 50% to the team.
- Visual HP desync: the server sends a snapshot every 1s; clients interpolate.
- Stuck boss: 60s timeout → teleport to next waypoint with a log.
### Anti-exploit
- Anti out-of-zone/off-path placement: recomputed on server.
- Anti wave-speed: time is stamped by the server, not the client button.
- Rate-limit purchases 8/s; impossible gold (e.g. +10k in 10s) freezes and audits.
- Never accept `damage` or `gold` from the client.

## Best practices
- Enemy path + range preview always visible when placing.
- Towers with distinct sounds/looks; slow with colorblind-safe color.
- Soft defeat: show record wave and "one more upgrade and you'll clear it".
- Pools of enemies (max 60 alive) and LOD; no complex collisions.
- 3-wave tutorial with active pause and hints.

## Common mistakes
1. Per-frame damage per tower → O(n×m) and lag; 0.2s tick + spatial hash.
2. Unvalidated generated path → stuck enemies; fixed waypoints + test.
3. One dominant tower → rest useless; audited DPS/gold per tower.
4. No announced counter-play → flying wave wipes; warn 1 wave ahead.
5. Co-op without donation → one player hoards; kill gold to placer + 20% common pool.

## Quality and done criteria
- [ ] Normal win-rate 45–65% over 200 simulated/real games.
- [ ] 60 live enemies without dropping below 45 FPS on a mid-range device.
- [ ] Illegal placement (on path/outside) rejected 20/20.
- [ ] Boss 10 falls within designed window ±20% with correct strategy.
- [ ] Co-op disconnect doesn't break the match in 3 tests.
- [ ] Endless 30+ saves record without duplication.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `CollectionService`, `PathfindingService`, `DataStoreService`, `OrderedDataStore`, `Teams` (co-op). Compose with `roblox-building-placement` and `roblox-combat-systems`. Verify at create.roblox.com/docs.

## Limitations
- Does not cover PvP wave-sending in detail; dedicated extension.
- Does not cover map editor; fixed path or separate generator.
- Fine balance demands simulation + playtesting; starting numbers are indicative.

```luau
-- Ilustrativo: DPS por oro para auditar torres.
local function dpsPorOro(dps: number, coste: number): number
	return (dps / coste) * 100
end
-- Compara cañón 8 vs. arquera 6; si una duplica a otra, rebalancea.
```
