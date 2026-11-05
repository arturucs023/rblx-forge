---
name: roblox-vehicle-ui
description: Garage, spawn, driving HUD, and damage. Use it when building vehicle selection, customization, speedometer, fuel, or damage states.
---

# Roblox Vehicle UI

## Objective

Make using vehicles frictionless and trap-free: pick in the garage, spawn at a valid point, drive reading speed/fuel/damage at a glance, customize what's visible, and understand what happens when it breaks. The UI informs; the server decides physics and ownership.

## Scope and limits

Covers: garage (list, stats, spawn), driving HUD (speed, fuel, damage, seatbelt/headlight), visual customization, and states (occupied, destroyed, no permission).

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Vehicle physics, seats, or networking: game/server system (verify at create.roblox.com/docs); only its reflection here.
- Vehicle shop with charging: covered by `roblox-shop-ui` (here the See/Buy button).
- Base touch controls: `roblox-mobile-touch-ui` (here their driving layout).

## Use cases

- Garage with 6 cars, stats (Spd/Accel/Control 0-10) and "Spawn".
- HUD with 87 km/h speedometer, 62% fuel, Minor damage and Headlight button.
- Customization: color, rims, horn with `ViewportFrame` preview.
- "Vehicle occupied by Luis" or "Destroyed · respawns in 0:12".
- Bike with helmet indicator and "No fuel: find a gas station" notice.

## Step-by-step process

1. **Define the usage contract.** Who can spawn (ownership/level), where (valid points), how many at once, what happens on destruction (cooldown, cost). Write it before drawing the garage.
2. **Mock garage + HUD.** Garage: list/lane + `ViewportFrame` preview + stats + Spawn/Customize buttons. HUD: speedometer bottom-right, fuel + damage top or next to speed, actions (Headlight/Horn/Exit) in a touch arc. Mobile: tabbed garage, HUD not covering drive buttons.
3. **Build the garage cards.** `Frame` + preview + `TextLabel` name + 3 0-10 bars + status (Available/Occupied/Destroyed 0:12/Locked Level X). Spawn is the primary action with debounce.
4. **Spawn with feedback.** On Spawn press: brief loading → appears at a free point (if none, the UI says "No free point, wait" instead of stacking cars). If the server fails, revert with cause + action.
5. **Legible driving HUD.** Speed in large tabular number + unit, fuel with bar + % and warning at 20% and 10%, damage in 4 levels (Pristine/Minor/Severe/Critical) with icon + text (not color only), 56px+ Headlight/Horn/Exit buttons.
6. **Visual customization.** Color (8-12 palette), rims (3-5), horn (2-3), plate with filtered text. Preview in `ViewportFrame` with the real model; Save asks the server and shows confirmation. Nothing that changes stats is sold as "visual".
7. **Damage and consequences.** As damage rises: notice + suggested downgrade in HUD ("Severe: find a workshop"); on destruction: brief modal with cause, visible cooldown, and "Repair/Spawn another/Exit" buttons. No jumpscares or eternal lockout.
8. **Permissions and theft.** If the game allows passengers/theft, the UI shows owner, lock, and "Ask to ride" vs "Steal (risk)" with explicit consequence. Every action is server-validated.
9. **Verify by actually driving.** Spawn, drive 5 min, crash, run out of fuel, destroy, repair, customize, and re-enter. On PC, mobile, and gamepad, no overlaps and at 60 fps.

## Technical knowledge

- Speed HUD (stable classes):

  ```luau
  -- Ejemplo ilustrativo: pintar velocidad y combustible
  local speedLabel = hud:WaitForChild("SpeedValue") :: TextLabel
  local fuelFill = hud:WaitForChild("FuelFill") :: Frame

  local function setDrive(speed: number, fuel: number)
    speedLabel.Text = string.format("%d km/h", math.floor(speed + 0.5))
    fuelFill.Size = UDim2.fromScale(math.clamp(fuel, 0, 1), 1)
  end
  ```

- Bars and speedometer at `Scale` with `UIAspectRatioConstraint` on dials, tabular numbers with `UITextSizeConstraint`; `UIPadding` and `UICorner` consistent with the base HUD.
- `ViewportFrame` for the garage preview: one model, fixed 3/4 camera, slow optional rotation; in lists use `ImageLabel`.
- `UserInputService` for shortcuts (F headlight, H horn, E exit per project) + equivalent touch buttons; `ProximityPrompt` for "Enter" in the 3D world.
- State (owner, damage, fuel) replicated by the server (verify at create.roblox.com/docs); the UI paints and requests actions, never grants ownership or repairs locally.
- `TweenService` for notices (0.2s damage flash, low-fuel pulse) and garage↔HUD transitions.

### This skill's visual identity (original, do not copy)

- "Industrial workshop" direction: asphalt background (#12161F), steel cards (#232B3D) with workshop-yellow stripe (#FFC53D), HUD in dark pills with white numbers and green ok accent (#3DDC84) / red critical (#FF5A5A).
- Typography: speed 30-36 extra-bold tabular, labels 11 uppercase, stats 13 with number. Unit always visible ("km/h", "%").
- Composition: garage in lane + 16:10 preview; HUD with speed bottom-right, fuel+damage top-right, actions in arc. `UIPadding` 12, `UICorner` 10.
- Spacing: 140-180 equivalent-diameter speedometer, 10 gap between pills, 56-64 action buttons.
- States: pristine/minor/severe/critical with icon + text + color; low fuel with slow blink (1 Hz max); spawn loading with spinner; destroyed with modal and countdown.
- Animation: needle/bar smoothed 0.15s, notices with pulse, transitions with fade. Nothing distracting at 120 km/h.

## Best practices

- Speed + fuel + damage visible without looking away from the road.
- Damage levels with text, not color only; fuel with % and double warning (20%/10%).
- Spawn explains where it will appear ("Point B · Workshop") before pressing.
- Customization with real preview and explicit Save; no silent changes.
- Consistent with base HUD, shop, and notifications: same numbers, same icons.
- Plate text and names filtered; no uncontrolled free text.

## Common mistakes

- Speedometer covering the center or the touch steering buttons.
- Allowing 10 cars to spawn by button mashing (missing debounce + server validation).
- Showing "Repaired" on client without confirmation and breaking the car on re-entry.
- Damage by color only that colorblind players can't tell apart at speed.
- Preview with a different model than what spawns (rims that don't exist).
- Stealing/using others' vehicles without validation and opening the door to exploits.

## Quality and done criteria

- [ ] Garage→spawn→drive→damage→destroy→repair cycle tested against server.
- [ ] HUD legible at speed without covering the road at 3 resolutions.
- [ ] No duplicate spawns or fake ownership under spam or high latency.
- [ ] Customization saves and persists after re-entry.
- [ ] 60 fps driving on PC with no UI-attributable drops on mobile.
- [ ] Original art and names, filtered text where applicable.

## Tools

- Studio: Play with server while driving, mobile + gamepad simulator, `Output` for failed spawns.
- Studio MCP (if available): captures of garage and HUD in motion at 3 resolutions.
- Rojo: vehicles, stats, and visual options as editable data.
- Selene: lint of spawn/repair/customize handlers and debounces.

## Limitations

- Physics, collisions, and real ownership live in the game/server (verify at create.roblox.com/docs).
- The HUD doesn't replace a driving tutorial; if nobody knows how to steer, the game is the problem.
- `ViewportFrame` and reflections cost; sober, documented preview.
- Fuel/damage as gameplay systems are balanced by the project, not this UI.
