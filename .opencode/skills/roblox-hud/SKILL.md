---
name: Roblox In-Game HUD
description: In-game HUD for health, resources, objectives, and contextual elements. Use it when building the live interface, health bars, objectives, minimap, or information prioritization without covering the game.
---

# In-Game Roblox HUD

## Objective

Show only the information needed to play well, in the right place and without covering the action. A good HUD reads at a glance, prioritizes (survival > resources > objectives > decoration), and hides or fades when it adds nothing.

## Scope and limits

Covers: health/lives, resources (currency, energy, ammo), objectives and tracking, contextual elements (minimap/zone HUD, nearby prompts), information priority, and non-occlusion rules.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Detailed inventory and equipment: covered by `roblox-inventory-ui`.
- Full quest journal: covered by `roblox-quest-journal-ui`; here only micro-tracking.
- Global notifications and toasts: covered by `roblox-notifications-ui`.
- Driving or pet HUDs: covered by `roblox-vehicle-ui` and `roblox-pets-ui`.

## Use cases

- Health bar + shield with highlighted recent damage.
- Coin/energy counter that flashes on change.
- Current objective "Capture zone B · 0:42" always visible.
- Circular minimap in a corner with points of interest.
- Contextual prompt "Hold E to open" that only appears near the object.

## Step-by-step process

1. **Prioritize the information.** List everything you want to show and order it: 1) survival, 2) critical resource, 3) objective, 4) rest. Anything that does not fit in 4 blocks goes to sub-screens, not the HUD.
2. **Zone the screen.** Health bottom-left or bottom-center, resources top-right or next to health, objective compact top-center, minimap top-right (or top-left on mobile if the thumb covers it). Keep the center for the game.
3. **Build the base.** `ScreenGui` in `PlayerGui` → corner-anchored `Frame`s with `Scale`: `HealthBar` (background `Frame` + fill `Frame`), `ResourceRow` (`TextLabel` + `ImageLabel` icon), `ObjectiveChip` (1-line `TextLabel`), minimap as a circular `Frame` with `UICorner` 1,0.
4. **Implement readable bars.** `Scale` fill by value, threshold color change (green >50%, amber 25-50%, red <25%), short `TweenService` animation on damage/heal. Small optional number next to it.
5. **Add the persistent objective.** A 1-2 line chip maximum with verb + destination + time/distance. On completion, 1 s check animation and replacement with the next one. Detail lives in the journal (`roblox-quest-journal-ui`).
6. **Contextualize.** `ProximityPrompt` prompts and zone warnings appear/disappear by distance or state; never fixed. Use 0.2 s fades, not abrupt pops.
7. **Restrained minimap (if it adds value).** Only if the game is spatial: circular frame, documented north or fixed rotation, points with max 3 shapes/colors + minimal legend. If the map is linear, replace it with a compass or objective arrow.
8. **Adapt to mobile.** 20-30% larger elements, anchors that avoid thumbs (bottom corners free for joystick/buttons), `UISizeConstraint` minimums. The HUD must never cover touch buttons (see `roblox-mobile-touch-ui`).
9. **Test in real action.** Play 5 minutes per platform: can you read health without staring? Is the objective clear? Does anything cover enemies or traps? Adjust opacity and scale until the answer is yes.

## Technical knowledge

- Bar pattern (stable classes):

  ```luau
  -- Ejemplo ilustrativo: actualizar barra de salud
  local bar = script.Parent:WaitForChild("HealthFill") :: Frame

  local function setHealth(current: number, max: number)
    local t = math.clamp(current / math.max(1, max), 0, 1)
    bar.Size = UDim2.fromScale(t, 1)
    -- El color por umbral y el tween se aplican aquí.
  end
  ```

- Everything positioned with `UDim2.fromScale` + `AnchorPoint`; `UIAspectRatioConstraint` for the circular minimap; `UITextSizeConstraint` so numbers don't break.
- Updates: the UI paints values handed by the game; it never computes damage or economy. Moderate frequency (events, not every frame except tweened bars).
- `TweenService` for damage (brief red flash), healing (smooth rise), and resource changes (pulse). Durations 0.15-0.3 s.
- `ProximityPrompt` for nearby interaction: configure its text and distance on the 3D object; the HUD only reflects state, never replaces it.
- `StarterGui`/`PlayerGui`: the HUD lives in `PlayerGui` with `ResetOnSpawn` per the project's respawn setup; after death it must rebuild without duplicating.

### Visual identity of this skill (original, do not copy)

- "Light tactical" direction: no heavy panels; translucent pills (#0E1420 at 35-55%) with pure white text and health green accent (#3DDC84) / damage red (#FF5A5A) / amber resource (#FFC53D).
- Typography: numbers 18-22 semibold monospaced or tabular where available; labels 12-13 uppercase with wide tracking. Nothing decorative.
- Composition: occupied corners, free center; health as a 220-280 px-equivalent horizontal bar; objective as a centered 1-line chip; minimap 140-180 circular with thin `UIStroke`.
- Spacing: 3-4% safe margin from edges, `UIPadding` 8-10 in chips, `UICorner` 8-10 (pills) and circular on minimap.
- States: normal dimmed, alert (low health) with red border + slow pulse, change with 0.2 s flash, hidden with fade when not applicable (e.g. no objective).
- Animation: only micro-feedback (damage, pickups, objective check). No flashy loops during combat.

## Best practices

- Less is more: if a datum doesn't change a decision within 10 seconds, it doesn't belong on the HUD.
- Minimum AA contrast over variable backgrounds: shadow or pill behind every text.
- One bar style and one chip style across the whole game.
- The HUD informs, it doesn't decorate: no large illustrations or ornamental frames.
- Consistent with menus: same type family and same icons as the rest.
- Accessibility: never communicate with color alone (add icon or text to critical states).

## Common mistakes

- HUD covering the center and hiding enemies, traps, or exits.
- 8 counters at once that nobody watches and all cost performance.
- Bars with fixed `Offset` that overflow on mobile or turn tiny in 4K.
- Updating text every frame and causing GC spikes or flicker.
- Minimap that rotates without warning and disorients, or with 10 indistinguishable icons.
- Trusting the HUD for validation: the client paints, the server decides.

## Quality and done criteria

- [ ] Critical information reads in <1 s at normal play distance.
- [ ] Nothing covers core action on the 3 reference resolutions.
- [ ] Normal/alert/change/hidden states defined and tested.
- [ ] Stable 60 fps with the HUD active on PC and no attributable drops on mobile.
- [ ] After death/respawn the HUD rebuilds with no duplicates or stale values.
- [ ] Color-blind or low-vision players can tell the critical state without relying on color alone.

## Tools

- Studio: real 5-minute play per platform, Profiler for update cost.
- Studio MCP (if available): captures over gameplay with enemies/obstacles to check occlusion.
- Rojo: threshold and text configuration as editable data.
- Selene: lint for bar and chip update scripts.

## Limitations

- No full menus (pause, settings, inventory, journal): each has its own skill.
- Minimap here is a simplified representation; a large interactive map is another screen (see create.roblox.com/docs if using an advanced `ViewportFrame`).
- No game balancing: if the player needs 10 data points to decide, the problem is the design, not the HUD.
- The HUD is never anti-exploit authority; it only reflects server-validated state.
