---
name: roblox-rpg
description: RPG/adventure with classes, stats, world, bosses, and party. Use it when you need to design progression, zone quests, dungeons, and group combat.
---

# RPG / Adventure (Classes, Stats, World, Bosses)

## Objective
Design a 30+ hour playable RPG: 3–5 classes with identity, transparent stats, zoned world, quests, dungeons, bosses with mechanics, plus a party that rewards cooperating.

## Scope and limits
Deep genre version: loops, progression, mechanics, UX, performance, and pitfalls.
Declared differentiation: `roblox-genre-patterns` is a 1-line catalog; this skill is the deep RPG version. `roblox-game-systems` is a lean recipe book. Does NOT repeat: fine combat composes with `roblox-combat-systems`, quests/achievements with `roblox-quest-progression-systems`, economy with `roblox-economy-balancing`, social/party/clans with `roblox-social-systems`, world events with `roblox-dynamic-events`. They are integrated here into a coherent world.

## Use cases
- Open-world RPG with 5 zones by level.
- 4-player dungeon crawler with 3 bosses.
- Story RPG with chapters and decisions.
- MMO-lite with hubs, professions, and raids.
- Event RPG with season and soft reset.

## Game or system loop (design)
- 2-min loop: kill/explore → +XP/loot → visible number goes up.
- 20-min loop: complete zone quest, unlock fast-travel point, upgrade a piece.
- Session loop: dungeon/boss with weekly loot + story progress.
- Season loop: level cap, raid, exclusive mount/title.
Progression: XP `100 * 1.28^level`, time/level 12–20 min to 20, 30–45 min to 40; stats: each point +2% damage or +15 HP; class deltas: warrior +40% HP/−10% damage, mage +35% damage/−30% HP, rogue +20% crit; boss HP = expected_party_DPS × 120–180 s; if 80% play 1 class, buff the identity of the others, not just numbers.

## Step-by-step process
1. Define 3–5 classes with fantasy, resource (mana/fury), role (tank/heal/DPS), and 6–8 abilities (compose cooldowns with `roblox-abilities-cooldowns`).
2. Server-side derived stats: `damage = base × (1+ATK/100) × classMult`; show a simplified formula in UI.
3. Level-zoned world (1–10, 10–20...) with transitions, fast-travel points, and synced level (sidekick: −2/+2) to play with friends.
4. Zone quests: 3 main + 4 side per zone (compose structure with `roblox-quest-progression-systems`); marker + distance always.
5. Dungeons: daily/weekly lockout, required roles 1-1-2, checkpoints per boss (compose with `roblox-checkpoints`).
6. Bosses with 2–4 telegraphed mechanics (2 s AoE, adds, 50% phase); 5-min enrage to avoid endless fights.
7. Party: contribution loot + simple need/greed, revive with 3 s cast, shared XP within 60 m.
8. Onboarding: 10 min with a loaned class, free swap until level 10, then with cost.

## Technical knowledge
### What the server validates
- Damage/XP/loot computed on server; client never sends "level up".
- Abilities with cooldown/resource/state (compose ability validation).
- Zone/dungeon access by level/quest/key; server-only teleport.
- Need/greed: one vote per player, unique item, 30 s timeout.
### Persistence
- `DataStoreService`: level, XP, class, stats, inventory, quests, lockout cooldowns (`dungeonId→resetUnix`), fast-travel points.
- Save every 90 s + after boss/level-up; `UpdateAsync` if there is trading.
- Seasons: separate `season_3` snapshot; soft reset keeps cosmetics.
### Errors/disconnections
- Disconnect during boss: rejoin within 5 min returns to the boss door, not the start, if the group is still alive.
- Leader leaves: leadership passes to the next + loot stays distributable.
- Rollback: freeze trading 10 min and warn; never wipe progress without backup.
### Anti-exploit
- Elite anti-farm: lockout + diminishing returns after 5 kills/hour (−80%).
- Anti-teleport to final zone: validate level on every XP gain.
- Anti-oneshot: damage/attribute clamp (e.g. ATK ≤ 5000) with outlier logging.
- Bot detection: farming 3 h with no quest or social movement = review.

## Best practices
- Identity before numbers: each class must feel different in 5 min.
- Time to fun <10 min: combat, loot, and first completed quest.
- Show honest numbers (DPS, % crit) and test dummies per zone.
- Accessibility: rebindable keys, colorblind mode, telegraphs with shape + color.
- Performance: culling per zone, enemy pools (max 40 active), VFX LOD.

## Common mistakes
1. 12 classes with no identity → all the same; 3–5 polished is better.
2. "Kill 50" quest with no story → churn; mix with exploration and bosses.
3. Sponge boss with no mechanics → boring; 2 mechanics minimum + phases.
4. No level sync → friends cannot play together; sidekick required.
5. Ninja loot with no rules → toxicity; need/greed + visible log.

## Quality and done criteria
- [ ] New player completes tutorial and first quest in <15 min unaided.
- [ ] 4 classes at 15–35% pick-rate across 200 players.
- [ ] 4-player boss with an average group falls in 2–4 min with 1–3 learning wipes.
- [ ] XP exploit (teleport to final zone) grants 0 XP in 10 tests.
- [ ] Dungeon rejoin keeps lockout and allows resuming at boss.
- [ ] 20 players + 30 NPCs per zone ≥40 FPS on mid-range device.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `Players`, `Teams`, `Attributes`, `CollectionService`, `DataStoreService`, `OrderedDataStore`, `BadgeService`, `MarketplaceService`, `PathfindingService`, `ProximityPrompt`. Compose with `roblox-combat-systems`, `roblox-quest-progression-systems`, `roblox-social-systems`. Verify in create.roblox.com/docs.

## Limitations
- Does not replace combat/quest/economy design; it composes them.
- 20+ raids and massive PvP require additional architecture.
- Complex branching story is out of scope; linear arcs + side quests here.

```luau
-- Ilustrativo: XP y nivel en servidor.
local function xpParaNivel(nivel: number): number
	return math.floor(100 * (1.28 ^ (nivel - 1)))
end
local function debeSubir(xp: number, nivel: number): boolean
	return xp >= xpParaNivel(nivel)
end
```
