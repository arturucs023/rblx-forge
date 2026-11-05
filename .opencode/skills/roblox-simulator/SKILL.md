---
name: roblox-simulator
description: Click/area simulators with rebirths, pets+shiny, and inflation control. Use it when you need to design simulator progression, eggs, zones, and monetization.
---

# Simulators (Click / Area)

## Objective
Design a complete, profitable simulator: click→currency→upgrade→zone→rebirth loop, with pets, shinies, offline earnings, and inflation under control from day 1.

## Scope and limits
It is the deep genre version: loops, progression, mechanics, UX, performance, and its own pitfalls.
Declared differentiation: `roblox-genre-patterns` (installed, 52 lines) is a 1-line-per-genre catalog; this skill is the deep simulator version. `roblox-game-systems` is a lean recipe book; here it is composed at full-game scale. Does NOT repeat domains: detailed pets compose with `roblox-pets-systems`, economy/inflation with `roblox-economy-balancing`, quests/achievements with `roblox-quest-progression-systems`, social/trading with `roblox-social-systems`, combat if any with `roblox-combat-systems`. They are only integrated here.

## Use cases
- Coin clicker with tiered swords.
- Strength/speed simulator by areas.
- Pet simulator with 6 eggs and 4 zones.
- Mining simulator with rebirths and perks.
- Limited event simulator with leaderboard.

## Game or system loop (design)
- 30-s loop: click/zone → +currency with big numbers → buy visible upgrade.
- 10-min loop: unlock egg/zone, equip better pet, go ×2–×5.
- Session loop: rebirth (reset with permanent +5–15% multiplier) every 45–90 min.
- Social loop: leaderboard, trading, shiny showcase.
Numeric progression: upgrade cost `base * 1.35^level`; currency/zone `×6–×10` per zone; rebirth requires `10×` the top zone's currency; first rebirth at 60–90 min, tenth at 6–10 h. Inflation: if the top 1% exceeds ×50 the median at 7 days, apply catch-up (×3 boost for new players) and sink (limited aura).

## Step-by-step process
1. Define 4–6 zones with `currencyPerClick`, `entryCost`, `localEgg`, `multiplier`; lock by level or rebirths.
2. Define 3 power paths: tool (click), pets (multiplier, compose with `roblox-pets-systems`), rebirth (permanent).
3. Rebirth table: `cost`, `+10% mult`, `bonusCurrency`, `pets kept yes/no`; useful max 25–50 with perks every 5.
4. Eggs per zone with pity and shiny (compose odds with `roblox-pets-systems`); publish odds.
5. Offline earnings: `offlineMinutes × zoneRate × 25%`, 8 h cap, double claim (Ads/optional Robux).
6. Leaderboards: all-time total earned + rebirths; `OrderedDataStore` updated every 120 s, not per click.
7. Monetization: 2× currency 30 min, balanced auto-click (≤60% of active click), +1 equipped pet; never sell broken permanent power.
8. Anti-churn: daily rewards, pet index, weekly event with limited aura.

## Technical knowledge
### What the server validates
- Clicks: rate per tool (e.g. 12/s base sword, 20/s endgame); excess ignored.
- Currency: computed on server (`clickValue × petMult × rebirthMult × gamepass`); client never sends quantity.
- Purchases: funds, existing zone/egg, pet/rebirth limits.
- Teleport to zone: level/rebirths/payment validated before `PivotTo`.
### Persistence
- `DataStoreService`: currency, all-time total, upgrades, pets (compose), rebirths, offline `lastExitUnix`, index.
- Save every 60 s + on exit + after rebirth/mythic egg; `UpdateAsync` for currency if there is trading.
- Corruption: fallback to previous snapshot + log; never zero without backup.
### Errors/disconnections
- Duplication via double-click on purchase: idempotency with `purchaseId`.
- Rejoin to a zone locked by a balance change: move to max valid zone, not a broken spawn.
- DataStore rollback: warn and freeze trading 10 min.
### Anti-exploit
- Inhuman auto-clicker: >25 sustained clicks/s for 30 s = soft CAPTCHA (in-game verification) or throttle, not direct ban.
- Anti-teleport to final zone: validate requirements on every gain, not just on entry.
- Gain/hour logs per cohort to detect ×10 outliers.
- Pet trading with 5% tax and minimum level to slow alts (compose with `roblox-social-systems`).

## Best practices
- Readable big numbers (1.2M, 3.4B) + satisfying purchase sound.
- Every 5 min the player must see an unlock; if not, the curve is broken.
- Visually distinct zones with landmark; portals with clear requirements.
- Use `Attributes` for visible power/currency and `MemoryStoreService` for ephemeral counters.
- Performance: no physics per coin; effect pools and pet LOD.

## Common mistakes
1. Pets with no cap → ×500 and trivial zones; cap total ×8–×12.
2. Rebirth with no real bonus → nobody resets; +10% and visible reward.
3. 100% offline → progression without playing; 20–30% with cap.
4. Per-frame leaderboard → throttling; every 120 s + paged.
5. Selling unlimited permanent power → pay-to-win and churn; sell time/convenience.

## Quality and done criteria
- [ ] New player reaches zone 2 in 12–20 min unaided.
- [ ] First rebirth reachable in 60–90 min of active play.
- [ ] Top-1% vs. median ≤ ×50 at 7 days after launch.
- [ ] 30/s autoclicker gains no more than +40% over top active-click gain.
- [ ] Rejoin after 8 h grants correct offline (±5%) with cap.
- [ ] 40 players per server ≥45 FPS in a full zone.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `DataStoreService`, `OrderedDataStore`, `MemoryStoreService`, `MarketplaceService`, `BadgeService`. Compose with `roblox-pets-systems`, `roblox-economy-balancing`, `roblox-quest-progression-systems`. Verify in create.roblox.com/docs.

## Limitations
- Does not replace fine pets/economy/quest design; this skill integrates them, not repeats them.
- Exact balance requires playtest with cohorts; numbers here are a starting point.
- Cross-server trading and seasons require extension.

```luau
-- Ilustrativo: valor de click calculado en servidor.
local function valorClick(base: number, petMult: number, rebirthMult: number, paseMult: number): number
	local total = base * petMult * rebirthMult * paseMult
	return math.floor(math.min(total, 1e12))
end
```
