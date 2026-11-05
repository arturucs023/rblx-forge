---
name: Roblox Pet UI
description: Pet collection, equip, hatch, fusion, and showcase. Use it when you need pet inventory, eggs with reveal, shiny fusion, or visible boosts.
---

# roblox-pets-ui

## Objective
Make the pet collection legible and exciting: view, obtain, equip,
and upgrade pets with rarity feedback at every step.

## Scope and limits
Covers pet UI (collection, hatch, fusion, equipped, boosts). Does NOT cover
the pet economy or rolls (that is `roblox-pets-systems`, server).
Does NOT cover pet models/VFX (`roblox-props-creation`,
`roblox-animation-audio-feedback`).

## Use cases
- Egg with reveal animation and rarity tiers.
- Pet inventory with equip/unequip and summed boosts.
- Fusion machine (3 identical → shiny) with result preview.
- Collection showcase/index with % completion.

## Step-by-step process
1. Replicate server pet state (list + equipped + pity) to a
   read-only client module; the UI never decides rolls.
2. Collection: grid by rarity (common→legendary with frame and color), xN
   counter, filter by equipped, search if >30.
3. Hatch: big button, staged reveal animation (shake → flash → reveal),
   purchasable skip; the result is dictated by the server.
4. Fusion: validated input slots (same species+rarity), preview of the
   result with visible odds, confirmation.
5. Equipped: slots 1–N with drag or tap-to-equip, total boost summed and visible
   in the HUD (`roblox-hud` for the boost chip).
6. Progression: pity bar, index %, next unlock visible.

## Technical knowledge
- Inventory replication via `Attributes`/value folder + remotes;
  reveals synchronized by server timestamp.
- Rarity tiers with consistent colors across the game.

## Best practices
- Odds always visible before paying (`roblox-policy-compliance` requirement).
- Skippable reveal; never lock the game in an animation.
- Sound + flash proportional to rarity (measured juice, see feedback skills).

## Common mistakes
1. UI showing a pet before the server confirms it (visual dupe).
2. Hidden or misleading odds → ban/bad review.
3. Fusion with no confirmation while equipped pets are inside.
4. Unpaginated grid with 200+ pets (layout lag).

## Quality and done criteria
- [ ] Hatch→reveal→collection works with the server as the single truth.
- [ ] Odds and pity visible and correct against the server config.
- [ ] Fusion blocks equipped pets without explicit double confirmation.
- [ ] 200-pet grid opens in <1 s on a mid mobile.

## Tools
MCP: playtest with real input on hatch and fusion; `get_runtime_logs` for
replication errors.

## Limitations
- Does not design the drop economy (that is `roblox-pets-systems`); this skill
  only presents it honestly.
