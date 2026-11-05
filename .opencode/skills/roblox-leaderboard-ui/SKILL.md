---
name: Roblox Leaderboards
description: Ranking tables, global/friends tabs, and pagination. Use it when building rankings, player stats, weekly tops, or visual anti-spoof.
---

# Roblox Leaderboards

## Objective

Show who is winning in a credible, motivating way: readable rankings, global/friends/season tabs, pagination that doesn't lie, and your own position always visible. The table informs, never invents or exposes sensitive data.

## Scope and limits

Covers: ranking table, tabs (Global/Friends/Season), pagination and light virtualized scroll, highlighted own row, top-3 podium, and visual anti-spoof rules.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Real ranking computation or anti-cheat: lives on the server (see create.roblox.com/docs); here only honest presentation.
- In-game HUD: covered by `roblox-hud`.
- Full player profile or inventory: `roblox-inventory-ui` and profile screens.

## Use cases

- Weekly top 100 with Global / Friends / My position tabs.
- 1-2-3 podium with avatars + 4-50 table with scroll.
- Own row pinned at the bottom "You · #47 · 12,400 pts" even outside the visible top.
- Season "Ends in 6 days" with bracket rewards.
- "No friend data yet. Invite and compete." state instead of an empty table.

## Step-by-step process

1. **Define what you rank.** 1 metric per table (Cups, Wins, Season points). No "mystery ranking" with a hidden formula; if there is a formula, explain it in 1 line.
2. **Mock up tabs + table.** Header with tabs (`TextButton`s Global/Friends/Season) + season/timer; optional podium on top; `ScrollingFrame` with rows; footer with own pinned row. Mobile: tabs on top, compact podium, full-width table.
3. **Build the row.** `Frame` + `TextLabel` position (#1) + `ImageLabel` avatar (or initial) + `TextLabel` name (truncated) + `TextLabel` tabular value + change (up 2/down 1/flat) with shape as well as color. Own row with accent background.
4. **Top-3 podium.** Three columns with heights 1st > 2nd > 3rd, avatar + name + value. No crowns copied from famous games: compose your own medal (circle + number + sober gold/silver/bronze color).
5. **Honest pagination.** 20-50 page with "Load more" or paged scroll; show "Top 100 · showing 1-20" and the real total. Never invent filler rows or repeat names to "fill up".
6. **Own row always visible.** Even at #4,217, the footer shows your position and neighbors (±2) with a "Go to my position" button. With no position (new player), "Play your first match to enter".
7. **Visual anti-spoof.** Names truncated with full tooltip, no arbitrary HTML or images in names (the server sanitizes; see create.roblox.com/docs for filtering), values with consistent format ("12,400", not mixed "12400"), and a "data from X s ago" mark.
8. **Season and rewards.** If there is a season: name, exact end, bracket with visible reward ("Top 10: golden frame"). At the end: "Finished · results under review" state instead of freezing numbers with no explanation.
9. **Verify with extreme data.** Very long names, 500 rows, no friends, tied points, lost connection. On 3 resolutions, no overlaps and smooth scroll.

## Technical knowledge

- Ranking row (stable classes):

  ```luau
  -- Ejemplo ilustrativo: pintar una fila del leaderboard
  local row = Instance.new("Frame")
  row.Name = "RankRow_04"
  row.Size = UDim2.fromScale(1, 0.08)
  row.Parent = tableList

  local posLabel = Instance.new("TextLabel")
  posLabel.Name = "Position"
  posLabel.Text = "#4"
  posLabel.Size = UDim2.fromScale(0.12, 1)
  posLabel.Parent = row
  -- Avatar (ImageLabel), nombre y valor siguen el mismo patrón Scale.
  ```

- `ScrollingFrame` + `UIListLayout` with simple reuse (row pool) for 100+; `UIPadding`, `UICorner` 8, faint `UIStroke` on own row.
- Tabs: switch data source and repaint; keep the active tab and scroll position per tab.
- Data from the server or project configuration (see create.roblox.com/docs); the UI defines timeout (3 s), retry, and freshness mark ("updated 12 s ago").
- Consistent numeric format in a single local helper; dates/timers with explicit text, no jargon.
- `TweenService` only for podium entrance and own-row highlight; the table doesn't animate every row on scroll.

### Visual identity of this skill (original, do not copy)

- "Sober stadium" direction: night background (#10182E), table in subtle alternating rows, gold/silver/bronze only on top-3 (#FFD166/#C9D4E3/#E0A173), cyan accent for "you" (#38E1FF).
- Typography: position 16 extra-bold tabular, name 14 semibold, value 15 bold tabular right-aligned, change 12 with symbol + color. All with `UITextSizeConstraint`.
- Composition: 3-column podium on top (PC) or compact horizontal (mobile), table with 10% / 15% / 50% / 25% columns. `UIPadding` 12, gap 6.
- Spacing: 52-60 px-equivalent rows, podium with 16 air. Names truncated with "…" + tooltip.
- States: you (12% cyan background + border), top-3 (own medal), rising/falling (up/down + green/red + text, not color alone), loading (row skeletons), empty (textual illustration + action), error (band + Retry).
- Animation: 0.3 s podium entrance, single own-row highlight pulse. The table doesn't flicker on refresh: update values, don't rebuild everything.

## Best practices

- One metric per table with a 1-line explanation ("Season points · +10 per win").
- Your position always visible, even outside the top.
- Visible freshness ("12 s ago") and Retry on error; no frozen numbers without warning.
- Safe names: truncate, sanitize, and never execute arbitrary formatting.
- Consistent with the rest: same avatars, same numbers, same change colors.
- Seasons with explicit start/end and rewards; no eternal "soon".

## Common mistakes

- Inventing rows or repeating players so the table "looks full".
- Showing own position computed on the client and different from the server's.
- Table with no pagination that instantiates 1,000 rows and freezes mobile.
- Very long names breaking columns from `Offset`-only use.
- Changes by color only (up/down with no symbol or text) unreadable for color-blind players.
- Exposing IDs, personal data, or sensitive stats in the row.

## Quality and done criteria

- [ ] Global/Friends/Season tabs with full/empty/error states tested.
- [ ] Own row consistent with the server in a multi-client test.
- [ ] 200+ rows with smooth scroll on mid-range mobile (pool or pagination).
- [ ] Extreme names, ties, and disconnects handled without breaking layout.
- [ ] Readable on 3 resolutions with aligned tabular numbers.
- [ ] No invented data or sensitive information exposure.

## Tools

- Studio: Play with several clients, mobile simulator, `Output` for missing data.
- Studio MCP (if available): captures of podium + table on 3 resolutions.
- Rojo: texts, metrics, and season brackets as editable data.
- Selene: lint row painting and pagination.

## Limitations

- Real ranking, anti-cheat, and persistence live on the server (see create.roblox.com/docs).
- Avatars and names depend on platform services; plan an initial fallback.
- Real update timing is defined by the backend; the UI only states freshness.
- No detailed player profile or match history.
