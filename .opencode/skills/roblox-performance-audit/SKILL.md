---
name: Roblox Performance Audit
description: Diagnose and fix performance issues with profilers and scene analysis. Use it when the game lags, stutters, drops FPS, crashes on mobile, or before optimizing hot code.
---

# roblox-performance-audit

Evidence-based optimization: measure first, fix second, re-measure.
Complementary: `roblox-performance`, `roblox-testing`,
`roblox-physics`, `roblox-mobile-playtest`. Requires a running peer
(`server`/`client-N`).

## Objective

Attribute frame cost (script / physics / render / network), find the
worst offenders, fix with the smallest effective change, and prove the improvement.

## Scope and limits

- Covers: diagnosis with profilers, correct metric reading, fix
  order, re-measurement, and mobile gate.
- Does NOT implement systems or design gameplay (that belongs to the systems skills).
- Does NOT replace `roblox-performance` as the techniques reference; this skill
  is the end-to-end audit procedure.

## Use cases

- Lag, stutters, low FPS, or mobile crashes with no clear cause.
- Pre-release performance review.
- Suspected hot script, overdraw, physics, or costly replication.

## Step-by-step process

1. **Baseline.** In a playtest, capture on the affected peer:
   `capture_script_profiler` (Luau hotspots), `capture_micro_profiler`
   (`focus: script/physics/render/network`), `get_scene_analysis`
   (`mode: all`, `topN: 20`), `get_memory_breakdown`. Write down numbers.
2. **Read correctly.** Profiler rows are inclusive/accumulated: never
   sum them as disjoint totals. Compare `total_us`/self cost, not just
   call counts.
3. **Fix in this order** (cheap first):
   - Part/instance count: reuse, cull distant decoration, tune
     `StreamingEnabled` before deleting wholesale; 2048-stud cap per `BasePart`.
   - Per-frame Luau: move work to events, cache `WaitForChild`, avoid
     allocations in hot loops, disconnect unused connections.
   - Replication: fewer lighter remotes, avoid big tables, client→server rate-limit.
   - Render: shadow map only where it pays off, limit parts with `CastShadow`, watch
     overdraw from stacked transparencies/VFX, compress audio.
   - Physics: anchor static scenery, reduce unanchored assemblies, review
     network ownership churn on vehicles.
4. **Re-measure** with the same captures; report before/after per metric.
5. **Mobile gate.** `capture_device_matrix` on low preset + `poor` network profile;
   the game must stay playable, not just fast on desktop.

## Technical knowledge

- Inclusive vs exclusive profiler rows; `total_us` as the queen metric.
- `StreamingEnabled`, memory budgets per category, replication cost.

## Best practices

- No change without a baseline of the same scenario first.
- One change at a time; if there are several suspects, the top offender first.
- Repeat the measurement with the same capture configuration.

## Common mistakes

- Optimizing without a profile (rewriting cold code).
- Summing inclusive rows and "finding" 300% frame cost.
- Testing only in desktop Studio and failing on phones.

## Quality and done criteria

- [ ] Baseline and after recorded for script/render/physics/memory.
- [ ] Worst offender fixed; delta measured with the same configuration.
- [ ] Mobile preset + poor network still playable.
- Verification: same `capture_*` calls before and after; cite both
  results. No "faster" claim without numbers.

## Tools

- MCP: `capture_script_profiler`, `capture_micro_profiler`,
  `get_scene_analysis`, `get_memory_breakdown`, `capture_device_matrix`,
  `get_runtime_logs` for related errors.

## Limitations

- Does not fix engine or device bottlenecks; document the
  minimum viable hardware if the game cannot reach it.
- Requires playtests with real peers; without them only static review.

## Example: event instead of polling

```lua
-- ANTES (bucle caliente): 60 chequeos/seg para siempre
task.spawn(function()
	while true do
		for _, coin in CoinsFolder:GetChildren() do annonse(coin) end
		task.wait(1 / 60)
	end
end)

-- DESPUÉS (dirigido por eventos): coste cero en idle
CoinsFolder.ChildAdded:Connect(registerCoin)
CoinsFolder.ChildRemoved:Connect(unregisterCoin)
```
