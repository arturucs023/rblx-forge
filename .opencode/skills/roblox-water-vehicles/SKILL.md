---
name: roblox-water-vehicles
description: Water vehicles (buoyancy, waves, docking, Terrain vs part water). Use it when building boats, jet skis, or ships with harbors.
---

# Water Vehicles

## Objective

Sail with believable arcade feel: stable buoyancy, wobble-free wave response, predictable rudder controls, clean harbors/docking, and networking with a single server-validated owner.

## Scope and limits

Covers player boats, launches, jet skis, and ships: buoyancy, propulsion, docking, and networking.

**What it does NOT do:**

- Does NOT cover character swimming: see `roblox-character-controller` (only embark/disembark here).
- Does NOT cover water chase cameras: covered by `camera-systems`.
- Does NOT cover fishing/economy/naval damage: separate systems.
- Does NOT cover navigating NPCs: covered by `roblox-npcs`.
- Does NOT cover water/engine audio: only exposes speed/state as a requirement.
- Does NOT cover terrain as such: it decides between `Terrain` water or part volumes, but sculpting terrain is another discipline.

## Use cases

1. Calm fishing boat for exploring.
2. Fast jet ski with drift.
3. Large boat with several passengers.
4. Harbor with moorings to leave the boat.
5. Boat that capsizes with every wave or gets stuck on the shore.
6. Players who take the boat ashore and use it as a car.

## Step-by-step process

1. **Pick `Terrain` vs part water.** `Terrain` water (verify at create.roblox.com/docs): integrated waves and swimming, better look, less control. Part volumes: full control of buoyancy and limits, more work. Decide by map: open world = `Terrain`; closed arena = parts.
2. **Define arcade buoyancy.** Waterline (what % of the hull sits submerged), righting (the hull tends to horizontal with delay), max pitch/roll. The boat never capsizes 180° except by designed damage; on a big wave it heels and recovers.
3. **Assemble hull + `Seat`.** Hull with simple collision (no details that snag on docks), pattern `Seat` + passengers, boarding point aboard. Propeller/oar visuals with no collision.
4. **Propulsion and rudder.** Engine: smooth acceleration, max speed per type (boat 15, launch 40, jet ski 55, values to calibrate). Rudder: turns more at low speed, less at high (avoids impossible turns at 50 studs/s). Slow reverse with visibility.
5. **Waves without motion sickness.** Visual heel (±5–10°) + smooth vertical bob; the camera (see `camera-systems`) must stabilize the horizon. If waves move real physics, cap their force: aesthetics yes, catapult no.
6. **Shores and grounding.** Define minimum navigable depth: below it, the boat slows and grounds (never crosses land). Pushing ashore = the boat stops and warns; forbidden to use it as a car (no wheels, no driving on land).
7. **Harbors and docking.** Docking zones tagged (`CollectionService` mooring): on entering slowly, option to moor (brakes, locks position, allows safe exit). Gangway/disembark point verified clear; never inside the dock.
8. **Embark/disembark.** Embark: nearby + boat nearly still + free seat, via `ProximityPrompt` or `Seat`. Disembark: to the dock if a nearby mooring, else to water (swims) with agreed cost. Never disembark at full speed.
9. **Ownership and validation.** Pattern simulates, others see a replica; on exit, ownership to the server. Server validates: max speed, inside water/map, no "sailing" on land. The client proposes rudder, the server validates position.
10. **Freeze the spec sheet.** Type, buoyancy, speeds, waves, grounding/docking rules, and ownership.

## Technical knowledge

- **Arcade buoyancy:** vertical force toward the waterline + righting torques (returning the hull to horizontal). Simple, network-stable, and enough for gameplay.
- **Simple hull:** one or two collision parts; rails, masts, and visual engines with no collision so they don't catch on every piling.
- **`Seat` aboard:** the seated `Humanoid` suspends the on-foot controller; on disembark it's restored (coordinate with `roblox-character-controller`). Pattern and passengers differentiated.
- **`Terrain` vs part water:** `Terrain` gives waves and water material for free but exact behavior depends on the platform (verify at create.roblox.com/docs); part/volume water gives full control of limits and depth at the cost of implementing waves.
- **Grounding:** depth probe under the hull; if shallower than draft, brake proportionally to a stop. That makes the shore a natural limit.
- **Mooring:** "docked" state that locks the boat (no free simulation) and releases the pattern without drift. Unmooring returns ownership to the pattern.
- **Waves and networking:** visual bob can be client-local (exact phase isn't replicated); position/velocity are server-validated.

Illustrative example (grounding as a brake, not final code):

```luau
-- Ilustrativo: poca profundidad = freno progresivo, nunca atravesar tierra.
if profundidad < CALADO_MIN then
	velocidadObjetivo = 0 -- el bote encalla y se detiene
	-- Avisar al patrón: "muy poco fondo" antes de detener del todo.
end
```

## Best practices

- The client proposes rudder/throttle, the server validates: speed, water under hull, and map zone.
- One owner at a time; docked = safe ownership on server.
- Only the hull collides; everything else is visual.
- Always disembark to a clear point (dock or agreed water); never inside geometry.
- Waves that show but don't eject: heel, don't catapult.
- Shore as natural limit: without enough water there's no sailing, no exceptions.

## Common mistakes

1. **Boat-car:** allows sailing on land. Mandatory grounding below minimum draft.
2. **Capsize on every wave:** weak righting or uncapped physical waves. Heel visually, stabilize physically.
3. **Toothed dock collision:** the boat snags when docking. Docks with simple collision and fenders.
4. **Disembark inside the dock:** spawns stuck in the wood. Verified-clear point.
5. **No mooring:** the drifting boat is lost or blocks the harbor. Docked state + agreed respawn.
6. **Passenger-pattern:** passengers who can steer or throttle. Only the pattern has input.
7. **Trusting server:** boat at 200 studs/s on land. Validate speed + water + zone.

## Quality and done criteria

- [ ] Spec sheet with buoyancy, speeds, waves, and docking rules.
- [ ] Grounding verified on 3 shores: brakes and stops, never crosses.
- [ ] Docking at tagged mooring with clean embark/disembark (20 attempts).
- [ ] Visible waves without camera sickness or ejecting the boat (`camera-systems` horizon test).
- [ ] Server validation rejects speed/teleport/land-sailing.
- [ ] Controls tested on PC + (gamepad or touch).
- [ ] Abandoned boat: agreed drift or respawn without blocking the harbor.

## Tools

- Test lake (deep water, soft shore, dock with 2 moorings, wave zone).
- Boat spec sheet + tagged mooring table.
- Visible depth probe for calibrating draft.
- Exploit test (land, speed, teleport, theft).

## Limitations

- Does not cover `Terrain` sculpting or rivers/oceans as level art.
- Does not cover naval combat, fishing, or economy.
- Does not cover character swimming/diving (see controller).
- APIs outside the stable list: "(verify at create.roblox.com/docs)".
