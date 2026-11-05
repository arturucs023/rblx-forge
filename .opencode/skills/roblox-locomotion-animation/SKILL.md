---
name: roblox-locomotion-animation
description: Believable locomotion (idle/walk/run/jump/fall, blends and foot sliding). Use it when the character skates, transitions pop, or runs weightless.
---

# Locomotion Animation

## Objective

Achieve movement with weight and continuity: live idle, walks/runs synced to real speed, readable jumps/falls, and transitions with no pops, consciously choosing in-place vs. root motion for the controller.

## Scope and limits

Covers the player locomotion set: clips, speed blends, turns, jumps, basic foot `IKControl`, and foot-ground sync criteria.

**What it does NOT do:**

- Does NOT cover respawn-safe lifecycle: covered by `roblox-characters` (here `Humanoid`/`Animator` are assumed managed).
- Does NOT cover character visual direction: covered by `roblox-character-design`.
- Does NOT cover rig construction: covered by `roblox-rigging`.
- Is NOT the general dispatcher: `roblox-animation` decides the frame; this skill is the locomotion domain with gameplay criteria.
- Does NOT cover NPC locomotion with AI: covered by `roblox-npcs`.
- Does NOT cover follow cameras: covered by `camera-systems` (here only how animation should cooperate: don't hide feet, stable horizon).

## Use cases

1. Character "skating" while walking (sliding feet).
2. Run→stop transition with hard braking or pop.
3. Jump that doesn't read (player can't tell rise vs. fall).
4. 180° turn clipping through the body.
5. Dead idle in menus or lobbies.
6. Slopes where feet float or sink.

## Step-by-step process

1. **Measure real speed.** Record `Humanoid` speeds (walk, run, sneak if any). Each clip must declare a range: idle 0, walk A–B, run B–C. Without numbers, blending is guesswork.
2. **Pick in-place vs. root motion.** In-place (recommended default): the clip plays in place and code moves the `HumanoidRootPart`. Root motion: the clip displaces. On a server-authoritative network, in-place is more predictable; document the choice.
3. **Build the minimal set.** Idle, walk, run, jump (rise), fall, land. Don't add strafe/sneak until these six blend cleanly.
4. **Sync cycle and speed.** Tune track playback speed so one full cycle covers the distance the character travels in that time. Rule: if the planted foot moves relative to the ground, there is foot sliding: fix track speed, not game speed.
5. **Design the blends.** Define graph: idle↔walk↔run by speed, jump→fall by vertical velocity, fall→land on contact. Starting fade times: locomotion 0.15–0.25 s, land 0.1 s. Record priorities so land interrupts run but run never interrupts land.
6. **Handle turns.** For smooth turns rotate `HumanoidRootPart` + turn clip only if angle-per-second exceeds a threshold; otherwise the torso twists. Test 90° and 180° turns at top speed.
7. **Add foot `IKControl` where it helps.** Only with visible slopes/steps: plant the support foot during its phase. On flat ground IK is cost with no benefit: skip it.
8. **Bring idle to life.** Breathing (torso ±2 cm), blink or weight shift every 3–6 s, micro-variants so two characters together don't look like copies. Idle must never move the `HumanoidRootPart`.
9. **Stress test.** Run in circles, chain jumps, brake hard, climb/descend slopes. Record with a fixed camera at foot height: any slide shows there.
10. **Freeze curves and thresholds.** Deliver table: clip, speed range, fade, priority, track speed. No table, no "done".

## Technical knowledge

- **`Animation` / `AnimationTrack`:** each clip is an `Animation`; playing it on the `Animator` yields an `AnimationTrack` with weight, speed, fade. Blends are cross-faded weights between tracks, not cuts.
- **Foot sliding:** happens when cycle speed ≠ `Humanoid` speed. Measured on the support foot: if it drifts while planted, adjust track speed.
- **In-place:** code moves the `HumanoidRootPart`; the animation only moves limbs. Avoids network drift and eases server validation.
- **Root motion:** useful in cinematics or short dashes; in continuous locomotion it complicates prediction and anti-speed validation.
- **`Humanoid` and states:** use state (running, jumping, falling, landing) as machine input, not noisy raw speed.
- **`IKControl`:** resolves hands/feet toward goals in real time. For feet: goal = ground contact point. With no detected ground, disable it to avoid jittery feet.
- **Priorities:** locomotion at low/base priority; landing and damage above; social gestures below leg locomotion (see `roblox-expressive-animation` for layers).
- **Replication:** the local player's animations must show on other clients; the server validates state (speed/position) and clients play the matching clip (detail in `roblox-animation-systems`).

Illustrative example (speed selection, not final code):

```luau
-- Ilustrativo: elige clip según velocidad del Humanoid y funde con fade.
local velocidad = humanoid.MoveDirection.Magnitude * humanoid.WalkSpeed
local track = velocidad < 0.5 and trackIdle or (velocidad < 12 and trackWalk or trackRun)
track:Play(0.2) -- fade de 0.2 s para evitar pops
```

## Best practices

- The client proposes visual state, the server validates movement: never let the client declare "I'm going 200" to force the run clip; the server validates speed/position and clients animate accordingly.
- Always a fade: no `Play()` without blend time in locomotion.
- Sync feet before adding clips; more clips on a sliding base only multiply the problem.
- Keep the torso stable on camera: avoid head-bob fighting `camera-systems`.
- Document whether the game uses in-place in one visible line for the whole team.
- Test with simulated latency: the blend should still look good with 150 ms jitter.

## Common mistakes

1. **Chronic foot sliding:** fixed track speed for all ranges. Use per-range adjustment.
2. **Drifting idle:** the idle clip moves the `HumanoidRootPart` a few cm per cycle and the character "sleepwalks". Clean the root curve.
3. **Missing land:** a jump cut lands into run with no absorb; the jump loses weight. Add 0.15–0.3 s land with high priority.
4. **Jump = fall:** same clip for rise and fall; the player can't read the apex. Split them.
5. **Instant torso turn:** rotating 180° in one frame twists the mesh. Cap turn speed or add a turn clip.
6. **`IKControl` always on:** feet vibrating mid-air when jumping. Enable only with confirmed support.
7. **Flat priorities:** idle stomps land and the landing never shows. Prioritize.

## Quality and done criteria

- [ ] No visible foot sliding on fixed camera at foot height in walk/run.
- [ ] Idle/walk/run transitions with no pops (measured fade, no pose snap).
- [ ] Jump/fall/land distinguishable on first viewing by a new tester.
- [ ] 180° turns at top speed with no mesh twisting.
- [ ] Clip table with ranges, fades, and priorities delivered.
- [ ] Idle with at least 2 variants and no root displacement.
- [ ] In-place vs. root-motion decision documented and honored by the controller (see `roblox-character-controller`).

## Tools

- 6-clip base set + straight and slope test track.
- Ground-level fixed camera for measuring sliding (frame per `camera-systems`).
- On-screen `Humanoid` speed meter during tests.
- Blend table (clip, range, fade, priority) as deliverable artifact.

## Limitations

- No parkour (see `roblox-parkour-traversal`) or custom-physics controllers (see `roblox-character-controller`).
- No network prediction or lag compensation; only leaves animation robust to them.
- `IKControl` here is basic feet; hand/weapon IK belongs to combat.
- APIs outside the stable list: "(see create.roblox.com/docs)".
