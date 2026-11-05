---
name: roblox-land-vehicles
description: Arcade land vehicles (chassis, suspension, seats, ownership). Use it when building karts, cars, or bikes that drive well and don't fall apart over the network.
---

# Land Vehicles

## Objective

Create fun, stable ground vehicles: predictable chassis, arcade or physics suspension by budget, clean enter/exit with `Seat`/`VehicleSeat`, and network ownership that avoids jitter and theft.

## Scope and limits

Covers player karts, cars, and bikes: chassis, suspension, steering, seats, enter/exit, and networking.

**What it does NOT do:**

- Does NOT cover detailed body construction as a model: base construction follows vehicle-model criteria (this skill defines chassis and behavior, not final art).
- Does NOT cover on-foot character lifecycle: covered by `roblox-characters`.
- Does NOT cover chase cameras: covered by `camera-systems` (here only speed/position for the camera).
- Does NOT cover damage/economy/garage: those are separate gameplay systems.
- Does NOT cover NPC driving: covered by `roblox-npcs`.
- Does NOT cover engine audio: only timing with RPM as a requirement, not sound design.

## Use cases

1. Arcade kart for a party game (4–8 players).
2. City car with controlled drift.
3. Fast bike that doesn't flip on every corner.
4. Passengers: driver + 2 rear seats.
5. Vehicle that shakes or teleports with lag.
6. Players stealing other people's cars or launching them into the void.

## Step-by-step process

1. **Pick arcade vs. physics.** Arcade (recommended for party/mobile): directed speed, high grip, impossible rollover except on ramps. Constraint physics: more real but demands suspension and anti-roll tuning. Decide by audience, not prestige.
2. **Build the minimal chassis.** Main body + 4 wheel points (or 2 on a bike) + driver `Seat` and passenger `Seat`s + `VehicleSeat` if you need the classic driving model. The chassis collides; the visual body ideally does not.
3. **Set up arcade suspension first.** Fixed ride height, visual absorption (wheels move up/down) without simulating real springs, tilt cap (pitch/roll clamped). If the car never gets stuck on 0.5-stud curbs, the base works.
4. **Tune steering and drift.** Top speed, acceleration, speed-sensitive turn radius (faster = less turn), drift as partial loss of rear grip with automatic recovery. Document the 4 numbers.
5. **Implement enter/exit.** Enter: `ProximityPrompt` or touch on the `Seat` with max distance and a near-stopped vehicle; exit: place the `Character` in free space beside it, never inside the chassis or under the map. Forbid exiting above X speed.
6. **Assign network ownership.** The driver owns the simulation (their client moves it, others see the replica); on exit, ownership returns to the server. One owner at a time; atomic transition with an "in transition" state.
7. **Add limits and anti-abuse.** Server-enforced hard top speed, map zone (outside = vehicle respawn), anti-push (one car can't launch another into the void), entry cooldown after theft. The client proposes acceleration, the server validates position/speed.
8. **Test with passengers and lag.** Driver + passengers at 150–200 ms: do passengers vibrate? Does the car teleport? Adjust replication rate and smoothing before touching physics.
9. **Tune rollover and stucks.** Ramps, curbs, head-on crashes: arcade self-rights within 1 s; physics has a button/auto-right. No vehicle stays upside down forever.
10. **Freeze the spec sheet.** Max speed, acceleration, steering, grip, seats, ownership, and theft rules. No spec sheet, no "done".

## Technical knowledge

- **`Seat` vs `VehicleSeat`:** `Seat` seats the `Character` and gives it an occupant; `VehicleSeat` adds classic driving controls (throttle/steer). Choose based on whether you drive with custom logic (Seat + your code) or the classic model.
- **Chassis vs body:** the chassis (simple parts, collision on) defines physics; the body (`SkinnedMesh`/details, no or minimal collision) defines art. Mixing them causes snags on door frames.
- **Seated `Humanoid`:** when seated, the `Humanoid` switches to the seated state and the on-foot controller suspends; on exit it restores. Coordinate with `roblox-character-controller` so no residual velocity remains.
- **Arcade:** you integrate speed toward heading with grip; stable and cheap over the network. Constraint physics: the engine resolves; fun but sensitive to lag and mismatched masses.
- **Ownership:** whoever drives simulates; the server validates (speed, position, inside map). Without a clear owner there is jitter from double simulation.
- **Entry `ProximityPrompt`:** distance, cooldown, and "vehicle nearly stopped" prevent thefts at 100 studs/s.
- **Passengers:** occupants with no control; their `Character` follows the `Seat`. Limit their ability to move the vehicle (weight or nothing) to avoid griefing.

Illustrative example (validated entry, not final code):

```luau
-- Ilustrativo: solo permite sentarse si el vehículo va despacio y hay sitio.
if vehicleVelocidad <= 5 and asientoConductor.Occupant == nil then
	jugador.Character.Humanoid.SeatPart = nil -- se gestiona vía Seat, no por teleport
	asientoConductor:Sit(jugador.Character.Humanoid)
end
```

## Best practices

- The client proposes driving input, the server validates: top speed, position inside the map, and seat transitions are checked on the server.
- One network owner at a time; atomic driver→server→new-driver transition.
- Always exit to verified free space; never inside geometry.
- Arcade by default unless the game sells simulation; physics tuning costs weeks.
- Separate collision (simple chassis) from visuals (detailed body with no collision).
- Log thefts/abandons to balance cooldowns and respawns.

## Common mistakes

1. **No clear owner:** two clients simulate and the car vibrates. One owner at a time.
2. **Exit inside the chassis:** the player spawns stuck or under the map. Find a free side point.
3. **Body with collision:** snags on every door. Only the chassis collides.
4. **No server limit:** client at 300 studs/s. Hard top speed on the server.
5. **Permanent rollover:** without auto-right the car dies upside down. Right within ≤1 s (arcade) or button.
6. **Remote theft:** entering from far away or at full speed. Distance + speed + cooldown.
7. **Driving passenger:** letting passengers input or their weight flip the car. Passengers have no authority.

## Quality and done criteria

- [ ] Spec sheet with speed, acceleration, steering, grip, seats, and ownership.
- [ ] Enter/exit with no snags in 20 attempts (includes exit next to a wall).
- [ ] No jitter at 150 ms (driver + 2 observed passengers).
- [ ] Server validation rejects speed/teleport in adversarial test.
- [ ] Auto-right or button verified upside down on 3 surfaces.
- [ ] Off-map = vehicle respawn without losing the player.
- [ ] Drift controllable by a new player within 3 attempts.

## Tools

- Test track (straight, slalom, curbs, ramp, side wall).
- Standard vehicle spec sheet + ownership and transition table.
- Test client with simulated lag and theft/exploit test.
- Enter/exit checklist (20 attempts).

## Limitations

- No damage, fuel, garage, or economy (separate systems).
- No engine audio beyond exposing RPM/speed.
- No AI pursuits (see `roblox-npcs`).
- APIs outside the stable list: "(see create.roblox.com/docs)".
