---
name: roblox-combat-animation
description: Combat animations with anticipation, impact, and recovery. Use it when hits feel weak or don't sync with damage.
---

# Combat Animation

## Objective

Land hits that feel right: readable anticipation, weighty impact (hit-stop feel), and committed recovery, synchronized with the real damage window validated by the server.

## Scope and limits

Covers player melee and ranged attacks: 3-phase structure, hit windows, cancels, torso/arm layers, and feel without breaking server authority.

**What it does NOT do:**

- Does NOT cover the respawn-safe lifecycle: covered by `roblox-characters`.
- Does NOT cover rig construction: covered by `roblox-rigging`.
- Does NOT cover damage balance or ability design: only their animated expression (combat system design as such is a separate discipline).
- Is NOT the general dispatcher: `roblox-animation` defines the framework; combat domain here.
- Does NOT cover AI enemies: covered by `roblox-npcs`.
- Does NOT cover combat cameras/shake: covered by `camera-systems` (only events the camera can consume here).

## Use cases

1. Sword swing that "doesn't feel like anything" even though it deals damage.
2. 3-hit combo where the second hit eats the first one.
3. Shot whose animation ends after the impact.
4. Attack the player cannot dodge because there is no anticipation.
5. Received hit that doesn't read (the player doesn't know they were hit).
6. Charged ability that needs "charging vs ready" readability.

## Step-by-step process

1. **Define the real damage window.** Ask design/code: on which frames does the server accept a hit? Note start/end in seconds. The whole animation is built around that window, not the other way around.
2. **Structure in 3 phases.** Anticipation (wind-up, 20–30% of the time, exaggerated readable pose), Impact (active hit, fast, 10–20%), Recovery (return, slow, 50–70% with movement commitment). Sketch the 3 key poses before interpolating.
3. **Make anticipation dodgeable.** It must last long enough to react to (minimum ~0.15 s for fast melee, more for heavy attacks) and use a large silhouette (weapon back, body turned). Test: can a new player tell "it's about to hit" in time?
4. **Sync impact with the hitbox.** Maximum-extension frame = center of the server window. If art and server disagree by more than ~0.05 s, it feels unfair: adjust the clip, don't ask to change the window without reason.
5. **Add feel without touching simulation.** Hit-stop (freeze 2–4 frames on impact), torso recoil, flash on the weapon, sound on the impact frame. Hit-stop is visual: it never stops server validation.
6. **Design recovery as cost.** After a heavy hit the character is exposed for 0.3–0.6 s (cannot attack or sprint). Animate it with low weight and an open pose. Without commitment, there is no tactical decision.
7. **Chain combos with cancel windows.** Define at which % of recovery the next input is accepted (typical: last 30%). Animate the cancel as a short transition, not a hard cut.
8. **Layers: legs vs torso.** Locomotion on legs (keeps running), attack on torso/arms with higher priority. This way you can attack while running without sliding (coordinate with `roblox-locomotion-animation`).
9. **Animate hit reaction and death.** 0.15–0.25 s hit-react with high priority that interrupts locomotion but doesn't teleport; death with a fall that clears the visual hitbox. Without this, combat is one-directional.
10. **Validate with a dummy and latency.** Test against a static target and with 150 ms simulated: does the visual impact match the damage number? Adjust until it does.

## Technical knowledge

- **The 3 phases as a contract:** anticipation/impact/recovery must exist as shared timestamps between animation and code. If the code doesn't expose the window, sync is impossible.
- **`AnimationTrack` and priorities:** attacks go at higher priority than locomotion; hit-react even higher but brief. Two attacks must never blend at 50%: one interrupts or waits.
- **Hit-stop feel:** 30–80 ms visual pause + sound scaling. It only affects presentation; `HumanoidRootPart` position and health are decided by the server.
- **`Tool` and weapons:** the weapon (`Tool`) follows the hand via its weld; if the weapon "floats" on impact, the problem is usually the grip point, not the clip.
- **Hand `IKControl`:** for two-handed attacks or blocks, plant the secondary hand on the weapon. Enable it only during the attack.
- **Anticipation and fair play:** attacks without anticipation feel like bugs even when the code is correct.
- **Replication:** the attacker plays immediately (visual prediction), everyone else sees the server-validated version (see `roblox-animation-systems`).

Illustrative example (phases as comments, not final code):

```luau
-- Ilustrativo: el track de ataque expone fases que el código consulta.
local track = animator:LoadAnimation(animAtaque)
track:Play(0.08) -- fade corto: los ataques entran rápido
-- Fases esperadas del clip: anticipación 0.0–0.25, impacto 0.25–0.35, recuperación 0.35–1.0
-- El servidor solo acepta golpe durante la ventana de impacto.
```

## Best practices

- The client proposes the attack, the server validates: the client plays the animation on press, but damage only happens if the server confirms window, distance, cooldown, and line of sight.
- Never trust clip timing to validate damage; the server uses its own timer.
- One attack, one read: if the player doesn't know whether it was a weak or heavy hit within 0.3 s, redesign the anticipation.
- Limit cancels: allowing anticipation to be cancelled breaks commitment; only allow cancelling the tail of recovery.
- Sound on the impact frame, not on button press.
- Document each attack in a card: duration, window, recovery, cancel, priority.

## Common mistakes

1. **No anticipation:** instant hit impossible to dodge. Always show visible wind-up.
2. **Desynced impact:** damage lands 0.2 s before the visual. Fit the clip to the window, not the other way around.
3. **Hit-stop freezing simulation:** pausing the real `Humanoid` to "sell" the hit opens exploits. Only freeze presentation.
4. **Combos stepping on each other:** track 2 enters at 50% of track 1 and both show half-blended. Define a single cancel point.
5. **No recovery:** attack spam with no cost. Add commitment proportional to damage.
6. **Floating weapon:** badly gripped `Tool`; the hit loses all credibility. Check the grip before the clip.
7. **Eternal hit-react:** 1 s stun per jab; the player loses control. Scale react to damage.

## Quality and done criteria

- [ ] Each attack has a card with 3 phases and the server window noted.
- [ ] Anticipation readable by a new player in a blind test (dodges at least 50% without tutorial).
- [ ] Visual impact and damage number match with 150 ms simulated latency.
- [ ] Recovery with real commitment (measured: cannot re-attack or sprint).
- [ ] Combos chain without pops or half-blends.
- [ ] Hit-react and death implemented and prioritized.
- [ ] Server validation (window, distance, cooldown) verified; animation never grants damage.

## Tools

- Test dummy with impact-window visualization.
- Standard attack card (duration, window, recovery, cancel, priority).
- Latency simulator to validate sync.
- Feel checklist (anticipation, hit-stop, sound, recoil) per attack.

## Limitations

- Does not design balance (damage, cooldowns, hitboxes as logic); only its expression and visual sync.
- Does not cover particle VFX or sound beyond their timing.
- Does not cover cameras or shake (see `camera-systems`).
- APIs outside the stable list: "(verificar en create.roblox.com/docs)".
