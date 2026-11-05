---
name: roblox-disconnect-recovery
description: Design reconnection and state recovery after drops. Use it when you need reconnect to the match, safe state saving, or rejoin without losing progress.
---

# Disconnects and recovery without drama

## Objective

Make a drop not be a sentence: detect the disconnect, protect player
state (safe save), allow rejoin to the same match when it makes
sense, and leave the rest of the match in a coherent state while
waiting.

## Scope and limits

**Stated differentiation:** the installed skills `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems`, and
`roblox-security` cover transport, teleport, matchmaking, social, and
fine-grained validation. This skill does NOT repeat transport: it covers recovery system design
(reconnect, safe state, rejoin to a match).

This skill does NOT do:

- Moment-to-moment replication → covered by `roblox-state-replication`.
- Base teleport between places → covered by `roblox-teleport`.
- Private servers as a product → covered by `roblox-private-servers`.
- Re-entry balance in competitive (penalties, ELO) → covered by
  `roblox-competitive-systems`.

## Use cases

1. Player losing wifi for 30 s and returning to the same match.
2. Client crash in the middle of a dungeon without losing earned loot.
3. Rage-quit disguised as a "disconnect": telling them apart honestly.
4. Cooperative match left 3 against 5 by two dropped players.
5. Safe save that doesn't duplicate items on re-entry.
6. Mobile switching networks and the session flickering.

## Step-by-step process

1. **Distinguish exit types.** Clean exit, network timeout, and ban
   are different cases: the first frees resources now; the second opens
   a grace window; the third deserves no rejoin. Treating them the same breaks all
   three.
2. **Define the grace window.** Time during which the seat
   and state are reserved (e.g. 2–5 min depending on mode). Without a window, there is no rejoin; with an
   infinite window, seats rot.
3. **Save state safely on the server.** On drop, the server
   persists what was earned (progress, loot, score) with a single
   idempotent write: re-running the save duplicates nothing. Illustrative example
   (simplified):
   ```luau
   -- Ilustrativo: guardado idempotente con llave de sesión.
   local llave = "save:" .. userId .. ":" .. sessionId
   if not yaGuardado[llave] then
     yaGuardado[llave] = true
     guardarProgreso(userId, snapshot) -- con pcall y reintento
   end
   ```
4. **Reserve the seat, not the universe.** During the grace period, the seat stays
   marked as "reserved for X"; after the deadline, it is freed and the state
   becomes abandoned. Document the deadline visibly.
5. **Implement rejoin to the same match.** Re-entry with
   `TeleportService`/`TeleportOptions` to the origin server while still
   alive; if it died, rejoin the equivalent mode with safe progress
   restored. Test the "server no longer exists" case.
6. **The server validates what matters.** Every restore is verified on the
   server (identity, session key, server-signed snapshot,
   never client-signed). The client asks; the server authorizes or denies.
7. **Protect the rest of the match.** Dropped player: their character is
   frozen, handed to a simple bot, or removed depending on the mode; never left
   as free points or an eternal invisible wall.
8. **Avoid rejoin dupes.** Inventory and currency are reconciled via
   server snapshot with idempotency; the client never "brings back" items.
   Test the fast double rejoin: that's the case that creates duplicates.
9. **Report honestly.** "Connection lost, retrying (seat
   reserved 3:00)" is good; an eternal spinner is bad. If the match
   ended, say so and show the saved result.
10. **Handle mobile network flicker.** Reconnections of a few seconds must not
    trigger the whole protocol: threshold (e.g. 10–15 s) below which
    only light state is re-synced (`roblox-state-replication`).
11. **Test the five scenarios.** Clean exit, timeout with on-time return,
    timeout with late return, dead server, fast double rejoin.
    All five, not just the happy path.
12. **Log and measure.** Successful rejoin rate, mean time to return,
    detected dupes (zero is the only acceptable number). Without metrics,
    recovery silently rots.

## Technical knowledge

- The server validates what matters: identity, current grace window, and
  own-authority snapshot before restoring anything.
- Persistence: idempotent safe save with session key; limited
  writes with retry; mandatory `pcall` on every save path
  because drops and save failures usually arrive together.
- Errors: if saving fails, retry with backoff and warn; if the
  destination server died, degrade to restoring progress in equivalent mode.
- `TeleportService` and `TeleportOptions` for rejoin; `Players` to
  detect exits; `MemoryStoreService` / `MessagingService` for reserved
  seats and cross-server coordination (quotas: verify at
  create.roblox.com/docs).
- Light re-sync state: contract with
  `roblox-state-replication` (snapshot on return).

## Best practices

- Explicit grace window per game mode, visible to the player.
- Idempotency in every save and restore: double rejoin duplicates nothing.
- Dropped character with dignified handling (freeze, bot, or removal).
- Honest messages with countdown and plan B.
- Anti-flicker threshold before the full protocol.
- Recovery metrics from day 1.

## Common mistakes

1. Treating clean exit, timeout, and ban the same.
2. Non-idempotent save → double rejoin duplicates items.
3. Restoring state brought by the client → gift to cheaters.
4. Eternally reserved seat → matches that never fill.
5. Dropped character as free points or an eternal wall.
6. No plan B if the origin server died → player in limbo.
7. Mobile flicker triggering the full protocol every time.

## Quality and done criteria

- [ ] Grace window defined per mode and communicated to the player.
- [ ] Idempotent safe save tested with fast double rejoin.
- [ ] Rejoin to origin working and plan B if the server died.
- [ ] Restore validated on server; no client authority.
- [ ] Match coherent during the absence (bot/freeze/remove).
- [ ] Five test scenarios passed.
- [ ] Rejoin metrics and zero dupes verified.

## Tools

- `TeleportService`, `TeleportOptions` for rejoin to the origin server.
- `Players` for exit detection and seat reservation.
- `MemoryStoreService`, `MessagingService` for ephemeral coordination
  (quotas: verify at create.roblox.com/docs).
- `RemoteEvent` for recovery status messages to the client.

## Limitations

- Does not do fine-grained replication: see `roblox-state-replication`.
- Does not do base teleport or matchmaking: see `roblox-teleport` and
  `roblox-teleport-matchmaking`.
- Does not balance competitive penalties: see
  `roblox-competitive-systems`.
- Verify doubtful members and quotas at create.roblox.com/docs.
