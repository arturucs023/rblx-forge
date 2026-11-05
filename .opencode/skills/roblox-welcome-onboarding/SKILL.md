---
name: Roblox Welcome and Onboarding
description: Welcome screens, onboarding, and first tutorial. Use it when building the first session, interactive tutorials, discovery screens, or skip flow.
---

# Roblox Welcome and Onboarding

## Objective

Build the player's first session: welcome screen, control and objective discovery sequence, and smooth transition into play. The goal is for a new player to understand what to do in under 90 seconds without reading manuals, and for a returning player to skip everything in one click.

## Scope and limits

Covers: welcome cover, onboarding steps (2-5 steps), initial interactive tutorial (move, interact, objective), skip button, "already saw onboarding" persistence, and per-step drop-off telemetry.

Does NOT do:

- Generic responsive mechanics (layouts, constraints, stylesheets): covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design or retention research: covered by `roblox-game-ux`; this skill implements.
- Full main menu with modes and news: covered by `roblox-main-menu`.
- Persistent in-game HUD: covered by `roblox-hud`.
- Editable accessibility settings: covered by `roblox-settings-ui`.

## Use cases

- "Welcome!" cover with Play button and "How to play" button.
- 3-card sequence: move, interact, game objective.
- Interactive tutorial: "press W to move to the marked zone" with validation.
- Returning player who enters and sees only a summary banner with replay option.
- Measuring at which step newcomers drop off, to iterate.

## Step-by-step process

1. **Define the learning outcome.** Write 3 sentences max that the player must know when done (e.g. "I move", "I interact", "I win by doing X"). If you need more than 3, trim the game, not the onboarding.
2. **Structure the sequence.** Cover (1 screen) + 2-4 steps + final confirmation. Each step = 1 idea, 1 illustration or demo zone, 1 action. Sketch the flow on paper before touching Studio.
3. **Build the cover.** `ScreenGui` in `PlayerGui` with a `Frame` container at `Scale`, `TextLabel` title, subtitle, primary `TextButton` "Play" and secondary "How to play" + discreet "Skip" `TextButton`. `ImageLabel` background or `Frame` with own gradient.
4. **Build the step carousel.** One `Frame` carousel with progress indicator (e.g. "1/3" + `Frame` bar). Back/Next/Skip buttons. Each step shows an illustrative `ImageLabel` + 1-2 line `TextLabel` + demo (e.g. highlights the key).
5. **Add the interactive tutorial (optional but recommended).** Instead of just reading, ask for a real action: "walk to the circle" or "press E". Listen to input with `UserInputService` or the zone with server-side validation (verify at create.roblox.com/docs). Advance only on completion or after timeout with a skip option.
6. **Implement skip and persistence.** The Skip button closes everything and marks `LocalPlayer` as served in local storage or attribute; on re-entry, show a compact version. Skipping must never penalize or block base rewards.
7. **Add transitions.** Enter/exit with `TweenService` (fading `CanvasGroup` or `GroupTransparency`, slight slide). 0.25-0.4s duration. Without transitions there's no sense of polish.
8. **Instrument drop-off.** Log an event per step seen/completed/abandoned (project analytics system; verify at create.roblox.com/docs). Review weekly which step loses the most people and simplify it first.
9. **Verify on PC and mobile.** Same flow with `Scale` sizes, minimum 44px-equivalent buttons, text legible at simulated 1 m distance. Test with a new account and with one that already completed it.

## Technical knowledge

- Recommended hierarchy (stable classes only):

  ```luau
  -- Ejemplo ilustrativo: estructura de pantallas de onboarding
  local Players = game:GetService("Players")
  local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")

  local gui = Instance.new("ScreenGui")
  gui.Name = "OnboardingGui"
  gui.ResetOnSpawn = false
  gui.Parent = playerGui

  local root = Instance.new("Frame")
  root.Name = "Root"
  root.Size = UDim2.fromScale(1, 1)
  root.BackgroundTransparency = 1
  root.Parent = gui
  ```

