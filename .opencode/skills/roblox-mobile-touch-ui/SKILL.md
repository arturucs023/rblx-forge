---
name: Roblox Mobile Touch UI
description: Touch controls, thumb zones, safe area, and orientation. Use it when adapting HUD, buttons, joystick, or menus to mobile and tablet without covering the game.
---

# Roblox Mobile Touch UI

## Objective

The game should control just as well with thumbs as with a keyboard: respected thumb zones, reachable and large buttons, a safe area with no clipping, and clean coexistence between touch, gamepad, and keyboard. Touch is not "the small PC version": it is its own layout.

## Scope and limits

Covers: thumb zones, minimum touch sizes, safe area and notch, virtual joysticks/buttons, portrait/landscape orientation, and touch/gamepad/keyboard coexistence.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces` (this is the touch specialization here).
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Information HUD as such: covered by `roblox-hud` (here, where to place it so fingers do not cover it).
- Full menus: each has its own skill; here the touch rules they all obey.

## Use cases

- Left joystick + 3 right buttons (Jump, Interact, Ability) without covering the center.
- 56x56 pause button in a safe corner outside the thumb.
- Menu that on PC is 2 columns and on mobile is 1 column with tabs.
- Banner that on mobile goes top-center and never over the buttons.
- Rotation to landscape that relocates the objective bar without the notch cutting it.

## Step-by-step process

1. **Map the thumb zones.** Sketch left thumb (movement, bottom-left), right thumb (actions, bottom-right), dead center zone (game, do not touch), and top corners (info/pause). Every touch control lives in its zone; the center stays free.
2. **Define minimum sizes.** Primary action 64-72 equivalent px, secondary 52-56, icons 24+ with a 48+ touch area. Minimum 12 spacing between buttons. No 32 px "they'll manage" buttons.
3. **Apply the safe area.** 4-6% margin from each edge + respect for system notches/bars; test with simulators on iPhone and Android with different notches. Critical UI never lives within the 24 px edge strip.
4. **Build virtual controls with stable primitives.** Joystick = `Frame` base + `ImageLabel`/`Frame` stick that follows the finger within the radius; buttons = round `TextButton`/`ImageButton` with `UICorner` 1,0. Use `UserInputService.TouchStarted/TouchMoved/TouchEnded` only through the project's controls.
5. **Adapt each screen.** Rule: PC 2 columns → mobile 1 column + tabs; grids 4→2; bottom sheets instead of small centered modals; fonts +2-4 equivalent pt. Document the project's equivalence table.
6. **Orientation.** Support the game's official orientation; if it is landscape, portrait mode shows a message + minimal layout, not a broken game. On rotation, re-anchor (do not rebuild the whole UI) and preserve state.
7. **Coexist with gamepad and keyboard.** Detect the last input and show the matching help ("Press E" vs "Tap ⬤" vs "Press ⓧ"); never show all three at once. On a tablet with keyboard, touch stays available.
8. **Test with real thumbs.** Play 10 minutes on a device: can you reach everything without stretching? Can you see the enemy between your fingers? Does sweat/sliding break the joystick? Adjust radius and sensitivity before calling it done.
9. **Verify touch performance.** Controls at 60 fps, no perceived finger-to-action lag above 80 ms, and no overlap between the informative HUD and the controls at any mobile resolution.

## Technical knowledge

- Touch button (stable classes):

  ```luau
  -- Ejemplo ilustrativo: botón de acción táctil bien anclado
  local actionButton = Instance.new("TextButton")
  actionButton.Name = "JumpButton"
  actionButton.Text = "Saltar"
  actionButton.AnchorPoint = Vector2.new(1, 1)
  actionButton.Position = UDim2.fromScale(0.96, 0.94)
  actionButton.Size = UDim2.fromScale(0.16, 0.16)
  actionButton.Parent = touchRoot
  -- UICorner circular + UISizeConstraint mínimo + UIAspectRatioConstraint 1:1.
  ```

- Everything to `Scale` with `AnchorPoint` per corner; `UIAspectRatioConstraint` 1:1 on round buttons; `UISizeConstraint` with a physical minimum and maximum so tablets are not covered.
- `UserInputService` to know whether there is touch (`TouchEnabled`, check create.roblox.com/docs) and for gestures; the project's joystick emits movement, this UI only presents it.
- `GuiService` as a read source so system menus are not overlapped; the project's own safe area is defined with 4-6% + tests on real notches.
- `ScrollingFrame` on mobile with a thin `ScrollBarThickness`, natural inertia, and touch areas that do not fight scrolling (buttons outside the drag zone).
- Optional global `UIScale` for an "extra-large buttons" accessibility mode.

### Visual identity of this skill (original, do not copy)

- "Sober neon control" direction: semi-transparent buttons (#0E1420 at 45%) with a 2 px light border and a thick white glyph; joystick with ring base + solid stick; nothing that hides the game.
- Typography: 14-16 bold glyphs and labels inside/outside the button, contextual help at 13 on a pill. No long text inside round buttons.
- Composition: joystick bottom-left (radius 90-110), actions in a bottom-right arc (primary larger and lower), pause top-right small, objective top-center. Generous `UIPadding`.
- Spacing: 12-16 between buttons, 4-6% safe margin. Primary 20% larger than secondaries for touch hierarchy.
- States: normal 45% opaque, pressed 80% + 0.93 scale, disabled 25% + no border, cooldown with radial sweep or numeric, feedback with visual vibration (0.12 s pulse via `TweenService`).
- Animation: only press feedback and initial appearance. No floating or self-moving buttons.

## Best practices

- The center of the screen is sacred: 0 touch controls in the middle third.
- Every frequent action within ≤1 thumb of reach without stretching; the rare stuff goes to menus.
- Contextual help for the real input, never a triple permanent legend.
- Buttons with a label or universal glyph + tooltip in pause; no ambiguous icons.
- Consistency with PC: same hierarchy (primary/secondary), same colors, same names.
- Left-handed or mirror mode if the game promises it; if not, do not advertise it.

## Common mistakes

- 32 px buttons that miss 30% of hurried presses.
- Critical HUD under the right thumb that nobody reads again.
- Dialog box covering the joystick and forcing the player to let go of movement to proceed.
- PC layout shrunk to mobile without reordering: everything legible and nothing usable.
- Ignoring the notch and losing pause and the objective on iPhone.
- Finger-to-action lag from animating the button for 0.3 s before executing.

## Quality and done criteria

- [ ] 10 minutes playable on mobile with no reach errors or center occlusion.
- [ ] Buttons ≥48 equivalent px, primary ≥64, verified on 2 phone sizes + tablet.
- [ ] Safe area and notch tested on 2 different simulated devices.
- [ ] Correct per-input help (touch/gamepad/keyboard) with no triple legends.
- [ ] No overlap between controls, critical HUD, and notifications.
- [ ] Rotation supported with no state loss or broken screens.

## Tools

- Studio: device simulator, touch emulation, rotation test.
- MCP Studio (if available): captures with touch overlay in 3 sizes, `Output` for lost inputs.
- Real device whenever possible for joystick radius and latency.
- Selene: lint touch handlers and input detection.

## Limitations

- The base touch joystick and camera are provided by the project/engine; here their presentation and layout.
- Per-OS behaviors (system gestures, notch, bars) vary (check create.roblox.com/docs).
- Finger-to-action latency also depends on the game and the network, not only on the UI.
- Full accessibility (giant buttons, switch control) may require a dedicated mode.
