---
name: roblox-state-replication
description: Design multiplayer state sync with interpolation and anti-desync. Use it when you need to decide what replicates, at what rate, and how to avoid teleports and divergence.
---

# Multiplayer State Sync

## Objective

Define which state replicates, to whom, at what rate, and with what receive-side treatment (interpolation, prediction, reconciliation) so the game looks fluid and coherent without saturating the network or opening doors to cheats.

## Scope and limits

**Declared differentiation:** the installed skills `roblox-networking`, `roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems`, and `roblox-security` cover transport, teleport, matchmaking, social, and fine validation. This skill does NOT repeat transport: it covers replication-system design (what replicates, interpolation, ownership, anti-desync).

This skill does NOT do:

- Detailed anti-exploit validation → covered by `roblox-security`.
- Teleport between places or matchmaking → covered by `roblox-teleport` and `roblox-teleport-matchmaking`.
- Social or team systems → covered by `roblox-social-systems` and `Teams`.
- Post-disconnection recovery → covered by `roblox-disconnect-recovery`.

## Use cases

1. Decide what of the character, enemies, and objects replicates and what does not.
2. Fluid movement of other players without visible teleports.
3. Doors, bridges, and moving platforms identical for everyone.
4. Fast projectiles that go through walls on some screens and not others.
5. 20-player match saturating the network: cut with criteria.
6. Two clients seeing the door in different states (classic desync).

## Step-by-step process

1. **Classify state into three buckets.** Validated critical (health, inventory, score: only the server writes it), replicated visual (position, animation: replicated with tolerance), and pure local (effects, camera: never leaves the client). What you do not classify will end up replicating wrong.
2. **Assign authority per entity.** Players: their own movement with server validation; NPCs and objectives: server; decorative objects: nobody (each client simulates them). Without clear authority there are two writers and a desync.
3. **Set rate per type.** Player movement 10–20 Hz, enemies 5–10 Hz, discrete state (door open/closed) only on change, score only on change. Replicating everything at 60 Hz is the foundational mistake.
4. **Interpolate remote positions.** Never apply the received position raw: interpolate toward it with 100–200 ms delay. Illustrative example (simplified):
    ```luau
    -- Ilustrativo: suavizado de posición remota en el cliente.
    local alpha = math.clamp(dt * 10, 0, 1)
    parte.CFrame = parte.CFrame:Lerp(cframeRecibido, alpha)
    ```
5. **Define ownership with criteria.** Ownership (physical or logical) belongs to whoever simulates it best, and the server may retake it on abuse. Frequent ownership changes produce pops: minimize them.
6. **Discrete events go via `RemoteEvent`, not polling.** Door opened, round started, goal scored: one reliable event, not "ask every second". `RemoteFunction` only for questions with an immediate answer (e.g. "can I buy this?").
7. **Design anti-desync from day 1.** Version or tick number per entity; clients discard old packets; periodic server reconciliation (snapshot every 1–2 s for critical state). Without this, divergences grow silently.
8. **The server validates what matters.** Impossible positions (teleport, absurd speed), out-of-range actions, impossible sequences: the server rejects and corrects them. Validation detail belongs to `roblox-security`; here you define WHAT is validated.
9. **Optimize the worst case.** 20 players × 20 Hz × N entities: estimate the approximate bandwidth and cut (lower rate, interest radius, precision compression) before production forces you on your knees.
10. **Handle late join.** Whoever joins mid-match receives a full snapshot of visible state; without a snapshot, they see a half-built world for seconds.
11. **Test with artificial lag.** 200 ms and 5% loss: the game must degrade (smooth but delayed movement), not break (teleports, impossible states).
12. **Document the replication contract.** Table entity → what replicates → rate → authority → receive-side treatment. Without a contract, every programmer replicates their own way.

## Technical knowledge

- The server validates what matters: every critical-state write goes through the server; the client proposes, the server disposes. Use `RemoteEvent` for proposals and events, `RemoteFunction` only for queries with a response.
- Persistence: live session state is NOT persisted hot unless explicitly designed (see `roblox-disconnect-recovery`); durable progress (inventory, level) is saved with write limits, not on every tick.
- Errors: wrap snapshot serialization and sending in `pcall`; a corrupt snapshot must not kick the player, it is retried or a full one is requested again.
- `Players` and `Teams` as the basis for whom to replicate to; `MemoryStoreService` and `MessagingService` for cross-server coordination (verify exact quotas and limits in create.roblox.com/docs).
- `TeleportService` and `TeleportOptions` only to move players between places; detail belongs to `roblox-teleport`.

## Best practices

- Replicate changes, not full states, except initial snapshot or reconciliation.
- Interest radius: distant things update less or not at all.
- Discard old packets by tick; never apply history.
- One writer per critical datum; the rest are readers.
- Different rates per data type, reviewed with real measurement.
- Written, versioned replication contract.

## Common mistakes

1. Replicating everything at the same high rate → saturation.
2. Applying positions raw → teleports and jitter.
3. Two writers for the same datum → permanent desync.
4. No late-join snapshot → half-built world on entry.
5. Trusting client positions or actions without validation → cheats.
6. `RemoteFunction` for everything → cascading blocks and timeouts.
7. Not testing with lag → the first player with a bad connection breaks the match.

## Quality and done criteria

- [ ] State classified (critical / visual / local) and documented.
- [ ] Authority assigned per entity with no double writers.
- [ ] Per-type rates defined and measured in the worst case.
- [ ] Remote interpolation with no visible teleports.
- [ ] Discrete events via `RemoteEvent`, snapshot for late join.
- [ ] Server validations for impossible positions and actions.
- [ ] Artificial-lag test passed without breakage.

## Tools

- `RemoteEvent` and `RemoteFunction` as design transport.
- `Players`, `Teams` for audience and organization.
- `MemoryStoreService`, `MessagingService` for cross-server coordination (quotas: verify in create.roblox.com/docs).
- `TeleportService`, `TeleportOptions` for place changes (detail: `roblox-teleport`).

## Limitations

- Does not implement fine anti-exploit validation: defer to `roblox-security`.
- Does not do teleport, matchmaking, or social: defer to `roblox-teleport`, `roblox-teleport-matchmaking`, and `roblox-social-systems`.
- Does not cover post-crash recovery: defer to `roblox-disconnect-recovery`.
- Verify dubious quotas and members in create.roblox.com/docs.