- Sizes always with `UDim2.fromScale` and `UIAspectRatioConstraint` / `UISizeConstraint` for minimums and maximums. Never fixed positions with `Offset` only.
- Progress with horizontal `UIListLayout` for dots and `Frame` bar; step text with `UITextSizeConstraint` so it doesn't break on small screens.
- Interactive tutorial: combine local UI (`UserInputService.InputBegan`) with authoritative server validation (verify at create.roblox.com/docs). The UI never decides alone that the player "won".
- `GuiService` for peeking system menu states if you need to avoid overlaps (read-only).
- "Onboarding seen" persistence: player attribute or local/persistent storage per project (verify at create.roblox.com/docs). Don't use `DataStore` directly from the client.

### This skill's visual identity (original, do not copy)

- "Adventure dawn" art direction: deep night-blue background (#141B33) with warm amber accent (#FFB84D) and turquoise secondary (#4DE3C2). High contrast.
- Typography: large bold title (32-44pt equivalent with `UITextSizeConstraint`), body 16-18, generous leading. No decorative serifs.
- Composition: centered cover with illustration on top (40% height), title, 1 promise line, big primary button below. Steps in a centered card at 60% width on PC, 90% on mobile.
- Spacing: 16-24px-equivalent `UIPadding`, 12-16 `UICorner`, subtle 1px `UIStroke` on cards.
- States: amber primary with +8% brightness hover, 0.97 pressed scale, 50% transparency gray disabled, loading with animated dots, feedback with turquoise check + `TweenService`.
- Animation: fade + 12px rise on each step's entry; single-pulse final celebration. Nothing blinking more than 1x/second.

## Best practices

- One idea per step. If a step needs scroll, split it.
- Skip button always visible with the same secondary hierarchy on every step.
- 1-2 lines of text per step, action verb first ("Walk", "Press", "Collect").
- Illustrate with the game's real aesthetic, not generic icons unrecognizable later.
- The onboarding-completion reward (if any) is announced at the end, not the start, so it doesn't condition skipping.
- Consistent with menu and HUD: same corner radii, same type family, same button tone.

## Common mistakes

- 5-paragraph text wall nobody reads on mobile.
- Non-skippable tutorial or one that punishes skipping with lost rewards.
- `Offset`-only positions that break on tablet and phone.
- Validating the tutorial on client only: the exploiter skips it and claims the reward (every reward is server-validated).
- 7+ steps measuring 60% drop-off at step 4 that nobody trims.
- Covering touch controls with the tutorial card on mobile.

## Quality and done criteria

- [ ] New player understands the goal with no outside help in a 3-user test.
- [ ] Skip works from any step and leaves the player in a playable state.
- [ ] No console errors, 60 fps transitions on PC and no visible hitches on mid-range mobile.
- [ ] Text legible at 1366x768, 1920x1080, and 390x844 vertical phone (Studio simulator).
- [ ] Telemetry logs seen/completed/abandoned per step.
- [ ] Re-entering with onboarding done shows the compact version, doesn't repeat the long one.

## Tools

- Studio: ScreenGui editor, device simulator, Play solo + Play with server to validate persistence.
- Studio MCP (if available): capture of the 3 resolutions, `Output` read, `ScreenGui` location.
- Rojo: UI lives in versioned shared modules; the step flow as an editable data table.
- Selene/luau-lsp: checking carousel local scripts and the `UserInputService` listener.

## Limitations

- Not a substitute for game balance: if the game is confusing, onboarding won't save it.
- Telemetry here is step counting, not advanced retention analytics (that's `roblox-analytics-liveops`, verify at create.roblox.com/docs).
- Doesn't handle full multi-language localization; leave `TextLabel`s with keys and 30% extra room for long translations.
- On console, gamepad navigation needs explicit selection order; test with a real gamepad before publishing.
