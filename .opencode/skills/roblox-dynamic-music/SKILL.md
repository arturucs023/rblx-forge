---
name: roblox-dynamic-music
description: Design adaptive layered music by game state. Use it when you need music that shifts between exploration, tension, and combat with seamless loops.
---

# Layered state-driven dynamic music

## Objective

Build a music system that follows the game: instrumental layers that
fade in and out by state (exploration, tension, combat, victory,
defeat), with clean musical transitions and loops that don't show.

## Scope and limits

**Stated differentiation:** the installed `roblox-audio` skill covers the engine
and the modern graph (`AudioPlayer`, `AudioEmitter`, `AudioListener`,
`Wire`, effects). This skill does NOT repeat the engine: it covers domain design of
adaptive music (layers by state, loops, transitions). The installed skill
`roblox-animation-audio-feedback` covers general *juice*; this skill doesn't
repeat it (it references it if a musical change needs a feel accent).

This skill does NOT do:

- Non-musical ambiences by zone → covered by `roblox-ambient-soundscapes`.
- UI, footstep, or impact one-shots → covered by `roblox-sfx-design`.
- Global mixing, ducking, and budgets → covered by `roblox-audio-mixing`.
- Vehicle engine effects → covered by `roblox-vehicle-audio`.

## Use cases

1. Exploring with a soft pad that adds percussion on entering combat.
2. Dungeon with a tension layer that grows by boss proximity.
3. Victory with a 3 s stinger over the base, without stopping the music.
4. Music that ducks automatically in menus and cinematics.
5. Biomes with different themes and a musical bridge between them.
6. Game with no composition budget: two well-used layers beat
   five mediocre tracks.

## Step-by-step process

1. **Define 3–5 music states.** No more at the start: `Calm`, `Tension`,
   `Combat`, plus `Menu` and `Stinger` as special cases. Each extra state
   multiplies transition work.
2. **Compose stackable layers, not separate tracks.** Harmonic base +
   rhythm + melody, all at the same tempo and key, so you can add or
   remove without dissonance. Separate tracks per state almost always clash.
3. **Guarantee seamless loops.** Each layer with `Looped = true`, duration
   a multiple of the bar, and reverb tail trimmed or included in the
   loop. Test each loop isolated for 5 minutes: if the cut shows, it doesn't work.
4. **Centralize music state on the server.** The server validates what matters
   : whether there is combat, whether the boss lives, whether the match ended.
   The client only mixes layers. Replicate changes with `RemoteEvent`.
5. **Design the transition matrix.** For each pair of states, decide:
   direct crossfade (2–4 s), wait for end of bar, or bridge stinger.
   Combat→Calm almost always wants a long fade; Calm→Combat admits an entry-hit
   cut.
6. **Implement per-layer fades.** Illustrative example (simplified):
   ```luau
   -- Ilustrativo: subir la capa de percusión al entrar en combate.
   local TweenService = game:GetService("TweenService")
   local info = TweenInfo.new(2.5, Enum.EasingStyle.Linear)
   capaPercusion:Play()
   TweenService:Create(capaPercusion, info, { Volume = 0.7 }):Play()
   ```
7. **Add stingers for one-off events.** Victory, defeat, discovery:
   one-shot over the base without stopping it. A stinger hides a mediocre crossfade.
8. **Reserve room for voice and SFX.** Music with fewer aggressive upper-mids;
   fine ducking (lowering music under voice/SFX) belongs to
   `roblox-audio-mixing`, but layer design must already leave room.
9. **Handle menus and cinematics.** Lower music to 0.2–0.3 or switch to a minimal
   layer; never stop it cold except on the initial title screen.
10. **Sync changes to gameplay, not to the clock.** The switch to combat
    must fire on the real event (damage, aggro), not on a timer.
11. **Test full sequences.** Calm→Tension→Combat→Victory→Calm with no
    odd pauses, dissonant overlaps, or volume spikes.
12. **Freeze scope.** Adding a sixth state at the last minute breaks the
    transition matrix. Lock states before polishing.

## Technical knowledge

- The server validates what matters: combat state, boss life, match phase.
  The client never decides alone "we are in combat" if that affects
  other systems.
- Persistence: save the player's music preference (volume, mute)
  if the game offers it; live music state (current layer) is recalculated on
  join, never restored from a save.
- Errors: if a layer asset fails to load, continue with the available
  layers and log the failure; never leave the player in total silence
  because of a dropped asset. Use `pcall` where loading is external.
- Group layers in their own `SoundGroup` (`Music`) for global
  volume and mute control with a single setting.
- `Sound` with `Looped = true` is the reliable base; if you use `AudioPlayer` from the
  modern graph, graph details belong to `roblox-audio`.

## Best practices

- Same tempo and key across all stackable layers.
- 2–4 s fades; switches to combat can be faster (1–2 s).
- Name by convention: `MUS_bosque_base_120bpm_v1`.
- Document the transition matrix in a table visible to the whole team.
- Test at low volume: if the music annoys when quiet, it will annoy when loud.
- One good stinger is worth more than a fifth layer.

## Common mistakes

1. Separate tracks per state with different tempo → impossible transition.
2. Stopping and restarting music on every change → gaps and annoying restarts.
3. Letting the client decide music state with gameplay effects.
4. Loop with a click at the seam → noticeable every 30 s for hours.
5. Music competing with voice and SFX in the same band.
6. Too many states at the start → unmanageable transition matrix.
7. Not testing the full sequence, only isolated states.

## Quality and done criteria

- [ ] 3–5 states defined and transition matrix documented.
- [ ] All layers share tempo and key.
- [ ] Each loop holds 5 minutes isolated with no perceptible cut.
- [ ] Full Calm→Combat→Victory sequence with no gaps or dissonance.
- [ ] Stingers for key events implemented without stopping the base.
- [ ] Menus and cinematics with defined music treatment.
- [ ] Player volume/mute preference respected.

## Tools

- `Sound`, `SoundGroup` (`Music`), `SoundService` for layers and global control.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` if the project uses the
  modern graph (engine: `roblox-audio`).
- `RemoteEvent` to replicate music state changes from the server.
- `Volume` interpolation for fades (see illustrative example).

## Limitations

- Does not compose music: assumes composed or legally acquired assets.
- Does not design ambiences or SFX: see `roblox-ambient-soundscapes` and
  `roblox-sfx-design`.
- Does not set final mix or ducking: see `roblox-audio-mixing`.
- Does not document the modern graph in depth: see `roblox-audio`.
- Verify any doubtful API member at create.roblox.com/docs.
