---
name: roblox-resource-gathering
description: Harvestable nodes with respawn, tools, and proximity validation. Use it when you need mines, trees, fishing, or loot with anti-farmer and anti-teleport.
---

# Resource Gathering

## Objective
Create a fair, scalable gathering system: visible nodes, tools with tiers, controlled respawn, and a server that validates proximity, quantity, and pace.

## Scope and limits
Covers static and rotating nodes, tools, yields, respawn, and raw-material inventory.
Declared differentiation: `roblox-game-systems` (installed) is a lean recipe with a currency example; this skill is the deep version with node economy, respawn, and anti-teleport validation. Does NOT cover turning materials into items (covered by `roblox-crafting`), shop prices or inflation (covered by `roblox-economy-balancing`), or "collect X" quests (covered by `roblox-quest-progression-systems`). `roblox-genre-patterns` only lists genres without depth.

## Use cases
- Iron/crystal veins with pickaxe tiers.
- Choppable trees with stumps and regrowth.
- Zone fishing with time-of-game rarity.
- Per-player instanced vs. server-shared herbs.
- Energy/gas on a PvP map with risk-reward.

## Game or system loop (design)
1. Explore and locate a node (visual/audio signal).
2. Approach and use a tool (hold or hits with `ProximityPrompt`/`ClickDetector`).
3. Server validation and yield delivery with variance.
4. Node depletes → depleted state → timed respawn.
5. Transport/sell/use material (compose with economy or crafting).
Balance example: common node 3–5 hits, yield 2–4 units, respawn 60–90 s; rare node 8 hits, yield 1 + 15% bonus, respawn 5 min, max 4 active; target income 120–180 units/hour/active player; if a player exceeds 300 units/h, investigate exploit or broken route.

## Step-by-step process
1. Classify nodes: common/rare/epic; define `hitsToDeplete`, `baseYield`, `variance`, `respawnS`, `maxActive`, shared vs. personal.
2. Place nodes with `CollectionService` tag `GatherNode` and `Attributes` (`NodeId`, `Tier`, `HitsRemaining`).
3. Define tools in a `ModuleScript GatherDefs`: tier, node damage multiplier, range, hit CD (e.g. 0.8 s).
4. Interaction: `ProximityPrompt` with `HoldDuration` per tier (common 0.4 s, rare 1.2 s) or tool firing `RemoteEvent GatherHit(NodeId)`.
5. Server validates: node exists, not depleted, distance ≤ 12 studs + tolerance, CD between hits, actually equipped tool.
6. Apply damage to node on server, deliver yield to server-side inventory, replicate depletion to everyone.
7. Schedule respawn with a central queue (not one `while` per node): priority by scarcity and distance to players.
8. Add anti-camping: if a player hits the same respawn >6 cycles in a row, reduce yield 25% temporarily (diminishing returns).

## Technical knowledge
### What the server validates
- Player–node distance with the server-side `HumanoidRootPart` position; reject >14 studs.
- Pace: `os.clock()` between hits ≥ tool CD − 0.05 s tolerance.
- Integrity: `NodeId` exists, not depleted, tool owned (server table, not client `Backpack`).
- Quantity: yield computed on server with server RNG; client never sends quantity.
### Persistence
- Save material inventory and tool level with `DataStoreService`; never save shared-node state.
- Personal (instanced) nodes may save seed and `respawnAt`; on rejoin recalculate depleted/available.
- Save every 60 s and on `BindToClose`; pcall + retry with backoff.
### Errors/disconnections
- Hit in flight as it depletes: "node depleted" returned with no durability cost.
- Mid-hold disconnection: cancels `ProximityPrompt` with no partial yield unless an explicit rule says so (e.g. fishing delivers above 80%).
- Duplication via double prompt: server marks node `claimedBy` with timestamp; second attempt loses.
### Anti-exploit
- Anti-teleport: if the player covers >60 studs between two valid hits in <1 s, ignore and flag a strike.
- Anti-noclip into rich zone: validate region and required level on server before granting high rarity.
- Rate-limit `GatherHit`: 6/s max; 0.05 s autoclickers get blocked by CD.
- Logs of yields/hour per player to detect outliers.

## Best practices
- Shared nodes for socializing, personal ones for frustration-free onboarding; 70/30 mix.
- Feedback: shake + floating number + per-tier sound; rare node with beacon visible at 80 m.
- Use `Attributes` for `HitsRemaining` and replicate cheaply without per-tick `RemoteEvent`.
- Tools with durability only if repair is accessible; otherwise avoid frustration.
- Daily hotspot rotation to break permanent optimal routes.

## Common mistakes
1. Client-decided yield → infinite duplication; move RNG to server.
2. One thread per node with `wait()` → 500 hanging threads; use a central scheduler.
3. `ClickDetector` without `MaxActivationDistance` → gathering across the map; set 12–14.
4. Fixed predictable respawn → camping; add ±30% jitter and per-zone caps.
5. Saving each node's `HitsRemaining` to DataStore → throttling; do not persist shared nodes.

## Quality and done criteria
- [ ] 200 legitimate hits with variable ping without false rejections >2%.
- [ ] Teleport between nodes (simulated exploit) delivers 0 units and raises an alert.
- [ ] Measured income 120–180 units/h on optimal common route; rare ≤12 units/h.
- [ ] 100 active nodes under 2 ms server cost per scheduler tick.
- [ ] Rejoin keeps inventory and tool; nodes recalculate without duplicating.
- [ ] Diminishing returns triggers after 6 cycles and shows in UI.

## Tools
Services/classes: `RemoteEvent`, `Players`, `CollectionService`, `Attributes`, `ProximityPrompt`, `ClickDetector`, `DataStoreService`, `TweenService` (feedback). If unsure about a member, verify in create.roblox.com/docs.

## Limitations
- Does not balance shops or inflation; compose with `roblox-economy-balancing`.
- Does not generate recipes or stations; compose with `roblox-crafting`.
- Does not cover gathering-NPC pathfinding; that is `roblox-npcs` (verify in create.roblox.com/docs).

```luau
-- Ilustrativo: validación de golpe en servidor.
local ULTIMO_GOLPE = {}
local CD = 0.8
local function golpeValido(player, nodoPos: Vector3, rootPos: Vector3): boolean
	local ahora = os.clock()
	if ahora - (ULTIMO_GOLPE[player.UserId] or 0) < CD - 0.05 then return false end
	if (nodoPos - rootPos).Magnitude > 14 then return false end
	ULTIMO_GOLPE[player.UserId] = ahora
	return true
end
```
