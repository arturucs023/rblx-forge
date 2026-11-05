---
name: roblox-component-systems
description: Reusable components with CollectionService, Tags, and Attributes. Use it when several objects share behavior without inheritance.
---

# Component Systems in Roblox

## Objective
Build reusable behaviors (damageable, interactable, spinning, collectible) as decoupled components on top of `CollectionService`/`Tags`/`Attributes`, with a clear lifecycle and no invented frameworks.

## Scope and limits
Differentiation: `luau-core`, `luau-types`, `roblox-core`, and `roblox-datastores` cover language, client-server model, and persistence; this skill covers composition engineering (entities + components with lifecycle). `roblox-state-machines` covers the internal brain; here we cover how behavior is attached to instances.

What it does NOT do:

- Does NOT create an external ECS framework or new dependencies.
- Does NOT handle replication (that is covered by `roblox-networking`); the component decides what is local and what asks the server.
- Does NOT refactor full legacy systems (that is covered by the installed `roblox-code-maintenance-refactor`).

## Use cases
1. "Everything with the `Damageable` Tag takes the same damage".
2. Interactables: `Interactable` Tag + `PromptText` attribute.
3. Ambient effects: `Spin` Tag with speed from an attribute.
4. Collectibles: `Pickup` Tag + `Attributes.Rarity`.
5. Doors/platforms: Tag + configuration attributes with no per-instance code.

## Step-by-step process
1. Define the component contract: Tag, required attributes with types and defaults, and events it emits.
2. Create one `ModuleScript` per component with a fixed API: `start()`, `stop()`, `onAdded(instance)`, `onRemoved(instance)`.
3. In `start`, subscribe to `CollectionService:GetInstanceAddedSignal(tag)` and `GetInstanceRemovedSignal(tag)`; also process already-tagged ones with `GetTagged(tag)`.
4. In `onAdded`, validate attributes with useful asserts (name, type, range). Fail fast with a message stating which Tag/attribute is missing.
5. Store per-instance state in the component's table (`[instance] = state`), never as loose globals or `ValueBase` children except for debugging.
6. In `onRemoved`, clean up connections, timers, and table entries. Verify no reference remains.
7. Configure via `Attributes` (designer tweaks without touching code); read attributes once on add and subscribe to changes only if the design requires it.
8. Separate client/server: the server component decides (damage, collection); the client one only presents. Don't duplicate authority.
9. Write a test per component: add → behave → remove → no leaks (see `roblox-testez`, with `CollectionService` mocks if needed).

## Technical knowledge
- `CollectionService`: `GetTagged`, `GetInstanceAddedSignal`, `GetInstanceRemovedSignal`, `HasTag`, `AddTag`, `RemoveTag`. It is the glue of the system.
- `Tags` + `Attributes`: the Tag says "which behavior", attributes say "with which parameters". Both visible in Studio for designers.
- Lifecycle: `start` (subscribe) → `onAdded` (validate + connect) → optional `update` → `onRemoved` (clean up) → `stop` (disconnect global signals).
- Per-instance state: optional weak table or manual cleanup. If you use weak tables, document why; otherwise `onRemoved` must do `state[inst] = nil`.
- `BindableEvent` for components to communicate in the same context (e.g. Pickup publishes `Collected`, Score listens). Avoid cross-`require` between components.
- Performance: one global update with an active list performs better than one loop per instance; measure with MicroProfiler if there are hundreds of actives.

Illustrative example (component skeleton):

```luau
-- ModuleScript: SpinComponent (ilustrativo)
local CollectionService = game:GetService("CollectionService")

local SpinComponent = {}
local TAG = "Spin"
local states = {} :: { [Instance]: { conn: RBXScriptConnection } }

local function onAdded(inst: Instance)
	local speed = inst:GetAttribute("Speed")
	assert(typeof(speed) == "number", "Spin requiere atributo number 'Speed' en " .. inst:GetFullName())
	-- conectar lógica aquí y guardar en states[inst]
	states[inst] = states[inst] or {} :: any
end

local function onRemoved(inst: Instance)
	local s = states[inst]
	if s and s.conn then s.conn:Disconnect() end
	states[inst] = nil
end

function SpinComponent.start()
	for _, inst in CollectionService:GetTagged(TAG) do
		task.spawn(onAdded, inst)
	end
	SpinComponent._added = CollectionService:GetInstanceAddedSignal(TAG):Connect(onAdded)
	SpinComponent._removed = CollectionService:GetInstanceRemovedSignal(TAG):Connect(onRemoved)
end

function SpinComponent.stop()
	if SpinComponent._added then SpinComponent._added:Disconnect() end
	if SpinComponent._removed then SpinComponent._removed:Disconnect() end
	table.clear(states)
end

return SpinComponent
```

Illustrative example (safe attribute read):

```luau
-- Ilustrativo
local function readSpeed(inst: Instance): number
	local v = inst:GetAttribute("Speed")
	if typeof(v) ~= "number" then
		warn("Spin sin Speed válido en " .. inst:GetFullName() .. "; uso 30")
		return 30
	end
	return v
end
```

## Best practices
- One Tag, one component, one `ModuleScript`. No giant "ComponentManager".
- Always validate attributes on add; error message with Tag + attribute + instance.
- Configurable attributes, stable code: the designer should not need a code change to tune a number.
- Full cleanup in `onRemoved`; verify with connection counting.
- Prefer composition (several Tags per instance) over deep hierarchies.

## Common mistakes
1. Forgetting to process already-tagged instances on start: works when added at runtime but not when the map loads. Iterate `GetTagged` in `start`.
2. Storing state as instance children without cleanup: duplicates after reuse. Centralize in the component table.
3. Reading attributes without type validation: string `Speed` breaks arithmetic. Use `typeof` + assert/warn.
4. Not disconnecting global signals in `stop`: tests that contaminate the next one. Disconnect and clear the table.
5. Client component with authority (deals damage locally): exploitable. The client presents; the server decides (see `roblox-networking`).
6. Subscribing to attribute changes by default without needing it: cost per instance. Only if the design asks for it.
7. Double-registering the same Tag in two different components that fight: define a single owner per Tag.

## Quality and done criteria
- [ ] Written contract per component: Tag, attributes (name/type/default), events.
- [ ] `start` processes existing tagged instances + subscribes signals; `stop` cleans everything.
- [ ] `onRemoved` leaves zero references (verifiable: add/remove N times doesn't grow memory or connections).
- [ ] Invalid attributes produce an actionable error/warning with instance name.
- [ ] Add → act → remove test green for each component.
- [ ] No component crosses client-server authority without justification.

## Tools
- `CollectionService` / `Tags` / `Attributes` as the base.
- `BindableEvent` / `BindableFunction` for intra-context communication.
- `ModuleScript` + `require` for each component.
- `TestService` + TestEZ for lifecycle (see `roblox-testez`).
- MicroProfiler / ScriptProfiler if there are hundreds of active instances.

## Limitations
- Does not invent frameworks or add dependencies; everything with platform APIs.
- Does not cover replication or persistence; see `roblox-networking` and `roblox-datastores`.
- When in doubt about signatures, note "(verificar en create.roblox.com/docs)" and confirm before production.
