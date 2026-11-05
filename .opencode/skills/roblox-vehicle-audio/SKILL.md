---
name: roblox-vehicle-audio
description: Design vehicle audio with RPM-driven engines, surfaces, and horns. Use it when you need cars, bikes, boats, or ships with believable sound inside and out.
---

# Believable, cheap vehicle audio

## Objective

Give each vehicle a legible sound signature: an engine that follows RPM and
load, rolling that changes with surface, brakes, horn, and interior/exterior
difference, without multiplying voices or breaking the mix.

## Scope and limits

**Declared differentiation:** the installed `roblox-audio` skill covers the
audio engine and the modern graph (`AudioPlayer`, `AudioEmitter`,
`AudioListener`, `Wire`, effects). This skill does NOT repeat the engine: it
covers vehicle-domain design (RPM/load engine, surfaces, horn,
interior/exterior). The installed `roblox-animation-audio-feedback` skill
covers general *juice*; this skill doesn't repeat it (it references it for
finishing touches like skids with feel).

This skill does NOT do:

- Generic UI or character SFX → covered by `roblox-sfx-design`.
- Track or city ambiences → covered by `roblox-ambient-soundscapes`.
- Global mixing and compression → covered by `roblox-audio-mixing`.
- Vehicle physics or networking (ownership, interpolation) → fine transport
  and replication in `roblox-networking` and `roblox-state-replication`.

## Use cases

1. Car whose engine rises with RPM and growls under load uphill.
2. Bike with a sharp signature distinguishable from a car at 50 m.
3. Boat with a deep engine + splashing proportional to speed.
4. Surfaces: asphalt, dirt, grass with distinct rolling.
5. Horn and reverse beeps without wrecking the mix.
6. Interior view with filtered engine and exterior with perceived Doppler pass.

## Step-by-step process

1. **Pick the engine model.** Option A (cheap): one loop with `PlaybackSpeed`
   tied to RPM. Option B (rich): 2–3 loops (idle, mid, high) with
   crossfade per RPM range. Start with A; move to B only if A sounds like
   a toy.
2. **Map RPM→pitch and load→character.** Pitch follows RPM; add a
   low layer or slight saturation with load (throttle/hill). Without a load
   layer, every car sounds like a vacuum cleaner.
3. **Smooth the RPM signal.** Interpolate the RPM shown to audio (e.g.
   0.15–0.25s moving average) so pitch doesn't wobble. Audio forgives
   less jitter than the speedometer.
4. **Add per-surface rolling.** A filtered noise layer whose volume
   follows speed and whose character changes per surface (asphalt/dirt/grass
   table). Illustrative simplified example:
    ```luau
    -- Ilustrativo: rodadura según velocidad y superficie.
    local nivel = math.clamp(velocidad / velocidadMax, 0, 1)
    rodadura.Volume = nivel * volumenPorSuperficie[superficie]
    rodadura.PlaybackSpeed = 0.8 + nivel * 0.5
    ```
5. **Design discrete events.** Start, horn, braking, skid, crash,
   reverse. One-shots with cooldown; the horn with a duration or
   repetition limit to prevent sound trolling.
6. **Separate interior and exterior.** Interior: engine with fewer highs and
   more body, attenuated rolling. Exterior: full engine + rolling. Switch by
   camera (first/third person) with a 0.5–1s fade, not a cut.
7. **Place each vehicle in the world.** Positional sound with an aggressive
   cutoff distance (distant vehicles are the first you can spare). On
   large grids, only the N nearest sound complete.
8. **The server validates what matters.** Real vehicle state (speed,
   surface, active horn) with server authority or range validation;
   the client only sonifies. Fine anti-exploit: `roblox-security`.
9. **Limit voices per vehicle.** Cap per vehicle (e.g. engine + rolling +
   1 event) and a global cap of audible vehicles. Without caps, 10 cars
   sink mobile.
10. **Test limit maneuvers.** Full throttle, braking, skid, chain crash,
     8 vehicles together. Note saturation, cutouts, and engines left
     "stuck" sounding after exiting the car.
11. **Cut sound on exit.** On leaving or destroying the vehicle, fast
     fade (0.3s) and guaranteed stop, even on error paths (use
     `pcall` and cleanup on destruction).
12. **Document the signature per vehicle.** Loops, RPM ranges, surfaces,
     interior/exterior levels. Two vehicles sharing one loop breaks the
     fantasy.

## Technical knowledge

- The server validates what matters: speed, surface, and costly events
  (crashes with damage) are confirmed on the server; the client sonifies
  what's replicated. Fine replication: `roblox-state-replication`, `roblox-networking`.
- Persistence: only preferences (vehicle volume, foreign-horn mute
  if any); vehicle sound state is ephemeral.
- Errors: every vehicle sound stop must have a cleanup path on
  destruction/disconnection; a "stuck" engine is the classic bug. Use
  `pcall` on chained fades.
- Positional `Sound` with attenuation for vehicles; its own `SoundGroup`
  (`Vehicles`) for family mixing and muting.
- If the project uses `AudioEmitter`/`AudioListener`, the graph belongs to
  `roblox-audio`; signature design still belongs to this skill.

## Best practices

- One 4–8s engine loop that holds `PlaybackSpeed` from 0.7 to 1.6 without
  obvious artifacts.
- Interior/exterior as two mixes, not two asset sets.
- Horn with cooldown and max duration: sound trolling arrives on day 1.
- Aggressive cutoff distances; distant silence is free performance.
- Name per vehicle: `VEH_carA_engine_mid_v1`.

## Common mistakes

1. `PlaybackSpeed` only with no load layer → vacuum-cleaner effect.
2. Unsmoothed RPM → shaky, unreal pitch.
3. No cutoff distance → 15 engines audible at once.
4. Engine that keeps sounding after exiting or destroying the vehicle.
5. Horn without limits → griefing weapon.
6. Identical interior and exterior → the interior camera disappoints.
7. Client deciding speed/sound with gameplay effect → exploitable.

## Quality and done criteria

- [ ] Engine follows RPM and load without artifacts across the whole range.
- [ ] Rolling audibly changes with surface and speed.
- [ ] Interior/exterior switch with a fade, no cuts.
- [ ] Horn and events with tested cooldowns and limits.
- [ ] Per-vehicle and global voice caps implemented.
- [ ] No "stuck" engine after exiting, destroying, or disconnecting.
- [ ] Signature documented per vehicle, no loops shared between different ones.

## Tools

- `Sound`, `SoundGroup` (`Vehicles`), `SoundService` for signatures and families.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` if the project uses
  the modern graph (engine: `roblox-audio`).
- `RemoteEvent` for server-validated vehicle state.
- Surface detection (raycast or zone) and camera detection for interior/exterior.

## Limitations

- No vehicle physics, networking, or anti-exploit: defer to
  `roblox-networking`, `roblox-state-replication`, and `roblox-security`.
- No generic SFX or ambience design: defer to `roblox-sfx-design` and
  `roblox-ambient-soundscapes`.
- No global mix: defer to `roblox-audio-mixing`.
- Verify any dubious API member at create.roblox.com/docs.
