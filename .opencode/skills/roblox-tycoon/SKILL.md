---
name: roblox-tycoon
description: Tycoons with droppers, conveyors, rebirths, and saved plots. Use it when you need to design production, upgrades, optional PvP, and base saving.
---

# Tycoons (Droppers, Conveyors, Plots)

## Objective
Design a complete tycoon: buy droppers, watch production flow, expand the plot, prestige, and save everything without breakage or lag.

## Scope and limits
Deep genre version with loops, progression, mechanics, UX, performance, and pitfalls.
Declared differentiation: `roblox-genre-patterns` is a 1-line catalog; this skill is the deep tycoon version. `roblox-game-systems` is a thin recipe book; here it is composed at scale. Does NOT repeat: fine construction/placement composes with `roblox-building-placement`, economy with `roblox-economy-balancing`, quests/tutorial with `roblox-quest-progression-systems`, validated robbery/PvP with `roblox-combat-systems`, and social with `roblox-social-systems`.

## Use cases
- Classic factory tycoon with conveyors.
- Restaurant tycoon with tables and cooks.
- Military tycoon with walls and optional PvP.
- Cooperative team tycoon.
- Event tycoon with 10 plots and a finale.

## Game or system loop (design)
- 60s loop: buy dropper/upgrader → watch +$/s rise → buy next button.
- Session loop: complete floor/zone, unlock conveyor 2, buy defenses.
- Long loop: rebirth (everything resets, +15% production, exclusive skin) every 3–6h.
Production: T1 dropper 1 cube/2s × $5, T2 1/s × $12, upgrader ×2–×3 in series (cap ×20); target income $2k/min at 20 min, $50k/min at 2h; rebirth requires $1M + 15 droppers; if time-to-next-purchase exceeds 8 min without useful AFK, cheapen by 20%.

## Step-by-step process
1. Model a fixed plot with numbered slots and purchasable buttons (`ProximityPrompt` or touch pad).
2. Droppers spawn cubes on the server at a fixed rate; upgraders multiply `Attributes` value; collector grants on touch contact.
3. Purchase via `RemoteFunction BuyButton(plotId, buttonId)`: validates owner, funds, prerequisite, and order.
4. Phase unlocks: phase 1 visible, phase 2 after buying X, optional PvP walls with toggle.
5. Rebirth: validates requirements, resets plot to template, grants token + mult, saves in a separate slot.
6. Friends: build/collect permission with 3 roles (visitor/helper/co-owner) and a log.
7. Guided 5-purchase tutorial (arrow + highlight) before free mode.
8. Cleanup: cubes with 20s lifetime, fixed pool (e.g. 60 cubes/plot), no complex collision.

## Technical knowledge
### What the server validates
- Plot owner/permission and button existing and not yet bought.
- Sufficient funds; price from the server catalog.
- Rebirth with exact requirements; 60s anti-double cooldown.
- Money collection only by owner/allowed role inside the collector zone.
### Persistence
- Save `purchasedButtons[]`, money, rebirths, skin with `DataStoreService` (`tycoon_v2`); never save loose cubes.
- Loading rebuilds in batches (10 buttons/frame) to avoid a 150-part freeze.
- Autosave every 120s + `BindToClose`; layout migration with an `oldId→newId` map.
### Errors/disconnections
- Purchase in flight when leaving: if charged, the button stays bought on rejoin.
- Corrupt plot: load valid buttons, refund 50% of invalid ones + notice.
- Double-click duplication: idempotency with `buttonId` + per-plot mutex.
### Anti-exploit
- Cube value server-side only; touching a cube never grants money from the client.
- Anti-teleport to someone else's collector: validate owner before granting.
- Rate-limit purchases 6/s; robbery of cash box with validated hold if PvP.
- Detect $/min ×5 over curve and freeze payouts for review.

## Best practices
- Buttons with price, effect (+$/s), and prerequisite visible; no surprises.
- Short, straight conveyors; avoid curves that jam cubes.
- Purchase sound + visible $/s jump; every purchase should feel good.
- Identical plots in size/shape for fairness; free-form decoration aside.
- PvP opt-in via toggle, never by default in a chill tycoon.

## Common mistakes
1. Cubes with client-side `Touched` granting → infinite money; grant on server only.
2. 200 cubes with physics → lag; pool + `CanCollide=false` + short lifetime.
3. Saving every purchase → throttling; batch every 120s + key events.
4. Rebirth without warning → rage; confirmation with what is lost and gained.
5. Free plots without limits → griefing; 1 plot/player + 20-min AFK timeout.

## Quality and done criteria
- [ ] Full plot (40 buttons) loads in <3.5s on a mid-range device.
- [ ] Double-purchasing the same button charges once.
- [ ] Measured $/min matches design ±10% at 3 points (20 min, 1h, 2h).
- [ ] Someone else's collector exploit yields $0 in 10 attempts.
- [ ] Rebirth resets and grants exact mult with audit.
- [ ] 12 active plots keep ≥45 FPS.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `CollectionService`, `ProximityPrompt`, `DataStoreService`, `Teams` (team tycoon). Compose with `roblox-building-placement` and `roblox-economy-balancing`. Verify at create.roblox.com/docs.

## Limitations
- Does not cover complex physical conveyors with realistic jams in detail.
- Does not balance cross-tycoon economy; compose with economy.
- Free-form base editor is out of scope; plots with slots here.

```luau
-- Ilustrativo: compra idempotente de botón.
local comprados = {}
local function comprar(plotId: string, buttonId: string, precio: number, fondos: number)
	if comprados[plotId .. "/" .. buttonId] then return false, "ya comprado" end
	if fondos < precio then return false, "sin fondos" end
	comprados[plotId .. "/" .. buttonId] = true
	return true, "ok"
end
```
