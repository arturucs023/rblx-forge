---
name: roblox-air-vehicles
description: Arcade aircraft (lift, controls, map limits). Use it when building airplanes, helicopters, or jetpacks without giving away free flight.
---

# Air Vehicles

## Objective

Fun, controlled flying: predictable arcade lift, accessible controls on PC/gamepad/touch, clear map/altitude limits, and anti-exploit that prevents using the vehicle as permanent free flight.

## Scope and limits

Covers player airplanes, helicopters, jetpacks, and flying mounts: lift, controls, limits, and networking.

**What it does NOT cover:**

- Does NOT cover on-foot characters: see `roblox-characters` and `roblox-character-controller`.
- Does NOT cover aerial cameras: covered by `camera-systems` (here only speed/attitude for the camera).
- Does NOT cover parkour/body flight (wallrun, capes): covered by `roblox-parkour-traversal`.
- Does NOT cover damage/garage/economy: separate systems.
- Does NOT cover flying NPCs: covered by `roblox-npcs`.
- Does NOT cover engine audio: only exposes RPM/speed as a requirement.

## Use cases

1. Arcade airplane for exploring the map.
2. Helicopter with vertical takeoff/landing.
3. Jetpack with limited fuel.
4. Flying mount (dragon) with dive and glide.
5. Players leaving the map or flying into forbidden zones.
6. Landings that end in explosion or under the map.

## Step-by-step process

1. **Pick a flight model.** Airplane: needs speed to sustain lift, cannot hover. Helicopter/drone: vertical hover, slower. Jetpack: vertical thrust with fuel. Glider: always descends except when diving. One vehicle, one model, no confusing hybrids.
2. **Define the envelope.** Min/max speed, climb/descent rate, altitude ceiling, map radius. Example: 200-stud ceiling, 30–80 speed. Outside the envelope the vehicle pushes back, never lets you through.
3. **Build chassis + `Seat`.** Body with simple collision, pilot `Seat` (+ passengers), landing gear or skids with documented ground clearance. Visual propeller/wings do not collide.
4. **Implement unified controls.** Pitch, yaw, roll (airplane) or strafe (heli), accelerate/brake, ascend/descend. With `ContextActionService` + `UserInputService` for touch: two sticks or stick + buttons, never 6 mandatory keys.
5. **Arcade lift.** Airplane: lift ∝ speed; below minimum speed it loses altitude (stall) instead of floating. Heli: vertical thrust with inertia; releasing control = gentle descent, not a mid-air stop unless designed. Document the formula in one line.
6. **Landing and collision.** Landing gear + valid surface (`CollectionService` tag "runway/ground") = lands; water or slope = damage or bounce per design, never clipping through. On ground contact validate vertical speed: excess = damage, not clipping under the map.
7. **Ownership and replication.** Pilot simulates, everyone else sees smoothed replication; on exit, ownership to the server. Speed/position validated on server with lag tolerance; out of map = gentle forced return.
8. **Flight anti-exploit.** Fuel or battery (jetpack/heli), hard ceiling, forbidden zones that push out, no leaving the `Seat` mid-air except designed parachute. The client proposes input, the server validates the envelope.
9. **Edge testing.** Fly to the ceiling, the map edge, into a mountain, land on a slope and on water, exit the seat mid-air. Each case must have agreed behavior with nothing falling under the map.
10. **Freeze the spec.** Model, envelope, per-device controls, fuel, landing rules, and anti-abuse.

## Technical knowledge

- **Arcade lift:** simple, predictable formulas (e.g. vertical thrust = throttle × max; airplane adds speed-based lift). Avoid simulating real aerodynamics: it is unstable over the network and frustrating on touch.
- **Stall (airplane):** below minimum speed the nose drops and it loses altitude; this prevents hovering like a helicopter. Communicate it with visual/audio shudder before the stall.
- **`Seat` in flight:** the `Humanoid` stays seated; the on-foot controller is suspended. Mid-air exit must be forbidden or carry a designed parachute/fall.
- **Pilot's `HumanoidRootPart`:** follows the `Seat`; don't use its position to validate flight (use the chassis). On exit, place the `Character` at a free spot.
- **Ceiling and edges:** soft ceiling (growing downward push) + hard ceiling (cap). Map edge: gentle forced turn + message, not an abrupt teleport.
- **Mid-air collisions:** simple chassis; wings/propeller with no collision so they don't snag on every tower. Impact damage per agreed vertical/horizontal speed.
- **Fuel:** time-boxes free flight (jetpack 20–30 s, heli minutes with refuel). Without fuel the craft descends, it doesn't drop like a stone (unless designed).

Illustrative example (validated envelope, not final code):

```luau
-- Ilustrativo: el servidor recorta lo que salga de la envolvente pactada.
if altura > TECHO_MAX or velocidad > VEL_MAX then
	-- Empujar de vuelta / capar, nunca teleport brusco salvo fuera de mapa.
	velocidad = math.min(velocidad, VEL_MAX)
	altura = math.min(altura, TECHO_MAX)
end
```

## Best practices

- The client proposes input, the server validates the envelope: ceiling, speed, fuel, and zone are checked on the server.
- One owner at a time; pilot→server transition is atomic.
- Controls flyable with gamepad and touch from day one; keyboard alone is not enough.
- Stall/descent is always graceful: warn before punishing.
- Forbidden zones with gentle push + message, not an invisible wall that breaks flow.
- Log map exits and hard landings to tune ceiling and damage.

## Common mistakes

1. **Flight = noclip:** without ceiling or edges the player leaves the map. Hard envelope from the prototype.
2. **Heli hovering forever with no cost:** without fuel anyone camps in the sky. Fuel or timer.
3. **Mid-air exit with no rule:** the player jumps off the plane and exploits gliding. Forbid it or add an agreed parachute.
4. **Wings with collision:** snags on every post. Only the chassis collides.
5. **Landing under the map:** excess vertical speed goes through the ground. Validate and clamp on contact, with tagged surfaces.
6. **Keyboard-only controls:** impossible on mobile/console. `ContextActionService` + touch from the start.
7. **Trusting server:** accepting unaudited air position = teleport flight. Validate envelope and fuel.

## Quality and done criteria

- [ ] Spec sheet with model, envelope, controls, fuel, and landing rules.
- [ ] Stall/lift-loss verified (airplane) or no-input descent (heli).
- [ ] Ceiling and edges tested: gentle push + message, no map exits in 20 attempts.
- [ ] Landing on runway/slope/water with agreed behavior; no clips under the map.
- [ ] Controls tested on PC + (gamepad or touch) with a minimal tutorial.
- [ ] Server validation rejects speed/altitude/teleport in adversarial testing.
- [ ] Mid-air exit forbidden or with agreed, validated parachute.

## Tools

- Air track (runway, helipad, mountain, map edge, forbidden zone).
- Envelope sheet + per-device control map.
- Air exploit test (ceiling, edges, mid-air exit, infinite fuel).
- Log of hard landings and exits for tuning.

## Limitations

- Does not cover air combat (weapons, lock-on) beyond the flight platform.
- Does not cover damage/economy/garage or engine audio.
- Does not cover realistic aerodynamic physics; arcade by design.
- APIs outside the stable list: "(check create.roblox.com/docs)".
