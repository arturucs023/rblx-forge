---
name: roblox-multiplayer-testing
description: Multiplayer testing with 2+ clients (replication, races, poor network). Use it when validating authority, concurrency, or device matrix before release.
---

# Multiplayer Testing

## Objective
Validate the game with 2+ real clients before release: server authority, minimal replication, race conditions, and behavior on poor networks and different devices, with reproducible scenarios and pass/fail criteria.

## Scope and limits
Differentiation: `roblox-testing` (installed) defines general QA and `roblox-testez` covers unit tests with mocks; this skill is hands-on multi-client practice (2+ clients, races, network). `roblox-networking` designs replication; here it is verified. `roblox-ui-testing` verifies screens; here concurrency is verified.

What it does NOT do:

- It does NOT design the networking protocol (see `roblox-networking`).
- It does NOT replace unit tests (see `roblox-testez`).
- It does NOT automate an external device farm; it defines the minimum matrix runnable from Studio/available devices.

## Use cases
1. Two players grab the same pickup at once: only one gets it.
2. Simultaneous purchase with barely enough funds: no currency or item duplication.
3. Player who joins late receives consistent state (round, inventory).
4. Poor network (simulated latency/loss): no teleports or advantages.
5. Massive join/leave during intermission without breaking the round.

## Step-by-step process
1. Define scenarios with an oracle: initial state, actions per client with timing, exact expected result (who gets what, what each one sees).
2. Spin up a session with 1 server + 2-4 clients (multi local playtest or devices). Assign roles: A acts, B competes/observes, C joins late.
3. Run deliberate races: same action on the same tick (pickup, purchase, vote). Repeat 10 times; the result must be deterministic with a single winner.
4. Verify authority: attempt cheating from a client (amounts, positions) and confirm rejection + log. No client decides economy or damage.
5. Test late join and rejoin: join mid-round, leave and come back; compare their state against the oracle (inventory, pity, round).
6. Simulate poor network (throttling/latency where the tool allows it) and repeat 2 critical scenarios; record visible desyncs and convergence time.
7. Run the minimum device matrix: PC + mobile (or low/high quality). Verify playable FPS, legible UI, and identical scenario results.
8. Record evidence per scenario: pass/fail, relevant server logs, capture if there is visible divergence.
9. Turn each failure into a regression: first repro in `roblox-testez` if it is unit-testable; if it is a pure race, leave a written scenario + fix + 10x re-run.

## Technical knowledge
- Authority: the server is the single source of truth for economy, inventory, and damage. The client predicts/presents; the server confirms or corrects.
- Typical races: double pickup, double purchase, double pity/duplicate redeem. The fix is an atomic server-side operation (check + charge + grant with no gap).
- `MemoryStoreService` for cross-server locks/counters when the design uses it; verify expiration and release in tests.
- `MessagingService` for cross-server events: verify degraded delivery (it can be lost) and that the game stays consistent.
- `DataStoreService`/`OrderedDataStore` under concurrency: use transactional updates where applicable (see `roblox-datastores`) and `pcall` + retry (see `roblox-error-handling`).
- Join windows: the server must send a full snapshot on late join, not just deltas. Verify the snapshot in each late scenario.
- Observability: log transitions and authority decisions with timestamps to order disputed events.

Illustrative example (double-pickup oracle):

```text
Escenario PICKUP-RACE (ilustrativo)
Inicial: pickup P activo, A y B con 0.
Acción: A y B recogen en el mismo tick (x10 repeticiones).
Esperado: exactamente 1 ganador por repetición, perdedor recibe
"ya recogido", P desaparece para ambos, log de servidor cita ganador.
Falla si: ambos obtienen, ninguno obtiene, o P sigue visible tras otorgar.
```

Illustrative example (authority checklist):

```luau
-- Ilustrativo: qué verificar en cada acción de cliente
-- 1. Servidor valida rango/tipo (assert + typeof)
-- 2. Servidor comprueba fondos/estado ANTES de otorgar
-- 3. Otorgar + descontar en una sola sección atómica
-- 4. Log con jugador, acción, resultado
```

## Best practices
- Short repeatable scenarios (10x) beat "play 20 min and see if it shows up".
- A written oracle before running; without an oracle there is no objective failure.
- Fixed roles per client for reproduction; rotate roles to cover biases.
- Minimum evidence per scenario: result, logs, tested build/version.
- Automate the repeatable (simultaneous-action scripts) and keep the exploratory manual.

## Common mistakes
1. Testing with only 1 client: races do not appear until production. Minimum 2 + late join.
2. Trusting network arrival order as correctness: order is no guarantee. Atomicity on the server.
3. State with deltas only and no snapshot: late joiners see a broken world. Full snapshot on join.
4. Ignoring poor network "because it runs fine on LAN": the real player suffers. Simulate degradation in 2 scenarios.
5. Logs only on the client for disputes: impossible to order events. Authoritative logging on the server.
6. Device matrix without mobile/low quality: 60% of the audience finds the bug. Include low end.
7. A race that "almost never happens" left unfixed: in production it always happens. 10/10 deterministic or it does not merge.

## Quality and done criteria
- [ ] Race scenarios (pickup, purchase, redeem) 10/10 with a single winner and consistent state.
- [ ] Client cheating attempts rejected + logged (evidence attached).
- [ ] Late join and rejoin converge to the correct snapshot (inventory, round, pity).
- [ ] 2 critical scenarios repeated on poor network with no permanent desync.
- [ ] Minimum device matrix (PC + mobile/low) with verified FPS and results.
- [ ] Each failure has a regression (test or written scenario) and a green re-run.

## Tools
- Studio multi playtest / devices for 2+ clients.
- `TestService` + TestEZ for what is unit-testable (see `roblox-testez`).
- `MemoryStoreService` / `MessagingService` / `DataStoreService` as surfaces to stress.
- MicroProfiler / ScriptProfiler if concurrency degrades performance.

## Limitations
- Does not guarantee coverage of thousands of players; it is pre-release validation, not a massive load test.
- Does not design networking or data; defers to `roblox-networking` and `roblox-datastores`.
- If limits or signatures are in doubt, note `(check create.roblox.com/docs)`.
