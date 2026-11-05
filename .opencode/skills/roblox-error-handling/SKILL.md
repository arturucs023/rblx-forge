---
name: roblox-error-handling
description: Errors and logging in Luau (pcall/xpcall, asserts, categories, telemetry). Use it when data calls fail silently or you need graceful degradation.
---

# Error Handling and Logging in Roblox

## Objective
Keep any failure from silently breaking the player or crashing the server: categorized errors, `pcall`/`xpcall` with retries where appropriate, asserts that fail fast in development, and graceful degradation in production with actionable telemetry.

## Scope and limits
Differentiation: `luau-core` and `roblox-core` cover syntax and code placement; this skill covers failure engineering (categories, retries, logging, degradation). `roblox-datastores` covers data design; here we cover what to do when that data fails. `roblox-code-review` requires `pcall`; here we define how to write it.

What it does NOT do:

- Does NOT design data schemas or migrations (see `roblox-datastores`).
- Does NOT replace failure tests (see `roblox-testez` for injecting errors).
- Does NOT send data to external analytics services; only to `DataStoreService`/in-game internal analytics.

## Use cases
1. `DataStoreService`/`OrderedDataStore` with throttling or outage: retry + degrade to cache.
2. `MemoryStoreService`/`MessagingService` unavailable: run in degraded mode.
3. Validation of client or attribute input with useful messages.
4. Logging with categories for live debugging without spam.
5. Non-critical subsystem failure (cosmetics, rarities) without blocking gameplay.

## Step-by-step process
1. Classify each error into 3 buckets: Transient (retry: throttling, network), Permanent (don't retry: corrupt data, permission), Programming (assert: broken invariant).
2. Wrap every external boundary (`DataStoreService`, `OrderedDataStore`, `MemoryStoreService`, `MessagingService`) in `pcall`/`xpcall` with bounded retry (3 attempts, 1s/2s/4s backoff) and jitter if there is contention.
3. Write useful asserts on internal inputs: `assert(cond, "context: what was expected, what arrived, Tag/attribute involved")`. Fail fast in development.
4. Implement per-subsystem degradation: define degraded mode (in-memory cache, defaults, feature disabled with notice) and entry/exit criteria.
5. Centralize logging in a `ModuleScript` Logger with levels (DEBUG/INFO/WARN/ERROR) and categories (Data, Net, Economy, UI). No stray `print` in production.
6. Add context to every log: player, system, operation, attempt, latency. A log without context can't be acted on.
7. Minimal telemetry: count errors by category in memory and flush aggregates to `DataStoreService` or an internal sheet (sample if volume is high). Never personal data.
8. Test the 3 buckets: mock that fails twice then succeeds (transient), permanent failure (degrades), broken invariant (assert fires in test).
9. Review in `roblox-code-review`: every boundary with `pcall`, no `pcall` swallowing the error without logging.

## Technical knowledge
- `pcall(f, ...)` returns `(ok, result|message)`; `xpcall(f, handler)` enriches the traceback. Use `xpcall` with `debug.traceback` (verify exact signature at create.roblox.com/docs) at critical points.
- Retry transients only. Retrying a permanent error (bad key, corrupt data) multiplies damage and throttling.
- Exponential backoff + limit: avoid retrying in a hot loop; yield with `task.wait`.
- `assert` for the programmer, `warn`+degradation for the player. Never show stack traces to the player; show an actionable message ("your inventory loaded in temporary mode").
- Categories: let you mute by system (e.g. `LogLevel.Economy = WARN`) without recompiling.
- `MessagingService`/`MemoryStoreService` may be unavailable in Studio or under throttling: code must still start in local mode.
- Cost: logging every frame or every mass event floods Output and hides what matters; sample or aggregate.

Illustrative example (bounded retry):

```luau
-- ModuleScript: Retry (ilustrativo)
local Retry = {}

function Retry.withBackoff(fn: (...any) -> any, tries: number): (boolean, any)
	tries = tries or 3
	local waitTime = 1
	for attempt = 1, tries do
		local ok, result = pcall(fn)
		if ok then return true, result end
		warn(string.format("[Data] intento %d/%d falló: %s", attempt, tries, tostring(result)))
		if attempt < tries then task.wait(waitTime) end
		waitTime *= 2
	end
	return false, "agotados los reintentos"
end

return Retry
```

Illustrative example (categorized logger):

```luau
-- ModuleScript: Logger (ilustrativo)
local Logger = { Level = { DEBUG = 1, INFO = 2, WARN = 3, ERROR = 4 }, _min = 2 }

function Logger.log(level: number, category: string, msg: string, ctx: any)
	if level < Logger._min then return end
	warn(string.format("[%s][%s] %s %s", tostring(level), category, msg, ctx and tostring(ctx) or ""))
end

return Logger
```

Illustrative example (useful assert):

```luau
-- Ilustrativo
assert(typeof(speed) == "number", "SpinComponent.onAdded: atributo 'Speed' debe ser number, llegó " .. typeof(speed))
```

## Best practices
- One error entry point per subsystem (not 5 ways to retry data).
- Human messages: what happened, what was done (retry/degraded), what comes next.
- Coherent levels: ERROR = look today; WARN = known degraded; INFO = milestone; DEBUG = development only.
- Sample telemetry if volume is high; store aggregates, not every event.
- Document degraded mode in the system README for support.

## Common mistakes
1. `pcall` swallowing the error (`if not ok then end` empty): impossible-to-debug silent failure. Always log + category.
2. Infinite retry without backoff: turns throttling into an outage. Bound attempts and wait.
3. Retrying permanent errors: bad key/permission retried 10 times. Classify before retrying.
4. `assert` on a player path in production for something recoverable: kicks the player over a cosmetic. Use degradation, not assert, on boundaries.
5. `print` everywhere with no levels: Output is noise and nobody watches. Centralize in Logger.
6. Log with no context (just "failed"): not actionable. Include system, operation, attempt, and anonymized player/session.
7. Telemetry with personal data or every single event: privacy and cost risk. Aggregate and sample.

## Quality and done criteria
- [ ] All external boundaries with `pcall`/`xpcall` + bounded retry + categorized log.
- [ ] Degradation matrix written: subsystem → degraded mode → exit criterion.
- [ ] Zero stray `print`s; everything goes through Logger with level and category.
- [ ] Tests for the 3 buckets (transient/permanent/programming) green.
- [ ] Aggregated telemetry verifiable (category counters visible in test).
- [ ] Review (`roblox-code-review`) confirms no error is swallowed silently.

## Tools
- `pcall` / `xpcall` + `task.wait` for retries.
- Reusable `ModuleScript` Logger and Retry.
- `DataStoreService` / `OrderedDataStore` / `MemoryStoreService` / `MessagingService` as boundaries to protect.
- `TestService` + TestEZ with failing mocks (see `roblox-testez`).

## Limitations
- Does not implement external backends or guarantee telemetry delivery under total outage.
- Does not cover data design; see `roblox-datastores`.
- If you doubt signatures (`debug.traceback`, retry limits of a service), note "(verificar en create.roblox.com/docs)".
