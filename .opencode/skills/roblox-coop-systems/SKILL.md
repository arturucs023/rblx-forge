---
name: roblox-coop-systems
description: Design cooperative play with revive, loot sharing, and objectives. Use it when you need down-but-not-out, shared loot, scaled difficulty, or team objective sync.
---

# Cooperative systems that unite instead of frustrating

## Objective

Build real cooperation: reviving teammates, fight-free loot sharing, difficulty that scales with the group, synchronized objectives, and assists that reward playing together instead of punishing the player who drops or arrives late.

## Scope and limits

**Stated differentiation:** the installed skills `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems`, and
`roblox-security` cover transport, teleport, matchmaking, social, and
fine-grained validation. This skill does NOT repeat transport: it covers cooperative system design
(revive, loot sharing, scaled difficulty, objective
sync).

This skill does NOT do:

- Moment-to-moment replication → covered by `roblox-state-replication`.
- Recovery after disconnect → covered by `roblox-disconnect-recovery`.
- Private servers as a product → covered by `roblox-private-servers`.
- Competitive and ranked → covered by `roblox-competitive-systems`.

## Use cases

1. Down-but-not-out system with 5 s teammate revive.
2. Loot shared so the fastest player doesn't take everything.
3. Dungeon that scales enemies for 1, 2, 3, or 4 players.
4. Team objective ("activate 3 levers at once") synchronized.
5. Friend joining mid-mission without breaking it.
6. Group where one is level 50 and another level 5, and both have fun.

## Step-by-step process

1. **Define the cooperative fantasy.** Heroes who rescue each other, tactical
   team, or chill friends? Dramatic revive fits the first; strict
   distribution fits the second. Without a clear fantasy, systems clash.
2. **Design the down-and-revive loop.** States: healthy → down (revivable,
   time limit) → out (waits or spectates). Explicit times, revive distance, and
   cost (vulnerability of the reviver). Illustrative example:
   ```luau
   -- Ilustrativo: máquina de estados del caído (tiempos en segundos).
   local FASES = { Sano = 0, Caido = 1, Fuera = 2 }
   local TIEMPO_REANIMAR = 5
   local TIEMPO_SANGRADO = 30 -- caído sin ayuda -> fuera
   ```
3. **The server validates what matters.** Downs, revives, distribution, and progress
   of objectives are resolved on the server with `RemoteEvent`; the client asks
   and animates, the server authorizes. Fine-grained exploit handling: `roblox-security`.
4. **Pick the loot model.** Options: instanced per player (each sees
   their own, zero conflict), round-robin, or need/greed with
   voting. For most games, instanced loot + optional trading
   causes fewer fights than any vote.
5. **Scale difficulty with the group.** Explicit formula (e.g. enemy health
   ×(1 + 0.35 per extra player), capped at N). Document the
   formula; eyeballed difficulty always breaks at some size.
6. **Sync objectives on the server.** Team progress (levers,
   keys, bosses) as server state replicated to everyone; late joiners
   receive a progress snapshot (`roblox-state-replication`,
   `roblox-disconnect-recovery` for the return).
7. **Handle disparate levels.** Level bands per mission, gentle scaling of the
   weak player upward (never humiliatingly capping the strong one downward), and
   rewards useful to both. Without this, inviting a new friend is a
   punishment.
8. **Design assists, not punishments.** Bonus for revives, team combos, reviving
   grants points: reward cooperating instead of penalizing not doing so. Punishments
   for "not helping" breed toxicity, not teamwork.
9. **Resolve the final question: what if everyone goes down?** Wipe with retry
   from checkpoint, never from zero unless it's a stated roguelike design.
   Generous checkpoints = friends who keep playing.
10. **Organize with `Teams` where it fits.** Teams, roles, and friendly fire
    (usually off in coop) with `Teams` and `Players`; persistent
    social (groups, friends) belongs to `roblox-social-systems`.
11. **Test with real groups.** Solo, duo, trio, full; one veteran + one
    newcomer; one dropping mid-boss. Each combination reveals a different
    design bug.
12. **Measure cooperation.** Revives per session, contested loot (zero is the
    goal with instanced loot), mid-mission abandonment. If nobody revives,
    the revive is badly designed, not the players.

## Technical knowledge

- The server validates what matters: down states, revive eligibility
  (distance, time, interruptions), distribution, and objectives. All with
  server authority.
- Persistence: lasting cooperative progress (completed missions,
  rewards) per player with limited writes; in-progress mission state is
  ephemeral and lives on the server, with a snapshot for late joiners.
- Errors: if reward saving fails, retry with backoff and don't
  duplicate (idempotency as in `roblox-disconnect-recovery`); `pcall` on
  distribution and save paths.
- `Players` and `Teams` for organization; `RemoteEvent` for proposals and
  `RemoteFunction` only for queries with an immediate response.
- Cross-server coordination only if the design requires it
  (`MemoryStoreService` / `MessagingService`, quotas: verify at
  create.roblox.com/docs).

## Best practices

- Instanced loot by default; voting only if the genre demands it.
- Scaling formula written down, with a cap and tested at each size.
- Revive fast to execute and clear to read (ring, bar, sound).
- Visibly reward helping; never punish its absence.
- Wipe with generous checkpoint, never cruel restart by default.
- Level bands so inviting newcomers doesn't punish.

## Common mistakes

1. Single loot item taken by the fastest → end of the friendship.
2. Fixed difficulty: trivial in a group, impossible solo.
3. Revive so slow or risky nobody uses it.
4. Objectives with progress on a single client → mission desync.
5. Capping the veteran to "equalize" → the veteran stops coming.
6. Wipe from zero without warning → mass abandonment.
7. Client deciding its own revive or loot → direct exploit.

## Quality and done criteria

- [ ] Healthy→down→out cycle with documented times and costs.
- [ ] Loot model chosen and implemented without disputes in testing.
- [ ] Scaling formula written and tested at each group size.
- [ ] Objectives as server state with snapshot for late joiners.
- [ ] Disparate levels handled (bands or gentle scaling).
- [ ] Wipe with checkpoint and assists that reward cooperating.
- [ ] Everything critical validated on the server; healthy coop metrics.

## Tools

- `Players`, `Teams` for team organization and roles.
- `RemoteEvent` / `RemoteFunction` for server-validated actions.
- `SocialService` to invite friends (fine-grained social:
  `roblox-social-systems`; members: verify at
  create.roblox.com/docs).
- `TeleportService`, `TeleportOptions` if the mission moves places
  (detail: `roblox-teleport`).

## Limitations

- Does not do fine-grained replication or recovery: see
  `roblox-state-replication` and `roblox-disconnect-recovery`.
- Does not do persistent social or fine-grained validation: see
  `roblox-social-systems` and `roblox-security`.
- Does not design competitive: see `roblox-competitive-systems`.
- Verify doubtful members and quotas at create.roblox.com/docs.
