---
name: roblox-crafting
description: Recipes, stations, queues, and server-validated atomic crafting. Use it when you need forges, cooking, workbenches, or crafting with materials and timers.
---

# Crafting

## Objective
Implement robust crafting: discoverable recipes, stations with queues, atomic consume-and-deliver, and full protection against duplication.

## Scope and limits
Covers recipes, stations, queues, batch-craft, discoveries, and critical failures.
Stated differentiation: the installed `roblox-game-systems` is a fine-grained recipe book; this skill is the deep version with atomicity, concurrency, and stations. Does NOT cover gathering raw materials (covered by `roblox-resource-gathering`), nor pricing/inflation of crafted items (covered by `roblox-economy-balancing`), nor crafting quests (covered by `roblox-quest-progression-systems`). `roblox-genre-patterns` doesn't go deep into systems.

## Use cases
- Sword forge with tiers and quality crits.
- Cooking with recipes that grant temporary buffs.
- Tycoon workbench that produces in a partial offline queue.
- Enchanting with failure risk and protection.
- Mobile crafting with single-use portable stations.

## Game or system loop (design)
1. Discover recipe (loot, quest, experimentation).
2. Gather materials and go to the right station.
3. Queue crafting (real-time or instant with cost).
4. Wait/claim (decision: speed up with Robux/currency).
5. Use/sell/equip result.
Balance example: tier 2 recipe = 8 iron + 4 wood, 60 s, 100% success, 12% epic quality; speed-up cost = 1.5× vendor value/60 s; target sink 20% of materials/day; if average backlog exceeds 5 items per player, raise times or stations.

## Step-by-step process
1. Define `RecipeDefs` in a `ModuleScript`: `id`, `station`, `materials {id=count}`, `timeS`, `result`, `critRate`, `requiredLevel`, `discoveredByDefault`.
2. Stations as `Model` with `CraftStation` Tag and `Attributes` (`StationType`, `QueueMax`, `OccupiedBy`).
3. Client sends `RemoteFunction CraftRequest(recipeId, stationId)`; never sends materials or result.
4. Server runs an atomic transaction: lock inventory → verify materials + level + free station → deduct → queue → schedule completion.
5. Queue per station (e.g. max 3, FIFO) with server timestamps; supports `ClaimResult` separate from `StartCraft`.
6. Result with server RNG: normal/epic/legendary; delivered to server inventory and notified.
7. Discovery: combine "experimentation" with validation (the server checks the combination, not the client).
8. UI: filterable list, craftable button with reason when not, progress bar per queue, ready notification.

## Technical knowledge
### What the server validates
- Recipe exists and is discovered for that player.
- Enough materials in the server inventory and correct station within ≤12 studs.
- Required level/tool and queue with free slot.
- `Claim` only if `os.clock() >= endsAt` and claimant = queue owner.
### Persistence
- Save inventory, discovered recipes, and active queues (`recipeId`, `endsAtUnix`, `stationId`) with `DataStoreService`.
- On load, recalculate queues: if `endsAt` already passed while offline, deliver to "mailbox" with limit 10; rest is marked ready to claim.
- Transactions with `UpdateAsync` for inventory when there is parallel trading (verify at create.roblox.com/docs).
### Errors/disconnections
- Mid-craft disconnect: already-deducted materials are not refunded; result stays claimable for 7 days.
- Server shutdown: `BindToClose` persists queues; when a new instance reopens it recalculates without duplicating.
- Double-click: idempotency with `jobId` per request; second `Claim` of the same job returns already-delivered.
### Anti-exploit
- Never accept `resultId` from the client; recalculate from the recipe.
- Rate-limit `CraftRequest` 5/s; more = ignore.
- Validate the station wasn't moved by an exploiter: compare position with template ±4 studs.
- Anti-dupe: lock player inventory during the transaction (simple per-`UserId` mutex).

## Best practices
- Separate `CraftDefs` (data) from `CraftServer` (logic) and `CraftUI` (view).
- Short times (<60 s) free, long ones speedable; never mandatory pay-to-craft.
- Show exact crit probability; avoid a "rigged" feeling.
- Allow queueing from mobile with ≥48 px buttons and confirmation for expensive materials.
- Log epic crafts for economy and abuse detection.

## Common mistakes
1. Deducting and delivering in two separate remotes → dupe via double claim; unify into a transaction.
2. Timer with `wait(workTime)` per job → drift and leaks; use timestamps and a scheduler.
3. Global station with no owner → two players claim the same; assign owner + 120 s timeout.
4. Secret recipe validated on the client → leaked via exploit; validate the combination on the server.
5. Not versioning recipes → balance change breaks inventories; version `recipes_v2` and migrate.

## Quality and done criteria
- [ ] 50 concurrent crafts on one station without duplicating or losing materials.
- [ ] Double `Claim` of the same job delivers 1 result only.
- [ ] Disconnect mid-queue keeps deducted materials and result claimable.
- [ ] Measured epic rate 10–14% over 500 samples for a nominal 12% recipe.
- [ ] UI shows the exact reason when crafting is blocked in 6 tested cases.
- [ ] Corrupt DataStore load falls back to empty inventory + log, without breaking the session.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `DataStoreService`, `Players`, `CollectionService`, `Attributes`, `ProximityPrompt`, `MarketplaceService` (only if Robux speed-up). Verify members at create.roblox.com/docs if in doubt.

## Limitations
- Does not design the global economy or sinks; compose with `roblox-economy-balancing`.
- Does not generate crafting quests; compose with `roblox-quest-progression-systems`.
- Does not cover player-to-player trading; compose with `roblox-social-systems`.

```luau
-- Ilustrativo: consumo atómico simplificado.
local function tieneMateriales(inv, receta): boolean
	for id, cant in pairs(receta.materiales) do
		if (inv[id] or 0) < cant then return false end
	end
	return true
end
-- Uso real: bloquear por UserId, verificar, descontar y encolar sin yields intermedios.
```
