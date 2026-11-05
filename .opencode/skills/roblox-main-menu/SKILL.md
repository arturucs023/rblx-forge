---
name: Roblox Main Menu
description: Main menus with play, modes, news, and season teaser. Use it when creating the title screen, mode selector, event panel, or entry/exit transitions.
---

# Roblox Main Menu

## Objective

Build the main menu as the game's front door: the player reaches play in 2 clicks, discovers active modes and events, and feels the game's identity before entering. Includes animated entrance, section navigation, and exit transition into the match or chosen mode.

## Scope and limits

Covers: title screen, Play/Modes buttons, news/event panel, social proof (players online, friends), season pass teaser, footer with settings/exit, and menu entry/exit transitions.

Does NOT do:

- Generic responsive mechanics (layouts, constraints, stylesheets): covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design or discovery wireframes: covered by `roblox-game-ux`; this skill implements.
- Step-by-step first-session onboarding: covered by `roblox-welcome-onboarding`.
- In-match pause: covered by `roblox-pause-menu`.
- Lobby with detailed lobbies and matchmaking: covered by `roblox-lobby-ui`.

## Use cases

- Title with giant Play button + mode row (Casual, Ranked, Event).
- Side news panel with 2-3 cards and image.
- "12.4K playing now · 3 friends online" as social proof.
- Season teaser with progress bar and view pass button.
- Animated exit that fades the menu and reveals match loading.

## Step-by-step process

1. **Define the 3 critical paths.** Quick play, pick mode, view event. Everything else is secondary and goes to the footer or a sub-panel. If Play isn't reachable in 2 clicks, redo the hierarchy.
2. **Mock up the composition.** Hero left (title + Play + modes), right column with news/events on PC; on mobile, hero on top and tabs below (Play/News/Pass). Draw the 3 sizes before building.
3. **Build the skeleton.** `ScreenGui` in `PlayerGui` → root `Frame` at `Scale` → zones: Header (`TextLabel` title + `TextLabel` players online), Hero, News panel (`ScrollingFrame` + `UIListLayout`), footer (`TextButton` Settings, Help, Exit).
4. **Implement modes as cards.** Each mode = `Frame` + `ImageLabel` thumbnail + `TextLabel` name + `TextLabel` meta (players/duration) + `TextButton` Play. Selection marked with `UIStroke` accent; the rest dimmed.
5. **Add news and teaser.** News = 2-4 card list with image, 1-line headline, and date. Season teaser = `Frame` with `TextLabel` + progress bar (`Frame` background + `Frame` fill at `Scale`) + button. Without real data, use clearly marked sample content.
6. **Honest social proof.** Show counts only if they come from the server/session (see create.roblox.com/docs); never invent production figures. If there is no data, hide the block instead of showing "0".
7. **Entry/exit transitions.** Entry: fade + hero rise with `TweenService` (0.35 s). Exit to match: fade to black with `CanvasGroup` then hide the menu. The pressed button gives immediate feedback (<100 ms) even if loading takes a while.
8. **States and errors.** No connection: retryable banner. Full mode: card in disabled state with "Full" label. Ended event: dimmed card with "Finished". Play loading: button in loading state ignoring double-click.
9. **Verify responsive and performance.** Test 1920x1080, 1366x768, and portrait mobile. Compressed thumbnails, at most 1 large background `ImageLabel`. No videos or heavy particles in the menu.

## Technical knowledge

- Recommended hierarchy (stable classes):

  ```luau
  -- Ejemplo ilustrativo: esqueleto del menú principal
  local Players = game:GetService("Players")
  local TweenService = game:GetService("TweenService")

  local gui = Instance.new("ScreenGui")
  gui.Name = "MainMenuGui"
  gui.ResetOnSpawn = false
  gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

  local root = Instance.new("Frame")
  root.Size = UDim2.fromScale(1, 1)
  root.BackgroundTransparency = 1
  root.Parent = gui
  -- Hero, NewsPanel y Footer cuelgan de root con tamaños Scale.
  ```

- Tab navigation: a `Frame` container + `TextButton`s toggling sub-panel `Visible`; keep the active tab in an attribute for telemetry.
- `TweenService` for fades: animate `CanvasGroup` `GroupTransparency` or `BackgroundTransparency` + `TextTransparency` as a group. Avoid animating `Size` every frame in long lists.
- `UIGridLayout` for the mode row on PC, vertical `UIListLayout` on mobile; switch orientation via `UISizeConstraint` or viewport code (see create.roblox.com/docs).
- Counters and news: the UI only paints; data comes from the server or configuration (see create.roblox.com/docs). Define a timeout: if they don't arrive in 3 s, show loading then fallback.
- `GuiService` to respect system menus and not overlap the Roblox button.

### Visual identity of this skill (original, do not copy)

- "Cinematic poster" direction: dark graphite background (#10131D) with hero image right at 45% and vignette; electric cyan accent (#38E1FF) + event gold (#FFC53D).
- Typography: display extra-bold title 40-56, mode names 20 semibold, meta 13 regular light gray. All with min/max `UITextSizeConstraint`.
- Composition: 12-column grid on PC (hero 7, side 5); stacked with bottom tabs on mobile. `UIPadding` 20-28, cards with `UICorner` 14 and translucent 1 px `UIStroke`.
- Spacing: 16 between cards, 24 between sections. Nothing glued to the edge: minimum 5% safe margin on mobile.
- States: hover card lifts 2 px + glow, pressed scales 0.98, disabled 45% transparency + label, loading with shimmer on thumbnail, selected with 2 px cyan `UIStroke`.
- Animation: staggered entrance hero→modes→news (60 ms delay each block), 0.3 s fade-to-black exit. Moderate, no endless loops.

## Best practices

- Play always visible without scrolling on all resolutions.
- One primary action per screen; the rest secondary.
- News with date and state (Active/New/Finished); no eternal banners without a date.
- Consistent with onboarding and pause: same buttons, same radii, same icons.
- Preload the default mode thumbnail; the rest lazy.
- Original texts: don't copy slogans or layouts from existing games.

## Common mistakes

- 6 competing "Play" buttons and the player unsure which to press.
- Invented player counts exposed as soon as they enter the game.
- `Offset`-fixed background leaving bands on ultrawide or cutting the title on mobile.
- Double-click on Play firing two matchmaking requests (missing loading state with debounce).
- News with no state advertising expired events.
- Covering the Roblox system button with your own header.

## Quality and done criteria

- [ ] Play reachable in ≤2 clicks from any menu tab.
- [ ] No overlaps on 3 reference resolutions (1080p PC, 768p laptop, portrait mobile).
- [ ] Animated entry and exit with no cuts; the menu doesn't reappear after entering the match.
- [ ] Empty, loading, and error states defined for news and modes.
- [ ] Performance: menu at 60 fps, image memory under project budget.
- [ ] Original texts and visible date on every news item.

## Tools

- Studio: UI editor, device simulator, Profiler for image cost.
- Studio MCP (if available): comparative PC/mobile captures, `Output` inspection on load failures.
- Rojo: mode and news cards as data (table) so design edits without touching code.
- Selene: lint tab controllers and Play debounce.

## Limitations

- No real matchmaking or server creation (covered by `roblox-lobby-ui`).
- No season-pass purchase handling; only the teaser (purchase goes in `roblox-shop-ui`).
- Counts and news depend on the game backend (see create.roblox.com/docs); without backend only sample content.
- No chat or full friends list; only the social-proof micro-block.
