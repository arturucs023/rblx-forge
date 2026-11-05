---
name: roblox-character-controller
description: Character controllers (acceleration, jumping, coyote time, water/climbing). Use it when movement feels floaty, jumping feels unresponsive, or input doesn't scale to gamepad/touch.
---

# Character Controllers and Movement

## Objective

Build movement that feels good and is network-valid: acceleration/friction with weight, jump buffers (coyote time + jump buffer), unified keyboard/gamepad/touch input, and water/climbing transitions with no flight exploits.

## Scope and limits

Covers the on-foot player controller: `Humanoid` parameters, input model, jumping, slopes, water, and basic climbing.

**What it does NOT cover:**

- Does NOT cover respawn-safe lifecycle: covered by `roblox-characters` (here you configure already-managed `Humanoid`s).
- Does NOT cover locomotion clips: covered by `roblox-locomotion-animation` (here the movement those clips must accompany).
- Does NOT cover advanced parkour (vault/wallrun/slide): covered by `roblox-parkour-traversal`.
- Does NOT cover vehicles: see `roblox-land-vehicles`, `roblox-air-vehicles`, `roblox-water-vehicles`.
- Does NOT cover NPCs: covered by `roblox-npcs`.
- Does NOT cover cameras (only exposes speed/direction for them): covered by `camera-systems`.

## Use cases

1. "Floaty" or "on ice" movement with no weight.
2. Jumps that don't trigger when pressed at an edge (missing coyote time).
3. Controls that only work on PC and break on mobile/console.
4. Water where the player sinks or flies.
5. Climbing that lets you scale any infinite wall.
6. Speedhacks: the server accepts any client speed.

## Step-by-step process

1. **Lock the fantasy in numbers.** Walk, run, acceleration (studs/s²), friction/deceleration, jump height, effective gravity. Starting example: walk 12, run 20, jumps clearing 4 studs. Every later tweak starts here.
2. **Configure the base `Humanoid`.** Speeds, jump height, and slope limits in one documented place. No magic numbers scattered across 6 scripts.
3. **Implement acceleration, not velocity teleport.** Speed approaches target on a ramp (accelerate in ~0.15–0.25 s, brake in ~0.1–0.2 s). Instant change = no weight; eternal ramp = mud. Measure with a stopwatch on a straight track.
4. **Add coyote time + jump buffer.** Coyote: allows jumping up to ~0.1 s after leaving an edge. Buffer: if jump is pressed ~0.12 s before landing, the jump fires on touchdown. Both are input forgiveness, not new physics.
5. **Unify input with `ContextActionService`.** One "Jump" action, one "Sprint" action, bound to keyboard + gamepad buttons + touch buttons. Read intent (`Humanoid` `MoveDirection` / input vector), not loose keys. Use `UserInputService` only for what actions don't cover (device type, special touches).
6. **Handle slopes and steps.** Define the max walkable angle; above it, the player slides or stops (never climbs vertical walls for free). Low steps climb smoothly; tall ledges need a jump or parkour (see `roblox-parkour-traversal`).
7. **Implement basic water.** Inside a water volume: reduced gravity, capped speed, jump = swim stroke with cooldown, no sustained flight. On exit, restore parameters at a single transition point.
8. **Implement bounded basic climbing.** Only marked surfaces (tagged with `CollectionService`), fixed climb speed, no chained infinite jumps. Every unmarked surface = not climbable.
9. **Validate on the server.** The server knows position, max speed, and state (ground/air/swimming/climbing); it rejects teleports, impossible speeds, and "jumps" with no recent ground or coyote. The client proposes input, the server validates displacement.
10. **Calibrate with blind tests.** Track with: straight sprint, slalom, precision jump to a platform, coyote edge, water, and marked ladder. If 3 new players complete it without complaining about controls, it ships.

## Technical knowledge

