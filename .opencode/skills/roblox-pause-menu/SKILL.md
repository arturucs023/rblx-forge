---
name: Roblox Pause Menu
description: Pause with resume, quick settings, and exit with confirmation. Use it when creating the in-match pause, ESC panel, quick options, or the safe-quit flow.
---

# Roblox Pause Menu

## Objective

Pause the match legibly and safely: the player understands the game is stopped (or protected), adjusts the essentials without leaving, and quits only with confirmation. Pause must never grant an advantage or allow actions the server would not validate during normal play.

## Scope and limits

Covers: pause overlay, Resume/Quick settings/Help/Quit buttons, quit-confirmation dialog, behavior with the Roblox system menu, and pause-specific anti-exploit rules.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Full settings panel with rebind and profiles: covered by `roblox-settings-ui` (here only quick settings).
- In-match HUD: covered by `roblox-hud`.
- Global game notifications: covered by `roblox-notifications-ui`.

## Use cases

- Pause with ESC/button that darkens the game and shows 4 options.
- Quick volume and quality adjustment without opening the full panel.
- "Quit match? You will lose unsaved progress" with Confirm/Cancel.
- Automatic pause on focus loss on mobile with a clear message.
- Blocking movement and interactions while pause is open.

## Step-by-step process

1. **Define what pausing means in your game.** Single player: freezes locally. Multiplayer: the world normally does not stop; pause is an overlay + own-input lock. Write it in 1 sentence and paint it in the UI ("Match paused" vs "Game in background").
2. **Build the overlay.** `ScreenGui` in `PlayerGui` → full-screen semi-transparent `Frame` + centered card `Frame` (50% width PC, 88% mobile) with vertical `UIListLayout`: title, `TextButton` Resume, Quick settings, Help, Quit.
3. **Handle open/close.** Open with the ESC key or a `TextButton` in the HUD (touch). Close with Resume, ESC again, or a close button. Use `UserInputService.InputBegan` for the key and a 0.2 s debounce to avoid flicker.
4. **Lock game input.** While open, ignore movement/attack/interact in your local controllers and show the cursor. On close, restore the exact state. Never rely only on hiding buttons: disable the logic.
5. **Add quick settings.** Volume (simple slider with `TextButton` - / + or bar), quality (Low/Medium/High), mute. Immediate reversible changes; the full panel lives in `roblox-settings-ui` behind a "More settings" button.
6. **Implement quit with confirmation.** Quitting opens a secondary modal: explain the consequence + `TextButton` Confirm (destructive, red) + Cancel (default focus). Confirm runs the exit (teleport/exit per project; check create.roblox.com/docs). Double confirmation if there is unsaved progress.
7. **Apply anti-exploit rules.** Pause does not stop server timers, does not cancel already-validated damage, does not allow healing/equipping/trading from the menu, and does not hide the player from others. Every sensitive action is revalidated on the server.
8. **Animate and test.** Entry: 0.2 s darken + card sliding up slightly via `TweenService`. Reverse exit. Test: open in combat, open offline, spam ESC, rotate the phone, open the Roblox system menu on top.
9. **Respect the system menu.** Do not attempt to block or impersonate the Roblox menu; your pause coexists. Use `GuiService` only for reading state if needed.

### Visual identity of this skill (original, do not copy)

- "Sober cockpit" direction: 60% black overlay + graphite card (#1C2233) with thin light border; resume green accent (#3DDC84) and quit red (#FF5A5A).
- Typography: title 24 semibold, options 17 regular, notes 13 gray. Button height 48 (PC) / 56 (touch) with `UITextSizeConstraint`.
- Composition: centered card, 1 column, icon + text per row, 1 px separators. Quit visually separated at the end with extra spacing.
- Spacing: `UIPadding` 20, 10 gap between buttons, `UICorner` 12, 1 px `UIStroke` on the card.
- States: hover lightens 6%, pressed 0.98 scale, disabled gray, loading only on confirm-quit (brief spinner), visible focus on Cancel by default in the modal.
- Animation: only fade + 8 px rise, 0.2-0.25 s. In pause, restraint is mandatory: nothing distracting.

## Technical knowledge

- Minimal structure (stable classes):

  ```luau
  -- Ejemplo ilustrativo: alternar la pausa
  local Players = game:GetService("Players")
  local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
  local pauseGui = playerGui:WaitForChild("PauseGui")

  local function setPaused(open: boolean)
    pauseGui.Enabled = open
    -- Aquí además se bloquean los controladores de juego locales.
  end
  ```

- `ScreenGui.Enabled` to show/hide the whole block; high `DisplayOrder` but below critical modals and system chat.
- `UserInputService` for ESC/dedicated key; on mobile a pause `TextButton` in the HUD (minimum 48x48) that opens this menu.
- `TweenService` only for the overlay and card; freeze game tweens if your design stops them in pause.
- Keys and gamepad: navigation must work without a mouse; test focus order before publishing (check create.roblox.com/docs for selection details).
- No inventory, damage, or economy decision is made in this menu; if such a button appears, it is a design bug.

## Best practices

- Resume is the primary and largest action; Quit always last and in destructive style.
- Explain the consequence of quitting in 1 honest line, no emotional blackmail.
- Quick settings with immediate effect and no Save button.
- Total consistency with main menu and settings: same buttons, same icons, same radii.
- In multiplayer make clear the world goes on: "Other players continue".
- Log pause opens and quits to detect frustration points (project analytics).

## Common mistakes

- Pause that only hides the UI but leaves the character moving or receiving input.
- Quitting without confirmation and later complaints about lost progress.
- Trying to pause the server from the client or freeze other players.
- Allowing equip/heal/trade from pause while skipping validations.
- Overlay covering the Roblox system menu or mimicking it to deceive.
- Ambiguous texts ("Exit" without saying whether it is to the menu or out of the game).

## Quality and done criteria

- [ ] Open/close 20 times in a row (ESC spam) with no broken or duplicated states.
- [ ] No advantage: timers, damage, and economy behave the same with pause open.
- [ ] Quitting requires confirmation and explains the consequence.
- [ ] Legible on PC, mobile, and tablet with `Scale` sizes and sufficient touch buttons.
- [ ] No console errors and no ghost input on resume.
- [ ] Visually consistent with the rest of the game's menus.

## Tools

- Studio: solo and server play, mobile simulator, `Output` for duplicated inputs.
- MCP Studio (if available): capture of the overlay over real gameplay, layer-order check.
- Rojo: menu texts as data for review and future translation.
- Selene: lint the open/close controller and debounce.

## Limitations

- In multiplayer there is no "real world pause" from the client; it is overlay + local lock.
- Does not replace the full settings panel (`roblox-settings-ui`) or the HUD (`roblox-hud`).
- Roblox system menu behaviors may vary per platform (check create.roblox.com/docs).
- Real anti-exploit protection lives on the server; this UI alone does not block it.
