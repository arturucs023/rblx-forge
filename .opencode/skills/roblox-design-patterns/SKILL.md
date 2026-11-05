---
name: roblox-design-patterns
description: Luau design patterns (Service/Controller, Observer, Factory, Singleton, Pool). Use it when organizing modules, events, or object creation in Roblox.
---

# Design Patterns in Roblox Luau

## Objective
Standardize Luau code organization with proven patterns (Service/Controller, Observer/event-bus, Factory, Singleton, Object pool) so systems are extensible, testable, and free of unnecessary coupling.

## Scope and limits
Differentiation: `luau-core`, `luau-types`, `luau-performance`, and `roblox-core` cover language fundamentals and the client-server model; this skill covers engineering (when to apply each pattern and when NOT to). `roblox-networking` and `roblox-datastores` cover replication and persistence; here we only decide how to structure the code that uses them.

What it does NOT do:

- Does NOT design replication or persistence (covered by `roblox-networking` and `roblox-datastores`).
- Does NOT refactor existing code (covered by the installed `roblox-code-maintenance-refactor`); here we design new structure or evaluate a single pattern.
- Does NOT replace pre-merge review (covered by `roblox-code-review` in this series).

## Use cases
1. Separate server logic (Service) from client presentation (Controller).
2. Decouple emitters and listeners with an event bus based on `BindableEvent`.
3. Centralize entity creation (enemies, items, projectiles) with a Factory.
4. Share a single access point to a resource (config, seeded RNG) with a disciplined Singleton.
5. Reuse expensive instances (projectiles, effects) with an Object pool.

## Step-by-step process
1. List systems and their dependencies in a table (system → depends on → emits to). If there are cycles, mark the cut.
2. Assign one pattern per concrete need, not by default:
   - Stateful logic with public API? → Service (`ModuleScript` + `require`).
   - N events → M listeners without coupling? → Observer/event-bus with `BindableEvent`.
   - Creation with variants and validation? → Factory.
   - Single source of truth? → Singleton (one per need, documented).
   - Creating/destroying expensive or GC-heavy? → Object pool.
3. Define the module's public interface first (functions, events, errors). Write it in the `ModuleScript` header.
4. Implement with injected dependencies (pass services/tables via constructor or `Init`), never with implicit globals.
5. Add explicit teardown: every connection or instance created by the pattern must have a cleanup function (`Destroy`/`Cleanup`).
6. Write one contract test per pattern (see `roblox-testez`): create → use → destroy without leaks.
7. Review with the checklist: can I swap an implementation without touching consumers? If not, simplify.

## Technical knowledge
- Service/Controller: the Service lives on the server, exposes pure domain functions; the client Controller only presents and asks. Communication between them goes through the network layer (see `roblox-networking`), not cross client-server `require`.
- Observer with `BindableEvent`/`BindableFunction`: useful within the same context (server-server or client-client). Don't use it to cross the client-server boundary.
- `CollectionService`, `Tags`, and `Attributes`: to discover entities to attach components or factories to without coupling hierarchies.
- `ModuleScript` + `require`: the base of all patterns. Each pattern is a `ModuleScript` with minimal API and encapsulated state.
- Singleton with caution: a Singleton hides dependencies and complicates tests. Use it only for genuinely unique resources (immutable config, central seed).

Illustrative example (minimal event bus, same context):

```luau
-- ModuleScript: EventBus (ilustrativo)
local EventBus = {}
EventBus.__index = EventBus

function EventBus.new()
	local self = setmetatable({}, EventBus)
	self._events = {} :: { [string]: BindableEvent }
	return self
end

function EventBus:topic(name: string): BindableEvent
	if not self._events[name] then
		self._events[name] = Instance.new("BindableEvent")
	end
	return self._events[name]
end

function EventBus:publish(name: string, payload: any)
	self:topic(name):Fire(payload)
end

function EventBus:destroy()
	for _, e in self._events do
		e:Destroy()
	end
	table.clear(self._events)
end

return EventBus
```

Illustrative example (Factory with validation):

```luau
-- ModuleScript: EnemyFactory (ilustrativo)
local EnemyFactory = {}
local CONFIGS = { Goblin = { Health = 50 }, Golem = { Health = 200 } }

function EnemyFactory.create(kind: string)
	local cfg = CONFIGS[kind]
	assert(cfg, "kind desconocido: " .. tostring(kind))
	return { Kind = kind, Health = cfg.Health }
end

return EnemyFactory
```

## Best practices
- One pattern per problem. If you need to explain the pattern more than the problem, it's overengineering.
- Small APIs: 3–5 public functions per module. The rest is local.
- Name by role (`InventoryService`, `EnemyFactory`, `ProjectilePool`), not by pattern (`Manager`, `Handler`, `Util`).
- Inject `CollectionService`, `DataStoreService`, or `MemoryStoreService` as parameters where possible so they can be mocked in tests.
- Document when NOT to use the pattern next to its definition.

## Common mistakes
1. Singleton for everything: turns global state into "architecture". Symptom: tests interfering with each other. Fix: pass dependencies as parameters.
2. Event bus as networking: using `BindableEvent` to communicate client↔server. Doesn't work across contexts; use the validated network layer.
3. Factory that builds `Instance`s with no parent or cleanup: memory leak. Every instance Factory must also return its `Destroy` policy.
4. Pool with no limit or reset: the pool grows forever or hands out "dirty" objects. Define max capacity and a `reset` function.
5. Observer without disconnecting: accumulated connections firing dead callbacks. Store each connection and disconnect it in `Destroy`.
6. Service with circular `require` to another Service: the game doesn't load. Break the cycle with events or a third data module.

## Quality and done criteria
- [ ] Each system has an assigned pattern justified in one line (problem → pattern → why not another).
- [ ] No circular `require`; the dependency graph is acyclic and verifiable.
- [ ] Every module with connections or instances exposes `Destroy`/`Cleanup` and it is called in tests.
- [ ] Each pattern has at least one passing contract test (create/use/destroy).
- [ ] No implicit globals (`_G`, `shared`) except with written justification.
- [ ] A new reader knows where to put new logic without asking (verifiable in review).

## Tools
- `ModuleScript` + `require` for composition.
- `BindableEvent` / `BindableFunction` for intra-context Observer.
- `CollectionService` / `Tags` / `Attributes` for decoupled discovery.
- `TestService` + TestEZ (see `roblox-testez`) for contract tests.
- Git + Rojo to version the structure (see `roblox-git-workflows`).

## Limitations
- Does not cover replication, persistence, or profiling; see `roblox-networking`, `roblox-datastores`, and `roblox-performance` / MicroProfiler / ScriptProfiler.
- If you doubt a class or signature, write "(verificar en create.roblox.com/docs)" and don't use it in production without confirming.
- Examples are illustrative and don't replace tests of the real system.
