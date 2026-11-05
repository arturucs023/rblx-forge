---
name: Roblox Settings
description: Graphics, audio, rebindable controls, and accessibility panel. Use it when you create options, key remapping, volume sliders, presets, or local settings persistence.
---

# Roblox Settings

## Objective

Let every player adapt the game to their device and abilities in under a minute: graphics that perform, comfortable audio, controls at hand, and real accessibility options. Every change previews instantly and persists across sessions.

## Scope and limits

Covers: Graphics/Audio/Controls/Accessibility tabs, sliders/toggles/dropdowns, key rebinding, presets (Performance/Balanced/Quality), local persistence, and a Reset button.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Quick pause settings: covered by `roblox-pause-menu` (this panel is the full one).
- HUD or menus as such: `roblox-hud`, `roblox-main-menu`.
- Optimizing the game's performance itself (that is performance; here only the UI that exposes it).

## Use cases

- Graphics tab with preset + draw distance + shadows on/off.
- Master/Music/Effects volume sliders with sound test.
- Rebinding "Dodge" from Q to E with conflict detection.
- Colorblind mode, subtitle size, and camera-shake reduction.
- "Reset to defaults" with confirmation and instant effect.

## Step-by-step process

1. **Inventory the real settings.** Only expose what the game truly honors (if there is no configurable shadow quality, do not show it). Group into max 4 tabs.
2. **Mock up the panel.** `ScreenGui` → centered card (640-760 px max equivalent, 92% on mobile) → tab bar (`TextButton`s) + content (`ScrollingFrame` + `UIListLayout`) + footer (Reset/Close). Each row: label + control + value.
3. **Implement controls with stable primitives.** Toggle = `TextButton` with pill (`Frame` + round `UICorner`) that changes color/position. Slider = track `Frame` + fill `Frame` at `Scale` + wide invisible `TextButton` for dragging. Dropdown = `TextButton` + dropdown list of `TextButton`s.
4. **Key rebinding.** "Press a key…" button that listens to `UserInputService.InputBegan`, validates (no reserved system keys, no duplicates; if conflict ask "Swap?"), saves, and shows the readable name. Always offer "Reset controls".
5. **Graphics presets.** Three `TextButton`s that set known combinations and mark the tab as "Custom" if the user touches anything. The preset applies without restarting.
6. **Real accessibility.** UI text size (Small/Normal/Large via `UIScale`), reduce motion/shake (a toggle the game honors), colorblind mode (alternative palette + shapes, never color alone), subtitles for important dialogue.
7. **Local persistence.** Save to the player's local storage or persistent project attributes/config (verify in create.roblox.com/docs); load before painting the first screen. Without saving, settings are decoration.
8. **Instant feedback.** Every change applies when moving the slider/releasing the toggle, with a visible value ("70%") and a Test button where applicable (audio). No global "Apply" except Reset.
9. **Verify at the extremes.** Small screen + Large text + Performance preset must still be usable; gamepad + touch must operate the whole panel without a mouse.

## Technical knowledge

- Setting row (stable classes):

  ```luau
  -- Ejemplo ilustrativo: fila con toggle
  local row = Instance.new("Frame")
  row.Name = "Row_Shadows"
  row.Size = UDim2.fromScale(1, 0)
  row.AutomaticSize = Enum.AutomaticSize.Y
  row.Parent = content

  local toggle = Instance.new("TextButton")
  toggle.Name = "Toggle"
  toggle.Text = "Activado"
  toggle.Size = UDim2.fromScale(0.28, 0)
  toggle.Parent = row
  ```

- Row sizes with `AutomaticSize.Y` + `UIListLayout` (verify in create.roblox.com/docs for the exact enum) or fixed heights at `Scale`; text with `UITextSizeConstraint`; generous `UIPadding` for touch.
- `UserInputService` for rebind capture; filter `gameProcessedEvent` so system/chat keys are not captured.
- `UIScale` at the root for text/UI size adjustment without rewriting every font.
- Real engine graphics quality (verify in create.roblox.com/docs); the UI only exposes what the project supports and documents each slider's range.
- Volume: the UI stores 0-100 and the game maps it to its mix; include a test button per family.

### Visual identity of this skill (original, do not copy)

- "Clinical lab" direction: light-tidy background over smoke-white card (#F2F4F8) with graphite text (#1A2133) in the light panel, or graphite card over dark background depending on the game; indigo accent (#5B6CFF) for actives.
- Typography: labels 15 semibold, values 14 tabular right-aligned, descriptions 12 gray. Strict label-left / control-right alignment.
- Layout: 4 tabs with simple textual icons, 6-9 visible rows without scroll on PC, smooth scroll on mobile. `UIPadding` 16, gap 8, `UICorner` 10.
- Spacing: 52-60 px-equivalent rows (comfortable touch), sliders with a touch area 3x the visible track.
- States: toggle on indigo with pill right / off gray, hover +brightness, pressed 0.97, disabled 50%, slider with live value, rebind in "listening" with slow pulsing border.
- Animation: tab transitions with 0.15 s fade; toggles with 0.15 s slide via `TweenService`. Nothing else: it is a tool, not a show.

## Best practices

- Every setting shows its current value ("High", "70%", "E"). No blind values.
- Reset asks for confirmation and announces what is reset.
- Presets name the tradeoff ("Performance: less detail, more FPS").
- Rebind with readable names ("Space", not "Enum.KeyCode.Space").
- Consistency with pause: quick settings and this panel share names and ranges.
- Short texts; long help goes to a tooltip or a secondary line, not the title.

## Common mistakes

- Showing settings the game ignores (shadows that change nothing).
- Rebind that lets players stomp system or chat keys and breaks the game.
- Saving to memory only and losing everything on rejoin.
- Sliders with a 4 px touch area, impossible on mobile.
- Panel with only `Offset` that overflows on small screens.
- Global "Apply" that the player forgets to press and thinks something changed.

## Quality and done criteria

- [ ] Each setting applies instantly and persists after closing and rejoining.
- [ ] Full rebind with no silent conflicts and working reset.
- [ ] Operable with mouse, touch, and gamepad at the 3 reference resolutions.
- [ ] No console errors; presets verified on low and high devices.
- [ ] Minimum accessibility: text size, motion reduction, and color alternative.
- [ ] Consistent names and ranges with pause quick settings.

## Tools

- Studio: device simulator, gamepad test, `Output` for key conflicts.
- MCP Studio (if available): panel captures in light/dark and Large text.
- Rojo: defaults and ranges as designer-editable data.
- Selene: lint of input capture and local persistence.

## Limitations

- The official Roblox system settings menu is not controlled from here.
- Available graphics quality depends on device and engine (verify in create.roblox.com/docs).
- Local persistence has per-platform limits; document what is saved and where.
- This skill does not optimize the game; it only exposes honest controls over what exists.
