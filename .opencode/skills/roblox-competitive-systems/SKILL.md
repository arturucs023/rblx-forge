---
name: roblox-competitive-systems
description: Design fair competitive play with simple ranked and clean finals. Use it when you need balanced matchmaking, simple ELO, basic anti-smurf, or tiebreakers.
---

# Fair and believable competitive systems

## Objective

Build competition that feels fair: balanced matchmaking, simple and transparent ranking, basic defenses against smurfs and leavers, and finals (tiebreakers, overtime) that crown the best without controversy.

## Scope and limits

**Stated differentiation:** the installed skills `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems`, and
`roblox-security` cover transport, teleport, technical matchmaking, social, and
fine-grained validation. This skill does NOT repeat transport: it covers competitive
system design (fair matchmaking, ranked/simple ELO, basic anti-smurf,
finals).

This skill does NOT do:

- Technical teleport or base queue implementation → covered by
  `roblox-teleport` and `roblox-teleport-matchmaking`.
- Low-level anti-cheat → covered by `roblox-security`.
- Cooperative vs environment → covered by `roblox-coop-systems`.
- Private servers as a product → covered by `roblox-private-servers`.

## Use cases

1. 1v1 or 5v5 with matchmaking by visible level.
2. League with simple ELO points the player understands.
3. Smurfs crushing newcomer matches: slowing them down without CAPTCHAs.
4. Match left 4 against 5 by a leaver: resolving it fairly.
5. Tied final that needs a fast, clean tiebreaker.
6. Season with a reset that doesn't drive away casuals.

## Step-by-step process

1. **Define what skill measures.** One primary metric (ELO or internal MMR)
   and at most two secondary ones (streak, account level). Ten
   metrics = no metric.
2. **Implement simple, transparent ELO.** Classic formula with visible K
   (e.g. K=32), points gained/lost shown after each match.
   Illustrative example (simplified):
   ```luau
   -- Ilustrativo: actualización ELO simple (K fija, 1 = victoria).
   local K = 32
   local esperada = 1 / (1 + 10 ^ ((eloRival - eloPropio) / 400))
   eloPropio = math.round(eloPropio + K * (resultado - esperada))
   ```
3. **Design fair matchmaking.** Search range that widens over time
   (starts ±100, grows every 30 s), stated wait cap, and
   priority for balanced matches over fast matches when the
   mode is ranked.
4. **The server validates what matters.** Results, ELO, and rewards are
   resolved on the server with `RemoteEvent`; the client displays, never dictates
   the score. Fine-grained anti-cheat: `roblox-security`.
5. **Add basic anti-smurf.** New accounts: high uncertainty (higher K,
   5–10 match calibration) + soft restriction (no ranked until N
   normal matches or minimum level). Don't try to detect the perfect smurf;
   make smurfing boring (climb fast to where you belong).
6. **Handle leaving fairly.** Leaving ranked: recorded loss
   + growing queue penalty; abandoned team: mitigated loss (loses less ELO) and flagged match. No mercy for the one who
   leaves, no full punishment for those who stay.
7. **Design finals and tiebreakers.** Rules written before the first
   complaint: overtime, extra rounds, criteria (rounds won, damage, time).
   The tiebreaker is announced in UI before it starts, never improvised mid-tie.
8. **Separate ranked from casual.** Different queues, different rules (casual
   leaving = no drama, replacement with bot if it fits). Mixing them pollutes
   both.
9. **Design the season and reset.** Soft reset (compression toward the mean,
   not to zero), rewards for peak reached (not farmable final
   position) and visible calendar. Reset to zero drives away casuals; no reset
   stagnates the ladder.
10. **Coordinate matches across servers.** Lobbies, results, and bans with
    `MemoryStoreService` / `MessagingService` per quotas (verify at
    create.roblox.com/docs); moves with `TeleportService` /
    `TeleportOptions` (detail: `roblox-teleport-matchmaking`).
11. **Test with simulated populations.** Few players (wide ranges),
    many (fine matchmaking), smurf wave, leaver cascade.
    Matchmaking breaks at the extremes, not at the average.
12. **Publish the rules.** How ELO is earned, what happens on leave, how ties break.
    Visible rules = short disputes; hidden rules = "the game
    is rigged".

## Technical knowledge

- The server validates what matters: matchmaking, results, ELO, and
  penalties. No competitive number originates on the client.
- Persistence: ELO, history, and bans per player with limited writes
  (at match end, not per tick); `pcall` + retry on every write
  because losing a result means losing trust.
- Errors: if result saving fails, keep it in server memory
  and retry; show "result pending" instead of inventing a
  tie.
- `Players` and `Teams` for sides and lobbies; `TeleportService` /
  `TeleportOptions` to carry players to the lobby; `MemoryStoreService` /
  `MessagingService` for coordination (quotas: verify at
  create.roblox.com/docs).
- Leaderboards: persist and recalculate on the server with windows
  (daily/weekly/season) so you don't recalculate the universe on every match.

## Best practices

- Simple ELO explained on one screen; if it needs a manual, it's too complex.
- Matchmaking range that grows with wait time, with an honest cap.
- Calibration for newcomers + ranked locked until minimum experience.
- Leaving: harsh on the leaver, lenient on those who stay.
- Tiebreakers written and visible before the first tie.
- Soft reset per season, never to zero.

## Common mistakes

1. Client reporting the result → farmable ELO in one afternoon.
2. No calibration: the smurf cruises through 30 newcomer matches.
3. Reset to zero → the casual base doesn't return for season 2.
4. Improvised tiebreaker → controversy and bad viral clips.
5. Mixing ranked and casual in the same queue → nobody happy.
6. Penalizing the abandoned team as if it had lost a fair 5v5.
7. Recalculating global rankings on every match → write collapse.

## Quality and done criteria

- [ ] Primary metric + simple ELO with published formula and K.
- [ ] Matchmaking with expanding range and stated wait cap.
- [ ] Calibration and ranked restriction for new accounts.
- [ ] Leaving handled (penalty + mitigation for the team) and tested.
- [ ] Finals and tiebreakers written, visible, and tested while tied.
- [ ] Separate ranked/casual queues; season with soft reset.
- [ ] Results and ELO resolved and persisted on the server only.

## Tools

- `Players`, `Teams` for sides, lobbies, and distribution.
- `TeleportService`, `TeleportOptions` for match lobbies
  (detail: `roblox-teleport`, `roblox-teleport-matchmaking`).
- `MemoryStoreService`, `MessagingService` for cross-server coordination
  (quotas: verify at create.roblox.com/docs).
- `RemoteEvent` for server-validated results and scores.

## Limitations

- Does not implement base queues or technical teleport: see
  `roblox-teleport-matchmaking` and `roblox-teleport`.
- Does not do low-level anti-cheat: see `roblox-security`.
- Does not design coop or private servers: see `roblox-coop-systems` and
  `roblox-private-servers`.
- Verify doubtful formulas, members, and quotas at create.roblox.com/docs.
