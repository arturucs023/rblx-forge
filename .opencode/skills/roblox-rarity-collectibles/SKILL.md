---
name: roblox-rarity-collectibles
description: Rarity tiers, transparent odds, pity, and duplicates for collectibles. Use it when designing policy-compliant gacha, packs, drops, or showcases.
---

# Rarity and Collectibles

## Objective
Design profitable, policy-compliant rarity and collection systems: readable tiers, transparent odds, verifiable pity, duplicate handling, and social showcase, with no opaque loot or abusive pressure.

## Scope and limits
Differentiation: `roblox-core` and `roblox-datastores` cover inventory persistence; this skill covers rarity engineering (odds, pity, duplicates, showcase). `luau-core`/`luau-types` cover base implementation; design + compliance is covered here.

What it does NOT do:

- It does NOT implement shops or pricing (that is general economy, outside this skill).
- It does NOT persist inventory for you; it defines what to save and defers how to `roblox-datastores`.
- It does NOT give legal advice; when in doubt about policy, block the design and verify.

## Use cases
1. Packs/crates with Common→Legendary tiers and public odds.
2. Enemy drops with pity for bad streaks.
3. Duplicate system → redeemable dust/fragments.
4. Completable album/collection with showcase.
5. Temporary events with exclusive items and clear communication.

## Step-by-step process
1. Define tiers (max. 5-6) with name, color, weight, and real utility. If a tier changes neither gameplay nor collection, merge it.
2. Publish odds in-game before purchase/opening (percentage per tier, not just "rare"). No launch without visible odds.
3. Implement explicit pity: after N openings without tier X, guarantee it. Document N and reset on hit. Test the limit.
4. Design duplicates from day 1: conversion (3 commons → 1 rare, dust → shop) with a public table. No useless duplicates.
5. Separate paid from earned where policy requires; record source per item for audit.
6. Build showcase: album, display case, inspecting others' collections. Collection is social, not just inventory.
7. Add protections: confirmation on paid openings, per-session limits, visible opening history.
8. Validate compliance: review current loot/random-payment policies (note `(verify in create.roblox.com/docs)` and platform policies) and record the review with a date.
9. Test distribution: 10k-opening simulation compares observed vs. theoretical per tier; pity fires at the exact N.

## Technical knowledge
- Loot table as data (`ModuleScript` config): `{ Tier, Weight, Items[] }`. The roll code only reads the table; designers tune without touching logic.
- Weight-accumulated roll with centralized RNG; fixed seed in tests for reproducibility.
- Pity as a per-player, per-pool counter (`openingsWithoutX`). It persists with inventory (see `roblox-error-handling`); if pity is lost, trust is lost.
- Duplicates: when an already-owned item is obtained, apply automatic conversion + visible log ("Duplicate → +50 dust").
- `Attributes` to show rarity in the world (`Rarity`, `Tier`) without coupling UI to hierarchies.
- `OrderedDataStore` for collection rankings if there are leaderboards; `DataStoreService` for inventory + pity (with `pcall` + retry, see `roblox-error-handling`).
- Transparency: displayed odds must be the code's odds. Generate the UI from the same config table, not from duplicated text.

Illustrative example (loot table + roll):

```luau
-- ModuleScript: LootConfig (ilustrativo)
local LootConfig = {
	Tiers = {
		{ Id = "Common", Weight = 70 },
		{ Id = "Rare", Weight = 22 },
		{ Id = "Epic", Weight = 7 },
		{ Id = "Legendary", Weight = 1 },
	},
	PityAt = 50, -- garantía de Epic+ cada 50
}

function LootConfig.roll(rng: Random): string
	local total = 0
	for _, t in LootConfig.Tiers do total += t.Weight end
	local r = rng:NextNumber(0, total)
	local acc = 0
	for _, t in LootConfig.Tiers do
		acc += t.Weight
		if r <= acc then return t.Id end
	end
	return "Common"
end

return LootConfig
```

Illustrative example (pity):

```luau
-- Ilustrativo: contador por jugador
local function applyPity(playerState, rolled: string): string
	playerState.sinceEpic += 1
	if playerState.sinceEpic >= 50 and (rolled == "Common" or rolled == "Rare") then
		playerState.sinceEpic = 0
		return "Epic" -- garantía mínima documentada
	end
	if rolled == "Epic" or rolled == "Legendary" then
		playerState.sinceEpic = 0
	end
	return rolled
end
```

## Best practices
- Fewer, clearer tiers. 4 readable tiers > 8 confusing ones.
- Odds with 1 decimal, visible before payment. No "increased chance" without numbers.
- Pity documented in-game, not just in an internal doc.
- Every paid-random item has an earnable alternative or duplicate redemption.
- Player-visible opening history.

## Common mistakes
1. UI-text odds different from code odds: fraud even if accidental. Generate UI from the same config.
2. Pity that resets wrongly (or does not persist): the unlucky player never gets the guarantee. Test counter persistence.
3. Worthless duplicate: the player pays for nothing. Public conversion since launch.
4. New tier that invalidates a previous collection without warning: burns trust. Communicate and compensate.
5. Correlated-seed RNG per opening (same seed per frame): artificial streaks. Centralize RNG.
6. "Exclusive" event that returns without warning: feels like deception. Define and communicate whether it is exclusive or rotating.
7. No limits or confirmations on paid openings: accidental purchases and refunds. Confirm + limit per session.

## Quality and done criteria
- [ ] Single loot table feeding code and UI (zero odds duplication).
- [ ] Odds visible pre-opening and pity documented with exact N.
- [ ] 10k-opening simulation: per-tier deviation within the defined margin + verified pity.
- [ ] Duplicates with public conversion and player-visible log.
- [ ] Dated compliance review with links to verified policies.
- [ ] Inventory + pity persist and survive rejoin (implementation deferred to `roblox-datastores`).

## Tools
- Config `ModuleScript` + `require` as the single source of odds.
- `DataStoreService` / `OrderedDataStore` for inventory, pity, and rankings.
- `Attributes` for world-visible rarity.
- `TestService` + TestEZ for distribution simulation (see `roblox-testez`).

## Limitations
- Not a substitute for legal or policy review; when the platform changes, re-verify.
- Does not design pricing economy or general monetization.
- If unsure about payment limits or required disclosure, note `(verify in create.roblox.com/docs)` and block launch.
