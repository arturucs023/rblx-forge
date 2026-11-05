---
name: roblox-private-servers
description: Design private/VIP servers with access, configuration, and moderation. Use it when you need friends-only servers, custom rules, per-server persistence, or delegated moderation.
---

# Well-Designed Private and VIP Servers

## Objective

Offer private servers that work as a product: clear access and cost,
owner configuration, persistence separated from the public one,
delegated moderation with limits, and an experience that does not break for being
"someone's server".

## Scope and limits

**Declared differentiation:** the installed skills `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems`, and
`roblox-security` cover transport, teleport, matchmaking, social, and
fine validation. This skill does NOT repeat transport: it covers private-server
systems design (access, configuration, per-server persistence,
moderation).

This skill does NOT:

- Public or ranked matchmaking → covered by `roblox-teleport-matchmaking` and
  `roblox-competitive-systems`.
- Detailed state replication → covered by `roblox-state-replication`.
- Recovery after disconnection → covered by `roblox-disconnect-recovery`.
- Cooperative gameplay systems → covered by `roblox-coop-systems`.

## Use cases

1. Friends-only server with simple invitation.
2. Owner configuring map, difficulty, or round length.
3. Community wanting its own internal league on its own server.
4. Server persistence (records, builds) separated from public.
5. Delegated moderation: the owner kicks trolls without being a global admin.
6. Private event (birthday, tournament) with no intruders.

## Step-by-step process

1. **Define the access model.** Options: invitation-only, allowlist,
   access code, or private link. Pick one and document it;
   mixing three half-done models is worse than one well done.
2. **Separate public from private configuration.** List what the owner
   can change (map, duration, difficulty, slots) and what they NEVER can (economy with
   value, rates affecting global rankings). The latter stays fixed
   by design.
3. **Design creation and lifecycle.** Create → configure → invite →
   play → close or hibernate. Define what happens to an empty private server (it shuts
   down, hibernates, persists) and who pays the cost if any.
4. **Implement robust invitations.** Invite via `Players`/`SocialService`
   (check exact members at create.roblox.com/docs); the invitation
   leads to the right server with `TeleportService`/`TeleportOptions`. Test
   inviting someone already playing on another server.
5. **Isolate persistence per server.** Private data (configuration,
   local records, builds) keyed per server, never mixed
   with global public progress. A private server must not inflate the global
   ranking.
6. **The server validates what matters.** Owner permissions, guest
   lists, and moderation actions are verified on the server on every
   operation, not once at join. Fine anti-exploit detail belongs to
   `roblox-security`.
7. **Delegate moderation with limits.** The owner can mute or
   kick from THEIR server, with an action log and no global powers.
   Permanent global bans remain the team's decision, not the owner's.
8. **Handle owner abuse.** Limits: the owner cannot grant currency,
   items, or transferable advantages to the public; valid configuration is in
   a closed list. The server rejects everything else.
9. **Design the intruder and full experience.** Clear messages ("private
   server", "server full"), and friendly redirect to public or queue
   instead of a dry error.
10. **Coordinate across servers where needed.** Active private list,
    pending invitations, or bans: use `MemoryStoreService` /
    `MessagingService` with their quotas (check
    create.roblox.com/docs). Do not reinvent a homemade bus over `DataStore`.
11. **Test the full cycle.** Create, invite, fill, kick someone,
    empty, close, reopen: each transition with its message and its correctly
    persisted state.
12. **Document rules for owners.** What they can, what they cannot, and what happens if they
    abuse. A private server with no written rules ends in support tickets.

## Technical knowledge

- The server validates what matters: server ownership, invitations, and
  every moderation or configuration action are verified on the server against
  authoritative data.
- Persistence: two separate spaces, per-server keys for private data
  and per-player keys for public data; writes with limits and retries,
  never on every tick. Wrap in `pcall` and degrade (no-save mode with
  warning) on failure.
- Errors: if resolving the destination server fails at teleport, report
  and offer an alternative (retry, go public); never leave the player in
  a loading limbo.
- `TeleportService` and `TeleportOptions` to reach the right private
  server; `Players`, `Teams`, and `SocialService` for audience and
  invitations.
- `MemoryStoreService` and `MessagingService` for ephemeral cross-server
  coordination; lasting progress goes to persistence with separate keys.

## Best practices

- One well-done access model beats three half-done ones.
- Closed list of configurable options; everything else fixed.
- Private and public with separate economies and rankings.
- Delegated moderation with a log and no global powers.
- Clear messages for intruder, full, and closed server.
- Owner rules published inside the game.

## Common mistakes

1. Mixing private data with public progress → inflation and exploits.
2. Checking permission only at join → in-session privilege escalation.
3. Owner able to grant transferable advantages → broken economy.
4. No message for a full server → the player thinks it is a bug.
5. Invitations failing when the guest is already playing.
6. Empty private server consuming resources forever → uncontrolled cost.
7. No delegated-moderation log → abuses impossible to audit.

## Quality and done criteria

- [ ] Access model defined, implemented, and documented.
- [ ] Closed list of configurable options; rest fixed and verified.
- [ ] Private persistence isolated per server, with no leaks to public.
- [ ] Permissions and moderation verified on the server on every operation.
- [ ] Intruder, full, and closed cases with correct messages and redirect.
- [ ] Create→invite→play→close→reopen cycle fully tested.
- [ ] Owner rules visible in the game.

## Tools

- `TeleportService`, `TeleportOptions` for access to the right server.
- `Players`, `Teams`, `SocialService` for audience and invitations.
- `MemoryStoreService`, `MessagingService` for cross-server coordination
  (quotas: check create.roblox.com/docs).
- `RemoteEvent` / `RemoteFunction` for server-validated configuration and moderation.

## Limitations

- No public or ranked matchmaking: defers to
  `roblox-teleport-matchmaking` and `roblox-competitive-systems`.
- No detailed replication or fine validation: defers to
  `roblox-state-replication` and `roblox-security`.
- No recovery: defers to `roblox-disconnect-recovery`.
- Check doubtful members and quotas at create.roblox.com/docs.
