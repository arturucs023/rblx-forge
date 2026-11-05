---
name: roblox-minigames
description: Short rounds with lobbies, matchmaking, scoring, and rotation. Use it when you need party games, micro-games, or rotating lobbies.
---

# Minigames (Short Rounds and Lobbies)

## Objective
Create 1–4 minute minigames with a full cycle: lobby, matchmaking, round, scoring, podium, and rotation with no dead time.

## Scope and limits
Covers lobby state machine, teams, scoring, map/mode rotation, and per-round rewards.
Declared differentiation: `roblox-game-systems` (installed) is a concise recipe book with a simple round loop; this skill is the deep version with concurrent lobbies, matchmaking, and anti-AFK. Does NOT cover detailed combat (covered by `roblox-combat-systems`), nor persistent level progression (covered by `roblox-quest-progression-systems`), nor global economy (covered by `roblox-economy-balancing`). Persistent social (clans/parties) is covered by `roblox-social-systems`. `roblox-genre-patterns` only catalogs.

## Use cases
- Party pack with 8 rotating micro-games.
- 1v1 arenas with fast queue.
- 4-player co-op against the clock with ranking.
- Free-for-all with infinite 3-min respawn.
- Private-lobby tournaments with code.

## Game or system loop (design)
1. Enter lobby and vote map/mode (15–20 s).
2. Intermission with rules (10 s) and teleport to arena.
3. 90–180 s round with a clear objective and comeback possible.
4. Podium + points + MVP (15 s).
5. Back to lobby with anti-repeat rotation.
Example balance: 6–12 players/lobby, 120 s round, points 1st=100/2nd=70/3rd=50/rest 20 for participating; AFK = 0; matchmaking by simple MMR ±150; if one mode wins >45% of votes 3 days running, nerf its weight or rotate it out for 24 h.

## Step-by-step process
1. Design 3–5 minigames with the same interface: `Setup(arena)`, `Start(players)`, `ScoreTick()`, `Finish() → results`.
2. Implement `RoomManager` on the server: `Lobby → Voting → Intermission → Live → Results → Lobby`, with timeout per state.
3. Concurrent lobbies: lobby list with cap (e.g. 12 players), autobalance, and backfill until 15 s into the round.
4. Matchmaking: global queue with `MemoryStoreService` or server table; group by party size and MMR; private lobby with 6-char code.
5. Server-side scoring with per-player `Attributes`; events only via validated `RemoteEvent RoundScore`.
6. Anti-AFK: detect movement/inputs every 20 s; 2 warnings → spectator with no points.
7. Rotation: avoid repeating mode/map twice in a row; vote with anti-spam weight (1 vote/player).
8. Rewards: XP/currency by position + MVP bonus + daily streak; save with DataStores.

## Technical knowledge
### What the server validates
- Eligibility: player in lobby, alive/in game, round `Live`.
- Points: only from server logic (zone, validated kill, delivery); client never sends "+100".
- Votes: 1 per player per phase; lobby and option exist.
- Arena teleports by server only (`PivotTo`); reject client positions.
### Persistence
- `DataStoreService` for total points, wins, MMR, and streaks; `MemoryStoreService` for ephemeral queues/rankings.
- Save at round end, not per point; pcall + retry.
### Errors/disconnections
- Player leaves mid-round: their points stay, teams rebalance if <4/lobby; backfill if <15 s.
- Server closes: `BindToClose` persists the round table.
- Tie: break by last-point time, then random with server seed.
### Anti-exploit
- Anti-speed/teleport to objective: validate speed and proximity before counting a point.
- Anti-farm with alts: detect same device/IP on repeated podiums (heuristic) + reduced points in private lobby.
- Scoring event rate-limit 10/s; ignore excess.
- Votes and queues with cooldown against bots.

## Best practices
- Rules in 2 lines + icon; playable 10 s tutorial, not long text.
- Dead time <20 s; "play again" button always visible.
- Big color-blind-safe UIs; MVP celebration short and unskippable max 3 s.
- Small readable maps; respawn <3 s.
- Telemetry per mode: average duration, abandon %, fun (votes/repick).

## Common mistakes
1. One global lobby → eternal wait; use concurrent lobbies + backfill.
2. Client-side points → infinite farming; move to server.
3. No voting timeout → hung lobby; 20 s timeout with random default.
4. Pure random rotation → repeats 3 times; history of 3 + veto.
5. Reward only 1st → 70% quit; pay to the last place with a soft curve.

## Quality and done criteria
- [ ] Lobby → podium → lobby in <4 min with 8 simulated players.
- [ ] Backfill fills leavers in <15 s without breaking teams.
- [ ] Client point exploit grants 0 points in 20 attempts.
- [ ] Mid-round abandonment <15% over 50 test rounds.
- [ ] No mode/map repeats twice in a row over 30 rotations.
- [ ] Rejoin keeps totals; in-progress round doesn't double-grant.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `Players`, `Teams`, `MemoryStoreService`, `DataStoreService`, `TeleportService` (between places only, not lobbies), `Attributes`. See create.roblox.com/docs.

## Limitations
- No complex cross-server matchmaking or advanced seasons ELO; base design here.
- No fine combat; compose with `roblox-combat-systems`.
- No persistent parties/clans; compose with `roblox-social-systems`.

```luau
-- Ilustrativo: máquina de estados de sala.
local Estado = "Lobby"
local ORDEN = { Lobby = "Voting", Voting = "Intermission", Intermission = "Live", Live = "Results", Results = "Lobby" }
local function avanzar()
	Estado = ORDEN[Estado]
	print("Sala -> " .. Estado)
end
```
