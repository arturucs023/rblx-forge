---
name: roblox-building-placement
description: Placement with grid, ghost, validity, and plot saving. Use it when you need to build bases, tycoons, decorate houses, or walls.
---

# Building & Placement

## Objective
Enable building with ghost preview, grid snapping, collision and ownership validation, and plot persistence that loads fast.

## Scope and limits
Covers client ghost, server validation, rotation, demolition, plot limits, and saving.
Declared differentiation: `roblox-game-systems` (installed) is a thin recipe book; this skill is the deep version with collisions, ownership, and massive persistence. It does NOT cover part purchase economy (covered by `roblox-economy-balancing`), construction quests (covered by `roblox-quest-progression-systems`), or vehicle physics (covered by `roblox-vehicle-systems`). `roblox-genre-patterns` does not go deep into placement.

## Use cases
- Tycoon plot with slots and purchasable walls.
- Decoratable house with rotatable furniture.
- Tower-defense defenses placed on a grid.
- PvP traps with exclusion radius.
- Clan base with rank-based permissions.

## Game or system loop (design)
1. Select part (visible cost).
2. Preview ghost (green/red + reason).
3. Rotate/snap to grid (1-stud fine, 4-stud coarse).
4. Confirm → server validation → charge + spawn.
5. Move/sell/demolish with partial refund.
Balance example: grid 4, 70% refund, 150 parts/plot limit, max 20 defensive parts; average part cost = 3–5 min of farming; if plot load time exceeds 4 s on mobile, reduce parts or use LOD.

## Step-by-step process
1. Define `BuildDefs`: `id`, size, cost, grid, can-rotate, requires-ground, exclusion-radius, per-plot limit.
2. Client shows ghost with semi-transparent `Model`; raycast from camera with `Raycast` to `Workspace` ignoring the character.
3. Snapping: `pos = round(pos/Grid)*Grid`; rotation in 15°/45°/90° steps per part.
4. Client check (advisory): inside plot, no overlap (`GetPartBoundsInBox`/`OverlapParams`), on valid ground.
5. Confirmation via `RemoteFunction PlaceRequest(defId, quantizedCFrame)`; server repeats ALL checks.
6. Server charges, creates the part with `Attributes` (`OwnerId`, `DefId`), parents to a `Plots_<UserId>` folder, and applies the `Placed` `CollectionService` tag.
7. Demolition/sell with `RemoteEvent Demolish(instanceId)` validating ownership and computing refund.
8. Saving: serialize `[{def, x,y,z, ry}]` compressed per plot; load in batches with `task.defer` to avoid freezing.

## Technical knowledge
### What the server validates
- Plot ownership and permissions (owner or allowed rank only).
- Position inside plot bounds + margin; valid quantized rotation.
- No real overlap with `OverlapParams` on server and payable cost.
- Limits: count per type and total; max 4 placements/s rate.
### Persistence
- `DataStoreService` per plot with key `plot_<UserId>_v2`; saves a compact table, not instances.
- Size limit: if it exceeds 4 MB per entry, split into sections or reduce precision to 0.5 studs.
- Autosave every 120 s + on exit; `BindToClose` with a queue.
### Errors/disconnections
- Placement in flight at shutdown: if the charge happened but not the save, the part rebuilds from the session log on rejoin.
- Corrupt plot: loads valid parts and ignores the rest + warns "3 parts failed to load".
- Two simultaneous placement conflicts: per-plot mutex; second waits 1 s or fails with retry.
### Anti-exploit
- Never accept a free `CFrame`: requantize on server and clamp to plot.
- Reject off-catalog parts or parts with altered size.
- Anti-spam for crash parts: total limit + minimum cost + anomalous dense-grid detection.
- Validate `OwnerId` on demolition; a client cannot delete others' parts.

## Best practices
- Ghost with color code + reason text (`OUT OF PLOT`, `OVERLAPPING`, `INSUFFICIENT FUNDS`).
- `Attributes` for owner/type; `CollectionService` for per-plot cleanup.
- Streaming: distant plots with natural `StreamOut`; don't force `Persistent` except the active base.
- Touch controls: rotate with buttons, confirm with configurable double tap.
- 3-part guided tutorial before free mode.

## Common mistakes
1. Validating only on client → parts floating in spawn; duplicate checks on server.
2. Saving full instances → DataStore overflow; serialize defs + transform.
3. `PivotTo` without collision → interpenetrating parts; use server `OverlapParams`.
4. No per-plot limit → 2000 parts crash mobile; enforce 100–200 and measure.
5. Demolition without clear refund → churn; set 50–70% and show it upfront.

## Quality and done criteria
- [ ] Ghost and server result match on 50 placements (≤0.5-stud error).
- [ ] Out-of-plot or overlapping attempts rejected in 100% of 30 adversarial tests.
- [ ] 150-part plot saves and loads in <4 s on a mid-range device.
- [ ] 20 req/s spam creates no extra parts and overcharges nothing.
- [ ] Exact 70% refund on 10 audited demolitions.
- [ ] Plot cleanup frees memory and tags with no orphans.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `Players`, `CollectionService`, `Attributes`, `DataStoreService`, `TweenService` (ghost). Check create.roblox.com/docs if in doubt.

## Limitations
- Does not simulate real structural physics or detailed explosion destruction.
- Does not manage global economy; compose with `roblox-economy-balancing`.
- Multi-select and massive blueprints are out; they need a dedicated extension.

```luau
-- Ilustrativo: snapping a grid.
local function snap(pos: Vector3, grid: number): Vector3
	return Vector3.new(
		math.round(pos.X / grid) * grid,
		math.round(pos.Y / grid) * grid,
		math.round(pos.Z / grid) * grid
	)
end
```
