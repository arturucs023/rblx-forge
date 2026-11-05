---
name: roblox-dynamic-events
description: Temporary events with bosses, gameplay weather, and announcements. Use it when you need invasions, drops, world bosses, or rotating modifiers.
---

# Dynamic and Temporary Events

## Objective
Keep the game alive with scheduled and emergent events: special spawns, world bosses, rule-changing weather, and announcements that mobilize without saturating.

## Scope and limits
Covers calendar, spawning, scaling by players, announcements, and event rewards.
Stated differentiation: the installed `roblox-game-systems` is a fine-grained recipe book; this skill is the deep version with scheduling, scaling, and anti-camp. Does NOT cover boss AI in detail (compose with `roblox-combat-systems`), nor quests tied to events (covered by `roblox-quest-progression-systems`), nor rare-drop economy (covered by `roblox-economy-balancing`). `roblox-genre-patterns` doesn't go deep into events.

## Use cases
- Hourly world boss with shared loot.
- Meteor rain that alters routes for 5 min.
- Night invasion with base waves.
- Contested air drop in PvP.
- Double-XP weekend with a cap.

## Game or system loop (design)
1. Advance notice (5 min + 1 min) with place and rules.
2. Travel/preparation (risk decision).
3. Participation (damage, defense, gathering per event).
4. Close with ranking and distribution (participation > pure damage).
5. Cooldown and rotation to avoid fatigue.
Balance example: boss 12k base HP + 2k per extra player (40k cap), 10 min window, top 5% loot + 60% of value via participation; frequency: minor every 15 min, major every 60–120 min; if attendance drops below 20% of peak over 2 weeks, rotate type/time.

## Step-by-step process
1. Define the `EventDefs` catalog: `id`, `duration`, `advanceNotice`, `minPlayers`, `scaling`, `reward`, `globalCooldown`.
2. Central scheduler on the server: queue with `os.time()`, avoid overlaps (max 1 major + 1 minor), respect peak hours.
3. Announcements in 3 levels: banner + sound + map marker; include countdown and rules in 2 lines.
4. Validated spawning: free spots, outside safe zones if PvP, with `Attributes` (`EventId`, `ExpiresAt`).
5. Scaling: HP/damage/nodes based on real participants at T+60 s, not on full server.
6. Participation: table of `damage/heal/timeInZone` per player; reward by thresholds, not top-1 only.
7. Clean close: despawn, distribute, log, and cooldown; announce the next 2 events.
8. Telemetry: attendance, real duration, complaints/fatigue (ignoring notices), tune frequency.

## Technical knowledge
### What the server validates
- Reward eligibility: minimum damage/time, present at close or dead within window (30 s grace).
- Damage to the boss only inside the arena and active window; outside = 0.
- Event drop pickup with proximity ≤12 studs and owner/loot window.
- One player = one reward per event (idempotency via `eventUid+UserId`).
### Persistence
- Save event participations and legendary pity with `DataStoreService`; don't save live event state.
- Light persistent calendar (last major, attended streak) for loyalty bonus.
### Errors/disconnections
- Mid-event drop: if back in <5 min, partial participation is kept.
- Stuck boss (no damage for 90 s): reposition or reset with HP preserved; after 2 resets, close with partial reward.
- Server shutdown: event is cancelled and entry cost refunded if there was one.
### Anti-exploit
- Anti-AFK in zone: requires damage/movement, not just presence.
- Anti-teleport to the drop: validate arrival on foot/reasonable distance.
- Anti-multibox: reduce loot 50% from the 2nd account on in the same event (heuristic + log).
- Rate-limit reported damage if using hit remotes: 15/s.

## Best practices
- One event at a time on screen; visible queues, not 3 banners at once.
- Fair rules announced upfront: "top 5 plus everyone over 500 damage gets paid".
- Accessible: free teleport to the event, clear minimum level, spectator mode.
- Use `CollectionService` to clean up leftovers and `Attributes` for visible timers.
- Pace: 70% minor events, 25% medium, 5% epic.

## Common mistakes
1. Fixed-HP boss → trivial with 30 players or impossible with 3; scale by real attendance.
2. Only rewards top-1 → 90% never return; pay via wide thresholds.
3. Notices with no location → nobody arrives; marker + teleport.
4. Overlapping events → lag and confusion; scheduler with mutex.
5. Loot with no window → ninja-loot and toxicity; personal or contribution loot.

## Quality and done criteria
- [ ] 3 consecutive events (minor/major/minor) with no overlap or leftovers on the map.
- [ ] Boss scales 12k→20k going from 4 to 8 participants (±15%).
- [ ] 5-min AFK in zone gets zero reward; minimum participant does get paid.
- [ ] Disconnect and rejoin within 3 min keeps participation.
- [ ] Attendance measured and distribution log auditable over 2 events.
- [ ] Ignored notices <30% (controlled fatigue).

## Tools
Services/classes: `RemoteEvent`, `Players`, `Teams`, `CollectionService`, `Attributes`, `DataStoreService`, `MessagingService` (to coordinate cross-server events if applicable), `BadgeService` (event badges). Verify at create.roblox.com/docs.

## Limitations
- Does not design bosses with complex phases; compose with `roblox-combat-systems`.
- Does not balance unique-drop economy; compose with `roblox-economy-balancing`.
- Advanced cross-server coordination needs additional `MessagingService` design.

```luau
-- Ilustrativo: escalado de HP por participantes.
local function hpEscalado(base: number, extra: number, n: number, cap: number): number
	return math.min(cap, base + extra * math.max(0, n - 1))
end
```
