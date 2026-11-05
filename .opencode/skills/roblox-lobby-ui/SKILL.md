---
name: Map and Lobby Roblox
description: Map/mode selector, lobbies, filters, and visible matchmaking. Use it when building a lobby, server list, create/join lobby, party, or queue states.
---

# Roblox Map and Lobby

## Objective

Take the player from "I want to play" to "I'm playing with people" without confusion: see maps and modes, filter lobbies, create or join in a few clicks, manage party, and always understand matchmaking state (searching, full, error).

## Scope and limits

Covers: map/mode selector, lobby listing with filters, create/join, party panel, queue states and timers, and actionable error messages.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Title main menu and news: covered by `roblox-main-menu`.
- Character/class selector: covered by `roblox-character-selector`.
- In-game HUD: covered by `roblox-hud`.
- The server-side matchmaking itself (pairing logic): the UI reflects it; logic lives on the server (see create.roblox.com/docs).

## Use cases

- Map grid (Forest, Desert, Volcano) + modes (Casual, Ranked) with counts.
- Lobby list: name, map, players 6/10, ping, Join button.
- Create lobby with name, map, privacy, and max players.
- Party of 3 friends with leader, invites, and "search match together".
- Queue with "Searching… 0:23 · Cancel" and error "Lobby full, try another".

## Step-by-step process

1. **Define the canonical flow.** Map → Mode → Lobby (join/create) → Party → Queue → Entry. Draw the 5 states and what the player sees in each; without this map the lobby accumulates dead screens.
2. **Mock up two zones.** Left: maps/modes (`UIGridLayout` of cards). Right: lobbies (`ScrollingFrame` + `UIListLayout`) + filters on top + party panel below. Mobile: Map/Lobbies/Party tabs with one visible at a time.
3. **Build map/mode cards.** `Frame` + `ImageLabel` thumbnail + `TextLabel` name + `TextLabel` meta (players/duration) + state (Available/Full/Coming soon). Selection with `UIStroke`; one active selection per axis (map + mode).
4. **Lobby list with filters.** Filters: map, mode, "only with room", "friends first", sort by players/ping. Each row: name, 6/10 with `Scale` bar, ping with color, Join button. Empty with useful message ("No lobbies with room in Forest. Create one.").
5. **Create lobby.** Modal with name (visible limit), map, mode, privacy (Public/Friends/Private), max. Validate on client (non-empty name) and on server (see create.roblox.com/docs). On create, the creator enters as leader.
6. **Party.** Panel with member slots (`ImageLabel` avatar + `TextLabel` name + ready state), Invite/Kick (leader only)/Leave buttons, and per-member Ready. The party queues together; if someone isn't ready, the UI says so with their name, not a generic error.
7. **Queue and entry.** "Searching…" state with timer, position if any, and always-available Cancel. On match: 5-4-3-2-1 countdown with "Let's go!" button and handling for no-shows. Transition with `TweenService` fade.
8. **Honest errors.** Full lobby, closed lobby, lost connection, kicked: each with cause + action (Retry / Another lobby / Create). No "Unknown error" with no next step.
9. **Verify with multi-client.** Test with 2-3 Studio clients: fill lobby, kick the leader, cancel queue, lose connection. And on the 3 resolutions with no overlaps.

## Technical knowledge

- Lobby row (stable classes):

  ```luau
  -- Ejemplo ilustrativo: pintar una fila de sala
  local row = Instance.new("Frame")
  row.Name = "RoomRow"
  row.Size = UDim2.fromScale(1, 0.12)
  row.Parent = roomList

  local joinButton = Instance.new("TextButton")
  joinButton.Name = "JoinButton"
  joinButton.Text = "Unirse · 6/10"
  joinButton.Size = UDim2.fromScale(0.26, 1)
  joinButton.Position = UDim2.fromScale(0.74, 0)
  joinButton.Parent = row
  ```

- Lists with `ScrollingFrame` + `UIListLayout` + `UIPadding`; occupancy bars at `Scale`; `UITextSizeConstraint` for long names (truncate with "…" + full tooltip).
- The UI never decides matchmaking: it requests join/create/search and paints the server response (see create.roblox.com/docs for the project's teleport/lobby APIs).
- `TweenService` for list entrance and countdown; timers with clean cancellation (leaving the queue kills the timer, no orphaned callbacks).
- `UserInputService` only for shortcuts (Esc closes modal, Enter confirms create when focus is in the name). Nothing critical keyboard-only.
- Refresh: moderate interval or server push; never request the list every frame. Define "last updated X s ago" visible if data can go stale.

### Visual identity of this skill (original, do not copy)

- "Operations board" direction: petrol-blue background (#0F1B2D), map cards with large photo and bottom band, lobbies as clear rows over dark background, green available accent (#3DDC84) / amber waiting (#FFC53D) / red full (#FF5A5A).
- Typography: map 17 semibold, lobby 14 regular, meta 12 gray tabular for 6/10 and ping. Queue timer 28 semibold centered.
- Composition: 2:3 grid (maps:lobbies) on PC; tabs on mobile. `UIPadding` 14, `UICorner` 10, 1 px `UIStroke` on selected card.
- Spacing: 10 gap in lists, 16 between zones. 64-72 px-equivalent lobby rows for touch.
- States: available (faint green border), full (dimmed + label), selected (2 px accent border), searching (spinner + time), error (1-line red band + action).
- Animation: staggered lobby entrance, slow pulse on "Searching", countdown scaling 1.1→1 per second. No aggressive flashing.

## Best practices

- Join in ≤3 clicks from map pick; Create in 1 modal, not 4 screens.
- Persistent filters between visits; visible "Clear filters" button when they filter to zero.
- Lobby names with limit and moderation: warn about publicly visible text (project text filtering; see create.roblox.com/docs).
- Party with clear leader and visible permissions (who can invite/kick).
- Consistent with menu and character selector: same cards, same buttons, same states.
- No invented figures: counts and pings only from real data or hidden.

## Common mistakes

- Leaving Join enabled on a full lobby and failing silently or with a generic error.
- Queue with no Cancel trapping the player for 2 minutes.
- Party breaking on entry and leaving a friend out with no message.
- List refreshing every second and making scroll jump or duplicating rows.
- Filters with `Offset` only overlapping on mobile.
- Trusting the UI for capacity or privacy: the server revalidates every join.

## Quality and done criteria

- [ ] Join/create/cancel work with 2-3 simultaneous clients with no broken states.
- [ ] Searching/full/error/countdown states defined and tested.
- [ ] Useful filters: with 30 lobbies a slot is found in <15 s.
- [ ] Readable on PC, tablet, and mobile with no overlaps; touch ≥48 px per action.
- [ ] No console errors or orphaned callbacks on cancel.
- [ ] Original texts and documented name moderation.

## Tools

- Studio: Play with several clients, mobile simulator, `Output` for failed joins.
- Studio MCP (if available): captures of maps/lobbies/party on 3 resolutions.
- Rojo: lobby maps, modes, and texts as editable data.
- Selene: lint join/create/cancel handlers and timers.

## Limitations

- Real matchmaking, capacity, and privacy are enforced by the server (see create.roblox.com/docs); the UI only reflects them.
- Pings and counts depend on the project backend; without backend only sample data.
- Lobby names and chat subject to text filtering (see create.roblox.com/docs).
- Performance with hundreds of lobbies needs pagination; this skill anticipates it but the backend must support it.
