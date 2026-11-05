---
name: roblox-vehicle-systems
description: Vehicles as gameplay with garage, fuel, damage, and validated theft. Use it when you need cars, boats, or mounts with ownership and persistence.
---

# Vehicle Systems (Gameplay)

## Objective
Implement fun, stable vehicles: spawn/garage, legible arcade driving, fuel/damage/repair, and theft or lending between players with full server-side validation.

## Scope and limits
Covers ownership, spawn/despawn, damage/fuel, seats, validated theft, and garage.
Declared differentiation: `roblox-game-systems` (installed) is a thin recipe book; this skill is the deep version with ownership, persistence, and anti-exploit theft. Does NOT cover fine constraint tuning in detail (use stable `Constraints` and verify at create.roblox.com/docs), nor vehicular combat with weapons (covered by `roblox-combat-systems`), nor car pricing economy (covered by `roblox-economy-balancing`). `roblox-genre-patterns` doesn't go deep.

## Use cases
- Own car with garage and button spawn.
- Team-shared boat with seats.
- Fast mount with its own stamina.
- PvP theft with lockpick and alarm.
- Taxi/mechanic as a role with fare.

## Game or system loop (design)
1. Buy/unlock vehicle (garage).
2. Spawn at a valid point and drive (goal: transport, delivery, escape).
3. Manage fuel/damage (refuel/repair as sink).
4. PvP risk: park, lock, theft with minigame.
5. Upgrade (speed/armor) and show off.
Example balance: base car 60 studs/s, sport 95, consumption 1%/8s on the move, tank 100 ≈ 13 min; repair 40% of price per total destruction; theft takes 8s with `ProximityPrompt` + noise at 60 m; if the vehicle cuts travel times by >60%, raise cost or add non-vehicle zones.

## Step-by-step process
1. Define `VehicleDefs`: `id`, `velMax`, `acel`, `seats`, `fuelMax`, `consumption`, `hp`, `allowsTheft`, `price`.
2. Garage per player: owned list + equipped; `RemoteFunction SpawnVehicle(id)` validates ownership.
3. Server-side spawn at a free point (`OverlapParams` check); assign `Attributes` (`OwnerId`, `Locked`, `Fuel`, `HP`).
4. Driving: `VehicleSeat` or `Seat` + control `Attributes`; client drives via physics replication, server validates position/speed.
5. Damage/fuel on server per tick (every 1s, not every frame); at 0 HP → smoke, at 0 fuel → engine off; repair only at workshop or with kit.
6. Theft: `ProximityPrompt` with 8s `HoldDuration`, requires owner absent >15 m or unlocked vehicle; server transfers temporary `DriverRights`, not ownership.
7. Despawn: auto after 120s with no driver + save fuel/HP; cleanup with `CollectionService` tag `Vehicle`.
8. Permissions: lock/unlock with `RemoteEvent ToggleLock`; owner only; owner can eject passengers.

## Technical knowledge
### What the server validates
- Real ownership before spawn; 1 active limit per player (2 with pass).
- Free spawn point inside an allowed zone.
- Driving: speed ≤ velMax + 15% tolerance; teleports >120 studs/s corrected.
- Theft: distance, full hold time on server, owner not driving, stealable vehicle.
### Persistence
- Save owned, upgrades, and `fuel/HP` at despawn with `DataStoreService`.
- Version `vehicles_v1`; migrations with default values.
### Errors/disconnections
- Owner leaves: vehicle stays 120s and despawns; passengers get notice and safe ejection.
- Passenger falls out of the world: respawn to seat or beside with fade.
- `NetworkOwnership` loss: the server reassigns network owner to the valid driver; if in doubt, verify at create.roblox.com/docs.
### Anti-exploit
- Anti-fly with car: clamp Y and vertical speed; if rising >8 studs/s without a ramp, correct and log.
- Anti-noclip: periodic server collisions; ignore impossible inputs.
- `ToggleLock` and `SpawnVehicle` with 5/s rate-limit; theft with 30s cooldown per vehicle.
- Never let the client set `Fuel`/`HP`; only the server writes those `Attributes`.

## Best practices
- Arcade before simulation: 3–5 well-tuned parameters (speed, turn, grip).
- Feedback: speedometer, fuel/HP bar, engine-pitch sound, slight camera FOV.
- Marked pedestrian zones; running over only if the design wants it and with clear rules.
- Seats with `Seat` + eject prompt; don't trap players.
- LOD and simple body collisions for mobile.

## Common mistakes
1. Trusting client physics without checks → flying cars; validate speed/position.
2. Multiple spawns from spam → lag and griefing; 1 active limit + 5s cooldown.
3. Instant theft without hold → frustration; 6–10s hold + alarm.
4. Per-frame fuel with floats → drift; 1s tick with 0–100 integers.
5. Persistent vehicle with position → stuck on load; always spawn at garage/free point.

## Quality and done criteria
- [ ] 30 spawns/despawns with no duplicates or orphans in the vehicle list.
- [ ] Legit theft takes 8±1s and notifies the owner; exploit theft (from afar) fails 10/10.
- [ ] Car at velMax for 5 min burns 35–40% fuel (designed range).
- [ ] Simulated fly (Y+50) corrected in <2s without ejecting a legit driver on a ramp.
- [ ] Rejoin keeps owned plus despawn fuel/HP.
- [ ] 10 active vehicles hold ≥45 FPS on a mid-range device.

## Tools
Services/classes: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `CollectionService`, `DataStoreService`, `ProximityPrompt`, `TweenService` (smoke/lights). Physics with `VehicleSeat`, `Seat`, `Constraints`; verify at create.roblox.com/docs.

## Limitations
- Does not cover vehicular weapons or fine PvP damage; compose with `roblox-combat-systems`.
- Does not cover global prices/sinks; compose with `roblox-economy-balancing`.
- Advanced physics (realistic suspension, sim drift) is out of scope.

```luau
-- Ilustrativo: tick de combustible en servidor (cada 1 s).
local function tickCombustible(veh): boolean
	local fuel = veh:GetAttribute("Fuel") or 100
	fuel = math.max(0, fuel - 1)
	veh:SetAttribute("Fuel", fuel)
	return fuel > 0
end
```
