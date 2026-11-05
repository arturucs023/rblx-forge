---
name: roblox-animation-systems
description: Animation state machines, layers, priorities, and replication. Use it when building the system that decides which clip plays and how it looks on other clients.
---

# Animation Systems

## Objective

Build the system that decides which animation plays, when, and how: state machine, body layers, priorities, faded transitions, and replication that stays coherent on other clients with no pops or desyncs.

## Scope and limits

Covers architecture: states, transitions, layers, priorities, `Animator`/`AnimationTrack`, and visual replication.

**What it does NOT cover:**

- Does NOT cover respawn-safe lifecycle (rebuilding the `Animator` on respawn): covered by `roblox-characters`; here the `Animator` is assumed to exist and be unique.
- Does NOT cover rig creation: covered by `roblox-rigging`.
- Does NOT cover visual direction: covered by `roblox-character-design`.
- Is NOT the content of the clips (that lives in `roblox-locomotion-animation`, `roblox-combat-animation`, `roblox-expressive-animation`); here the system that governs them.
- Does NOT cover NPC AI: covered by `roblox-npcs` (which may reuse this system as a player).
- Does NOT cover cameras: covered by `camera-systems`.

## Use cases

1. New project needing the player's central animation controller.
2. Pops and cuts when switching from run to jump to attack.
3. Attacks that don't interrupt walk, or emotes stomping hit-react.
4. Other players looking frozen or playing the wrong animation.
5. Adding a torso layer for aiming/shooting without breaking legs.
6. Migrating from "playing loose clips" to a state-based system.

## Step-by-step process

1. **Inventory clips and classify them.** List everything: locomotion, combat, expressives, hit-react, death. Assign each: layer (legs / torso / face / full-body), priority, and whether it loops or is one-shot. Without an inventory, the system is patch over patch.
2. **Define minimal states.** Example: Idle, Locomotion, Air, Attack, HitReact, Dead, Emote. Each state declares: which layers it controls, which states can interrupt it, and with what fade. Fewer well-defined states beat 20 ambiguous ones.
3. **Draw the transition matrix.** Table of source-state × event → destination-state + fade. Forbid impossible transitions (Dead→Attack, Emote→HitReact without going through base). Every weird cut is born from an undesigned transition.
4. **Assign priorities per layer.** Base: locomotion on legs + torso idle. Mid: emotes and torso/arm aiming. High: attack. Brief max: hit-react. Death: full-body, blocks everything. Document the numeric scale used.
5. **Implement the single player.** One module per `Character` that owns the `Animator` and exposes `CruzarA(state)` with fade. Nobody else calls `Play()` directly: everything goes through the player to avoid fighting tracks.
6. **Manage `AnimationTrack` with hygiene.** On entering a state: `Play(fade)` the new one, fade out the old one, stop orphan tracks past the fade. Limit simultaneous tracks (typical: 1 per layer + 1 transient). Record which track belongs to which layer.
7. **Separate logic and presentation.** Logic (speed, airborne, attacking) lives in the controller; the animation system only reads that state and picks clips. Never measure physics inside the player.
8. **Design replication.** The local player predicts immediately (plays on press); the server validates the real state (position, speed, attacking) and other clients play per the replicated state. Animation is never proof of anything: it mirrors validated state.
9. **Add minimal telemetry.** Counters: transitions per second, simultaneous tracks, time in each state. More than ~10 transitions/s on one player means something oscillates (typical: speed threshold with no hysteresis).
10. **Test the full matrix.** Walk each table transition with simulated latency and verify fades, interruptions, and replication on a second client. Freeze the matrix as a contract.

## Technical knowledge

- **Single `Animator` per `Humanoid`:** every `AnimationTrack` hangs off it. Two players on the same `Animator` fight with unpredictable weights.
- **`Animation` vs `AnimationTrack`:** the `Animation` is the asset; `LoadAnimation` returns a `Track` with weight, speed, length, and events. Reuse tracks for frequent loops instead of reloading.
- **Weights and fades:** a crossfade lowers the old track's weight while raising the new one's over the fade. With no fade (fade 0) there is a pop unless poses match.
- **Layers:** implemented by separating which joints (`Motor6D`) each track governs per priority. Legs for locomotion + torso for action is the highest-value split.
- **Hysteresis on thresholds:** if walk→run switches at speed 12, run→walk must return at 10.5, not 12, or the system flickers between both.
- **One-shots vs loops:** one-shots (attack, land) need an end event or known duration to hand control back; loops (idle, run) need an exit condition.
- **Replication:** state (not frames) is what travels; each client plays the state's clip locally. This avoids frame desyncs under jitter.

Illustrative example (single player, not final code):

```luau
-- Ilustrativo: todo cambio de animación pasa por una sola función con fade.
local SistemaAnim = {}
function SistemaAnim.CruzarA(self, estadoNuevo, fade)
	fade = fade or 0.15
	local trackNuevo = self.tracks[estadoNuevo]
	-- Detiene el anterior con el mismo fade para evitar pops.
	if self.actual then self.actual:Stop(fade) end
	trackNuevo:Play(fade)
	self.actual = trackNuevo
end
```

## Best practices

- The client proposes visual state, the server validates real state: a client may request "attack", but only server-confirmed state replicates to others.
- Single owner of the `Animator` per character; forbid scattered `Play()` calls across code.
- Every transition carries an explicit fade; fade 0 requires written justification.
- Hysteresis on every numeric threshold; no exceptions.
- Death blocks everything and stops tracks in order; respawn resets the system (coordinate with `roblox-characters`).
- Keep the transition matrix as a living document; every new clip must fit it or the matrix is explicitly updated.

## Common mistakes

1. **`Play()` from 5 different scripts:** fighting tracks, random priorities. Centralize in the player.
2. **No hysteresis:** walk/run flicker at the limit speed. Double threshold always.
3. **Orphan tracks:** a one-shot that never stops and keeps weighing 1.0 underneath the next one. Clean up on state exit.
4. **Replicating frames instead of state:** trying to sync exact clip time over the network; impossible with jitter. Replicate state, play locally.
5. **Death that doesn't block:** the dead body keeps playing run as it slides. Dead = full-body + block.
6. **Flat priorities:** everything at the same priority and the result depends on call order. Explicit hierarchy per layer.
7. **Physics logic inside the animator:** the player measures speed itself and diverges from the controller. The animator only reads state.

## Quality and done criteria

- [ ] Complete transition matrix with no undefined transitions.
- [ ] Single player; zero `Play()` outside it (verified by search).
- [ ] All transitions with explicit, measured fade (no pops in blind test).
- [ ] Hysteresis on all thresholds; no oscillation at limit speed.
- [ ] Replication verified with 2 clients + latency: the observer sees the correct state.
- [ ] Telemetry with transitions/s and simultaneous tracks within limits.
- [ ] Death and respawn reset the system cleanly.

## Tools

- Transition matrix (source × event → destination + fade table).
- Single player per `Character` + clip inventory with layer/priority/loop.
- 2-client scene with simulated latency to validate replication.
- Transition and track counters to detect oscillation.

## Limitations

- Does not create clips or direct art; governs existing clips.
- Does not solve network prediction/rollback; only coherent presentation.
- Does not cover real-time IK beyond its slot in layers (concrete IK lives in locomotion/combat).
- APIs outside the stable list: "(check create.roblox.com/docs)".
