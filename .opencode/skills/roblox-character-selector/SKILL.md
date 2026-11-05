---
name: Roblox Character Selector
description: Class cards, compared stats, and 3D preview. Use it when creating character/class selection, level or paid unlocks, or confirmation before playing.
---

# Roblox Character Selector

## Objective

Help players pick a character or class with confidence in 30 seconds: see options, compare stats, preview the look, and understand what is locked and how to unlock it. Always ends with explicit confirmation before entering the game.

## Scope and limits

Covers: card gallery, compared stats with bars, `ViewportFrame` preview, level/paid locking with unlock path, and selection confirmation.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior class UX design: covered by `roblox-game-ux`; this skill implements the screen.
- Real shop and charging: covered by `roblox-shop-ui` (here only the requirement label).
- Lobby and matchmaking: covered by `roblox-lobby-ui`.
- In-match abilities and cooldowns: game system, not this screen (ability UI in the HUD goes in `roblox-hud`).

## Use cases

- 4 classes (Tank, Scout, Medic, Engineer) with cards and stats.
- 3D preview that rotates on select, with name and role.
- Character locked at "Level 8" with progress bar toward unlock.
- "Speed 8/10 vs 5/10" comparison when switching cards.
- Confirm with "Play as Engineer" and go back without losing selection.

## Step-by-step process

1. **Define each option's fantasy.** 1 role + 1 sentence + 3 stats (0–10) + difficulty (Easy/Medium/Hard). If two options read the same, redesign them before laying out.
2. **Lay out the gallery.** PC: card rail on the left, big preview + detail on the right, Confirm bottom-right. Mobile: preview on top (40%), horizontal card rail in the middle, compact detail + fixed Confirm at the bottom.
3. **Build the cards.** Each card = `Frame` + `ImageLabel` portrait or mini `ViewportFrame` + `TextLabel` name + `TextLabel` role + mini-bars for 2–3 stats + state label (Available/Level X/Paid). Selection with accent `UIStroke`.
4. **Honest compared stats.** Bars (`Frame` background + `Frame` fill at `Scale`) from 0–10 with numbers. On selection change, animate the transition with `TweenService` and mark the green/red delta vs the previous one only if it helps (max 3 stats).
5. **Preview in ViewportFrame.** A single `ViewportFrame` with the selected character's model, fixed camera, and simple lighting; slow rotation or drag to turn. No effects hiding the real look.
6. **Locks with a clear path.** Locked shows the exact requirement ("Level 8 · you're at 5" with bar, or "X Pass" with a View button opening the shop). No unexplained padlocks, no eternal "Coming soon".
7. **Explicit confirmation.** `TextButton` "Play as X" with a dynamic name; on press, brief loading + transition to lobby/match. Back preserves selection. Double-press protected with debounce.
8. **Data-driven roster.** Roster, stats, and requirements as project data tables; the UI only paints. If the server says it's locked, the UI can't pick it even if manipulated locally.
9. **Verify with 8+ characters.** Smooth scroll, preview with no drops, no truncated text on mobile, plus a test with a new account (all locked) and a veteran one (all open).

## Technical knowledge

- Card + preview (stable classes):

  ```luau
  -- Ejemplo ilustrativo: marcar una card como seleccionada
  local stroke = card:FindFirstChildOfClass("UIStroke")
  if stroke then
    stroke.Enabled = true
    stroke.Color = Color3.fromRGB(56, 225, 255)
  end
  -- El resto de cards apagan su UIStroke en la misma pasada.
  ```

- `UIGridLayout`/`UIListLayout` for the rail; horizontal `ScrollingFrame` on mobile; `UISizeConstraint` so cards don't squash.
- `ViewportFrame`: one model at a time, camera with fixed `CFrame`, plain background; avoid shadows and particles inside the preview.
- Stat bars at `Scale` (value/10) with `UICorner` and `UITextSizeConstraint` on numbers.
- Selection: local state for painting + confirmation asking the server to create/spawn with that character (check create.roblox.com/docs for the game flow). The server validates unlock and ownership.
- `TweenService` for stat transitions and card entry; `CanvasGroup` to fade preview swaps.

### Visual identity of this skill (original, do not copy)

- "Hero gallery" direction: indigo-night gradient background (#141A33→#1E2A52), graphite cards with large portrait, cyan selection accent (#38E1FF) + legendary amber (#FFC53D).
- Typography: name 18 semibold, role 13 uppercase amber, stats 12 with number on the right. Difficulty as 1 word + 3 dots, not a paragraph.
- Composition: 3:4 cards with 60% portrait, 25% stats, 15% state. 16:10 preview on PC with overlaid name at the bottom. `UIPadding` 12, `UICorner` 12.
- Spacing: 12 gap between cards, 20 between zones. Confirm at 200–260 px equivalent, 52–56 tall.
- States: hover lifts 3 px, pressed 0.97, selected with 2 px `UIStroke` + 6% brighter background, locked at 55% transparency + requirement band, loading on Confirm with spinner.
- Animation: staggered rail entry, stats sweeping 0 to value in 0.4 s, preview fade on swap. Moderate, with no dizzying loops.

## Best practices

- 3–6 options visible without scroll on PC; more than 8 needs search or role filters.
- Comparable stats (same 0–10 scale) each explained in 1 line.
- Preview faithful to the game: same model, same colors, no armor that doesn't exist.
- Locks with progress ("5/8") or exact shop price, never bare "Locked".
- Confirm always names the choice ("Play as X").
- Coherent with HUD and inventory: same stat and rarity icons.

## Common mistakes

- Made-up stats that don't match real balance and generate complaints.
- Preview with 8 simultaneous `ViewportFrame`s tanking mobile FPS.
- Letting a locked pick through by manipulating the local UI (missing server validation).
- Offset-only cards that clip on tablet or shrink tiny on PC.
- 4-line role texts nobody reads; the fantasy must fit in 1 sentence.
- Copying a famous game's gallery pixel by pixel (imitation risk; compose original).

## Quality and done criteria

- [ ] Pick + confirm completed in ≤30 s in new-user testing.
- [ ] Stats and requirements match real game data.
- [ ] Locked picks unselectable even under client manipulation (server-validated).
- [ ] 60 fps with preview active on PC and no major hitches on mobile.
- [ ] Readable on PC, tablet, and mobile with no overlaps or truncation.
- [ ] Own art direction, no copies of protected designs.

## Tools

- Studio: UI editor, `ViewportFrame` test with real models, mobile simulator.
- Studio MCP (if available): gallery + preview captures at 3 resolutions, `Output` on missing models.
- Rojo: roster (names, stats, requirements) as editable data.
- Selene: lint of the selection controller and Confirm debounce.

## Limitations

- Does not create the characters or their balance; only the screen presenting them.
- `ViewportFrame` has cost and limits (check create.roblox.com/docs); heavy models must be simplified for preview.
- Paid unlocks depend on shop and server (`roblox-shop-ui`).
- Accessible comparison must not rely on color alone (use numbers and labels).
