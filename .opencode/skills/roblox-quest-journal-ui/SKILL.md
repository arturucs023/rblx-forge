---
name: Roblox Quest Journal
description: Quest list, detail, tracking, and rewards. Use it when you create a quest log, objective tracking, progress bars, or reward claims.
---

# Roblox Quest Journal

## Objective

Turn the quest list into a clear plan: what to do now, how much is left, and what you earn. Covers the full journal (list + detail + rewards) and its minimal reflection in the HUD, with progress always visible and honest.

## Scope and limits

Covers: quest list (active/available/completed), detail panel with steps and rewards, HUD tracking, progress bars, and claim states.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior quest UX design: covered by `roblox-game-ux`; this skill implements.
- Isolated objective micro-chip in HUD: covered by `roblox-hud` (connected here).
- Shop: covered by `roblox-shop-ui`.
- NPC dialogue: covered by `roblox-dialogue-ui` (here only how a quest enters/leaves the journal).

## Use cases

- Journal with Active (3), Available (2), and Completed with scroll.
- Detail "Collect 8 crystals · 5/8" with bar and "200 gold + sword" reward.
- HUD tracking "Crystals 5/8" with an "Untrack" button.
- Claim with celebration and "Reward claimed".
- Daily quest with "Renews in 04:12:33" timer.

## Step-by-step process

1. **Define each quest's lifecycle.** Available → Active → Steps → Turn-in → Reward. Each quest has 1-4 visible steps and 1 explicit reward. If it does not fit on 1 detail screen, split it.
2. **Mock up two columns.** Left: list with Active/Available/Completed tabs (`ScrollingFrame` + `UIListLayout`). Right: detail (title, 2-line description, steps with checks, bar, rewards, Follow/Abandon/Turn-in buttons). Mobile: full-screen list, detail as a sheet with a Back button.
3. **Build the list.** Each row = `Frame` + `ImageLabel` icon + `TextLabel` title + `TextLabel` progress ("5/8") + mini-bar at `Scale` + type badge (Main/Side/Daily). The tracked quest has a visible mark.
4. **Detail with steps.** Steps as check lists (`TextLabel` + "✓/·"), main progress bar, rewards with icons and counts, and lore in 1-2 lines max. Contextual buttons: Accept / Follow / Unfollow / Abandon (with confirmation) / Turn in.
5. **HUD tracking.** Only 1 tracked quest at a time (or 2 documented max): chip with title + progress + optional distance. Switching the tracked quest in 1 click from the journal. The chip never shows spoilers of future steps.
6. **Progress and turn-in.** Bars at `Scale` with numbers ("5/8", "73%"), animated with `TweenService` as they advance. Turn-in available with a highlighted button + celebration (check + listed rewards). Unclaimed reward with a dot until claimed.
7. **Timed and daily quests.** Readable timer ("Renews in 04:12") and expired state with a clear message. Never delete progress without warning with a 1-line consequence note.
8. **Visible persistence.** Accept/advance/turn-in asks the server (verify in create.roblox.com/docs); the UI shows "Saving…" where applicable and rolls back on failure. Rejoining keeps accepted quests and validated progress.
9. **Verify the full cycle.** Accept, track, advance 3 steps, abandon one, turn in another, rejoin. On PC and mobile, without truncations or overlaps, with 20+ quests in the list.

## Technical knowledge

- Row + bar (stable classes):

  ```luau
  -- Ejemplo ilustrativo: actualizar progreso de misión
  local fill = questRow:WaitForChild("ProgressFill") :: Frame
  local label = questRow:WaitForChild("ProgressLabel") :: TextLabel

  local function setProgress(current: number, goal: number)
    local t = math.clamp(current / math.max(1, goal), 0, 1)
    fill.Size = UDim2.fromScale(t, 1)
    label.Text = string.format("%d/%d", current, goal)
  end
  ```

- `ScrollingFrame` with `UIListLayout` for list and steps; `UIPadding`, `UICorner` 8-10, `UIStroke` by type (main amber, side gray, daily cyan).
- Tracking: the selection lives in a local attribute/state and the HUD reads it; switching is instant and local (real progress still comes from the server).
- `TweenService` for bar advances and turn-in celebration (0.4 s check + reward fade).
- Abandoning requires confirmation if there is progress; Accept/Turn-in with debounce to avoid double requests.
- Text with `UITextSizeConstraint`; descriptions with `TextWrapped` and a 2-3 line limit with "…" (verify in create.roblox.com/docs for exact truncation).

### Visual identity of this skill (original, do not copy)

- "Expedition notebook" direction: dark parchment background (#1B2036) with paper cards (#F5EFD8) for detail or a coherent dark scheme; compass amber accent (#FFB84D) + completed green (#3DDC84).
- Typography: quest title 18 semibold, steps 14 regular with check, rewards 14 bold with icon, lore 13 brief italic. Tabular progress numbers.
- Layout: list 35% / detail 65% on PC; 8-10 px bars with faint background and amber fill; rewards in icon chip rows. `UIPadding` 14, gap 10.
- Spacing: steps 8 px apart, sections 16 apart. 48+ px buttons on mobile.
- States: active (amber border), tracked (mark + cyan border), completed (green check + dimmed), available (normal), level-locked (gray + requirement), expired (faint red + message).
- Animation: bar that sweeps on advance, check that appears with 0.6→1 scale, single-pulse turn-in. No 3-second fanfares that block.

## Best practices

- 1 tracked quest by default (the active main one); switch in 1 click.
- Progress always with a number, not just a bar ("5/8" required).
- Rewards visible before accepting; no fine print.
- Abandoning explains what is lost in 1 line; turn-in celebrates on 1 screen, not 3.
- Consistency with HUD and inventory: same item and currency icons.
- Daily/weekly quests grouped with a timer, not mixed unlabeled.

## Common mistakes

- Journal with 40 quests, no tabs, no tracking, that nobody uses.
- Bars with no number that never say how much is really left.
- Step-5 spoilers visible in the HUD since step 1.
- Turning in without server confirmation and losing the reward on rejoin.
- Abandoning without confirmation and deleting 2 hours of progress.
- Detail with only `Offset` that cuts off the reward on mobile.

## Quality and done criteria

- [ ] Accept→track→advance→turn-in cycle tested with real data, including rejoin.
- [ ] Numeric progress + bar in list, detail, and HUD, consistent with each other.
- [ ] Clear single tracking, switchable in 1 click, no spoilers.
- [ ] Readable with 20+ quests on PC, tablet, and mobile.
- [ ] No duplicates or losses under double-click or high latency.
- [ ] Brief turn-in celebration with explicitly listed rewards.

## Tools

- Studio: Play with server for accept/turn-in, mobile simulator for detail sheet.
- MCP Studio (if available): list+detail+HUD captures at 3 resolutions.
- Rojo: quests (titles, steps, rewards) as editable data.
- Selene: lint of accept/track/turn-in handlers and debounces.

## Limitations

- Quest and reward logic lives on the server (verify in create.roblox.com/docs); the UI only presents it.
- Does not include NPC dialogue (`roblox-dialogue-ui`) or cinematics.
- Daily/weekly timers depend on the server clock, not the client.
- With hundreds of quests pagination/search is required; the backend must support it.