- **`Humanoid` as contract:** exposes speed, move direction (`MoveDirection`), state (ground/air/swimming), and jump. The controller writes intent; the `Humanoid` resolves; animation reads the result.
- **`HumanoidRootPart`:** movement pivot and facing reference. Rotate the character toward move direction with limited turn speed to avoid twisting (coordinate with locomotion).
- **Acceleration vs friction:** accelerating = moving current speed toward target at a rate; friction = moving toward zero with no input. Different rates for ground (high) and air (low: partial air control, never total).
- **Coyote time and buffer:** ~0.1 s timers that forgive human input. They don't change physics, they change the acceptance window.
- **`ContextActionService`:** action layer (Jump/Sprint/Interact) with per-device bindings. `UserInputService` complements it for detecting context (mobile vs PC) and special touches.
- **`CollectionService`:** tags for "climbable", "water", "ice", "non-climbable". Code asks by tag, never by part name (robust to renames).
- **Water/climbing exploits:** every state transition (ground→water→climbing) is a server validation point; a client declaring "climbing" on an unmarked wall = rejection.

Illustrative example (unified intent, not final code):

```luau
-- Ilustrativo: una acción "Esprintar" válida en PC, mando y táctil.
local ContextActionService = game:GetService("ContextActionService")
ContextActionService:BindAction("Esprintar", function(_, estado, _)
	if estado == Enum.UserInputState.Begin then humanoide.WalkSpeed = VELOCIDAD_RUN end
	if estado == Enum.UserInputState.End then humanoide.WalkSpeed = VELOCIDAD_WALK end
	return Enum.ContextActionResult.Pass
end, Enum.KeyCode.LeftShift, Enum.KeyCode.ButtonL3)
```

## Best practices

- The client proposes input, the server validates displacement: speed, position, and state transitions are checked on the server with lag tolerance; the impossible gets corrected.
- Single place for movement numbers; no duplicated constant.
- Input forgiveness (coyote + buffer) always; partial air control, never total nor zero.
- Tags (`CollectionService`) for special surfaces; never hardcoded name lists.
- Water/climbing transitions are atomic: on enter/exit all parameters are set at once, no mixed states.
- Accessibility: allow key rebinding and offer a touch alternative per action.

## Common mistakes

1. **Instant speed:** with no ramp the character feels possessed. Always accelerate/decelerate.
2. **No coyote or buffer:** jumps "fail" at edges and frustrate. Both at ~0.1 s change everything.
3. **Loose-key input:** hardcoded WASD ignoring gamepad/touch. Use actions.
4. **Total air control:** reversing 180° mid-air breaks believability and enables exploits. Partial control.
5. **Untagged climbing:** any wall is a ladder and parkour loses meaning. Marked surfaces only.
6. **Water = flight:** cost-free vertical swimming that crosses the map overhead. Cap vertical speed and require surfacing to breathe per design.
7. **Server trusting the client:** accepting position/speed unchecked = free speedhack and flight. Always validate.

## Quality and done criteria

- [ ] Constants in one place; walk/run/jump documented and measured on track.
- [ ] Coyote time (~0.1 s) and jump buffer (~0.12 s) implemented and verified at an edge.
- [ ] One action per intent with PC/gamepad/touch bindings tested on 2 devices.
- [ ] Slopes: max angle respected, no free wall climbing.
- [ ] Water and climbing with atomic transitions and tagged surfaces.
- [ ] Server validation: teleports and impossible speeds rejected in exploit test.
- [ ] 3 new players complete the calibration track with no control complaints.

## Tools

- Calibration track (straight, slalom, precision platforms, edge, water, marked ladder).
- Versioned movement-constants table.
- Latency simulator + exploit-test client (speed/teleport).
- Action→binding map per device.

## Limitations

- Does not cover advanced parkour (see `roblox-parkour-traversal`) or vehicles.
- Does not cover network prediction/rollback in detail; only server validation.
- Does not replace testing on real low-end devices.
- APIs outside the stable list: "(check create.roblox.com/docs)".
