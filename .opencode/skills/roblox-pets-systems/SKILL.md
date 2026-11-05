---
name: roblox-pets-systems
description: Pets with hatch, equip, fusion, and pet economy. Use it when you need eggs, shinies, pet inventory, and balanced boosts.
---

# Pet Systems (Pets)

## Objective
Create a profitable fair pet system: hatch with transparent odds, equipping with controlled stacked boosts, golden/rainbow fusion/evolution, and social showcase without abusive pay-to-win.

## Scope and limits
Covers eggs, rarities, equip/unequip, golden/rainbow fusion, boosts, and basic trading.
Declared differentiation: `roblox-game-systems` (installed) is a fine recipe book; this skill is the deep version with pity, duplicates, and pet economy. It does NOT cover pets as NPCs with advanced combat AI (compose with `roblox-combat-systems` and `roblox-npcs` if applicable), nor global prices/inflation (covered by `roblox-economy-balancing`), nor collection quests (covered by `roblox-quest-progression-systems`). Deep social trading is covered by `roblox-social-systems`. `roblox-genre-patterns` does not detail pets.

## Use cases
- Purchasable eggs with 5 rarities + shiny.
- Equip 3–8 pets with capped multiplicative boost.
- Fusion: 5 identical → golden; 5 golden → rainbow.
- Limited-event pets with controlled trading.
- Plot showcase + visitable pedestal.

## Game or system loop (design)
1. Farm currency → buy/open egg (anticipation with reveal).
2. Evaluate (common → equip, duplicate → fuse/delete).
3. Equip the best and raise farming power.
4. Chase shiny/legendary and complete the index.
5. Show off/trade (social retention).
Example balance: common 60%, rare 25%, epic 10%, legendary 4%, mythic 1%; shiny 1/64 on base; legendary pity every 80 pulls with no legendary; per-pet boost 5–25%, total equipped capped at ×8; golden fusion = ×2.2 of base; income with a full team must not exceed ×4 of the pet-less player or progression breaks.

## Step-by-step process
1. Define `PetDefs`: `id`, rarity, `prob`, `boostTipo`, `boostValor`, `shinyMult`, `fusiónEn`.
2. Implement pity table per player and banner (`sinLegendario`, `aperturasTotales`); RNG on the server.
3. `RemoteFunction HatchRequest(huevoId, cantidad)` with max batch 10; server charges, rolls, delivers, and updates pity.
4. Server inventory: `pets[{uid, defId, shiny, dorada, bloqueada}]`; equipped as a `uid` list with a pass/level cap.
5. Fusion via `RemoteFunction FuseRequest(uids[])`: validates same `defId`+tier, 5 units, no locked equipped pets; destroys 5 and creates 1 superior.
6. Boosts computed on the server when farming (never sum on the client); replicate total with `Attributes` (`PetPower`).
7. Visuals: pets follow with simple `AlignPosition` or anchored to slots; limit to 3 active visuals on mobile for performance.
8. Persistent collection index + set-completion rewards.

## Technical knowledge
### What the server validates
- Sufficient currency and existing egg; quantity 1–10.
- Odds applied on the server; client only requests the pull.
- Equipped pets belong to the player, not duplicated, within the limit.
- Fusion with 5 real `uid`s, same type, not already fused in a concurrent request (mutex).
### Persistence
- Save pet inventory, equipped, pity, and index with `DataStoreService` (`pets_v2`).
- `uid`s are server GUIDs; on load revalidate `defId` against the catalog (if a pet was removed from the game, convert to currency).
- 200-pet limit; overflow goes to a paged "vault" or auto-converts common duplicates to currency with confirmation.
### Errors/disconnections
- Mid-hatch disconnect: if charged, the roll is already saved; on rejoin it appears in inventory + pending notification.
- Double `HatchRequest` from lag: idempotency with a client `requestId`; duplicates return the same result.
- Half-done trade: use two-step trading with confirmation; if one side drops, roll back.
### Anti-exploit
- Never accept an obtained pet's `defId` from the client; the server generates the result.
- Rate-limit hatch 3/s; fusion 2/s; equip 10/s.
- Detect impossible inventories (e.g. 10 mythics in 20 pulls, p < 1e-9) and flag for review with no auto-ban.
- Trading: validate both parties, 10 s cooldown between trades, log high-rarity trades.

## Best practices
- Publish in-game odds (required by policy on Robux-paid loot; check create.roblox.com/docs).
- Reveal with skip; batch-open with summary, not 10 animations in a row.
- Duplicates always useful (fusion/currency/index); never "useless trash".
- Visible power cap to avoid silent power creep.
- Limited events with end notice and no permanently broken advantage.

## Common mistakes
1. Rolling on the client → infinite mythic pets; move to the server.
2. Boost summed on the client to display damage → fake damage; compute on the server.
3. No pity → rage and churn on bad streaks; pity 60–100 depending on top rarity.
4. Followers with physics per pet → lag with 8 pets × 20 players; use cheap interpolated CFrame.
5. No inventory limit → DataStore overflow; cap + vault.

## Quality and done criteria
- [ ] 1000 simulated pulls converge within ±1.5 pp of nominal odds.
- [ ] Pity grants a legendary on pull ≤80 after a drought in 3/3 tests.
- [ ] Concurrent double fusion does not duplicate the result (mutex verified).
- [ ] Total power with full mythics ≤ ×8 cap and farm/hour ≤ ×4 of base.
- [ ] Rejoin after hatch keeps pets and pity without double charging.
- [ ] 20 players with 3 visuals each at ≥45 FPS on a mid device.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `DataStoreService`, `MarketplaceService` (Robux eggs), `MemoryStoreService` (collection rankings if applicable). Check create.roblox.com/docs.

## Limitations
- Does not implement pet combat AI; compose with `roblox-combat-systems`.
- Does not design global economy or sinks; compose with `roblox-economy-balancing`.
- Advanced trading with tax/anti-fraud requires `roblox-social-systems`.

```luau
-- Ilustrativo: roll de rareza en servidor.
local Tabla = { {id="comun", p=60}, {id="raro", p=25}, {id="epico", p=10}, {id="legend", p=4}, {id="mitico", p=1} }
local function rolear(rng: Random): string
	local r = rng:NextNumber(0, 100)
	local acc = 0
	for _, e in Tabla do acc += e.p if r <= acc then return e.id end end
	return "comun"
end
```
