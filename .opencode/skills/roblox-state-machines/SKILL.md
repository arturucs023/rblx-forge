---
name: roblox-state-machines
description: State machines for AI, UI, and gameplay in Luau (states, transitions, guards). Use it when an if/flag chain becomes unmanageable.
---

# State Machines in Roblox

## Objective
Model behaviors (enemy AI, UI flows, round loops) as explicit state machines: verifiable states, events, transitions, and guards, eliminating contradictory boolean flags.

## Scope and limits
Differentiation: `luau-core`, `luau-types`, and `roblox-core` cover language and code location; this skill covers behavior engineering (state and transition design). `roblox-component-systems` covers entity composition; only the brain that decides what to do is covered here.

What it does NOT do:

- It does NOT implement pathfinding or animation (use state to decide, not to move).
- It does NOT cover state replication (that is `roblox-networking`); here the authoritative machine is designed plus which events are replicated.
- It is NOT a framework: it introduces no external classes, only `ModuleScript` + tables + `BindableEvent`.

## Use cases
1. Enemy AI: Idle → Chase → Attack → Stunned → Dead.
2. UI flow: Loading → Menu → Lobby → Playing → Results.
3. Round loop: Waiting → Countdown → Active → Ending → Intermission.
4. Interactables: Closed → Opening → Open → Closing.
5. Player: Normal → Dashing → Stunned → Dead (with hierarchy if useful).

## Step-by-step process
1. List states as closed values (constant table). Ban free strings outside that table.
2. Draw the transition matrix: row = origin state, column = event, cell = destination + guard. Every empty cell is an illegal transition.
3. Define guards as pure functions `(ctx) -> (boolean, reason)`. No guard mutates state; it only decides.
4. Implement `enter`/`exit` per state: `enter` acquires resources (timers, connections), `exit` releases them. Never the reverse.
5. Centralize change in a single `transition(to, reason)` function: validate legality, call `exit`, switch, call `enter`, emit change event for observability.
6. Add hierarchy only if there are sub-states with shared `exit` (e.g. Attack.Melee/Attack.Ranged). If there are only 3 flat states, do not hierarchize.
7. Connect ticks with care: `Update(dt)` only runs the current state's logic; it never changes state without going through `transition`.
8. Log every transition (origin → destination, event, timestamp) in a circular log for debugging (see `roblox-error-handling`).
9. Test the full matrix: every legal transition and 3-5 representative illegal ones (see `roblox-testez`).

## Technical knowledge
- Canonical representation: `states` table, `transitions[origin][event] = { to, guard }` table, current state as a string from the closed table.
- Guards: validate preconditions (cooldown ready, distance, permission). If a guard fails, the machine stays and reports the reason; it does no "half" transition.
- `BindableEvent` to notify state changes within the same context; useful for UI reacting to the gameplay machine.
- `Attributes` to expose current state for debugging without coupling (e.g. readable `State` attribute). Do not use attributes as the single source of truth if the machine is server-authoritative.
- Hierarchical: a parent state contributes shared `enter`/`exit` and delegates to children. Implement as nested machines only when the shared `exit` saves real duplication.
- Timers: each state with duration carries its own count; on exit it is cancelled. An orphaned timer is the first cause of ghost transitions.

Illustrative example (generic core):

```luau
-- ModuleScript: StateMachine (ilustrativo)
local StateMachine = {}
StateMachine.__index = StateMachine

function StateMachine.new(def: { initial: string, transitions: any })
	local self = setmetatable({}, StateMachine)
	self._def = def
	self.current = def.initial
	self.log = {}
	return self
end

function StateMachine:transition(event: string, ctx: any): boolean
	local from = self.current
	local edge = self._def.transitions[from] and self._def.transitions[from][event]
	if not edge then return false end -- transición ilegal
	if edge.guard then
		local ok, _reason = edge.guard(ctx)
		if not ok then return false end
	end
	table.insert(self.log, { from = from, to = edge.to, event = event })
	self.current = edge.to
	return true
end

return StateMachine
```

Illustrative example (enemy definition):

```luau
-- Uso ilustrativo
local def = {
	initial = "Idle",
	transitions = {
		Idle = { spotted = { to = "Chase" } },
		Chase = {
			lost = { to = "Idle" },
			inRange = { to = "Attack" },
		},
		Attack = {
			finished = { to = "Chase" },
			stunned = { to = "Stunned" },
		},
		Stunned = { recovered = { to = "Chase" } },
	},
}
```

## Best practices
- States with adjective/situation names (`Stunned`), events with verbs (`stun`, `recover`). Do not mix.
- One machine, one owner. If two systems change the same state, merge or split machines.
- Illegal transitions = `false` + log, never fatal runtime error (in tests they must fail).
- Expose `current` as a read; change only via `transition`.
- Document the matrix in the module header; the code must mirror it 1:1.

## Common mistakes
1. Parallel booleans (`isRunning`, `isStunned`, `isDead` all true at once): contradictory states. Fix: a single `current`.
2. Changing `current` by direct assignment skipping `exit`/`enter`: timer and connection leaks. Always use `transition`.
3. Guards with side effects (they damage, move): they run twice on retry. Keep them pure.
4. Timer surviving `exit`: the old state fires late transitions. Cancel on `exit` and verify with a test.
5. Premature hierarchy with 2 states: complexity without savings. Start flat, hierarchize at the third duplicated sub-state.
6. Replicating every machine tick instead of events: network spam. Replicate only relevant `transition`s (see `roblox-networking`).
7. `Update` that evaluates and transitions at once without a guard: untestable logic. Separate "evaluate" from "transition".

## Quality and done criteria
- [ ] Documented transition matrix with no ambiguous cells; every illegal transition returns `false` + log.
- [ ] Paired `enter`/`exit`: no resource survives the switch (verifiable with connection count before/after).
- [ ] Pure guards with independent unit tests.
- [ ] History of last N transitions available for debugging.
- [ ] Suite covering all reachable states and 3+ illegal transitions passes green.
- [ ] If hierarchical, written justification of which shared `exit` motivated it.

## Tools
- `ModuleScript` + `require` for the reusable machine.
- `BindableEvent` to notify intra-context changes.
- `Attributes` for visible state debugging.
- `TestService` + TestEZ for transition matrix (see `roblox-testez`).

## Limitations
- Does not replace AI design (perception, pathfinding) or UI design; it only orders behavior.
- Does not cover authoritative replication or persistence; defer to `roblox-networking` and `roblox-datastores`.
- If unsure about a signature or service, note `(verify in create.roblox.com/docs)` before using it in production.
