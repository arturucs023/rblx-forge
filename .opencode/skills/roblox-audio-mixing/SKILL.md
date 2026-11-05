---
name: roblox-audio-mixing
description: Mix, prioritize, and optimize all game audio. Use it when you need levels per family, ducking, mobile-safe compression, or asset and voice budgets.
---

# Audio Mixing, Priorities, and Optimization

## Objective

Turn a collection of sounds into a mix that reads on any device: levels per
family, priorities and ducking so what matters is always heard, compression
that protects mobile, and asset and voice budgets the project can afford.

## Scope and limits

**Declared differentiation:** the installed `roblox-audio` skill covers the
audio engine and the modern graph (`AudioPlayer`, `AudioEmitter`,
`AudioListener`, `Wire`, effects). This skill does NOT repeat the engine: it
covers the domain design of mixing and optimization (levels,
priorities/ducking, mobile compression, budgets). The installed
`roblox-animation-audio-feedback` skill covers general *juice*; this skill
does not repeat it (a good mix is what lets that juice be heard instead of
drowning in mud).

This skill does NOT do:

- Design of ambience, music, SFX, or engines → covered by
  `roblox-ambient-soundscapes`, `roblox-dynamic-music`, `roblox-sfx-design`,
  and `roblox-vehicle-audio`.
- Step-by-step implementation of the modern graph → covered by
  `roblox-audio`.
- Subtitle accessibility or visual UI → out of scope (coordinate with the
  UI team).

## Use cases

1. Combat drowns voice and footsteps: rebalance by families.
2. The mix distorts on mobile speakers but sounds fine on PC.
3. Too many simultaneous voices tank performance in battles.
4. Audio assets weigh too much for the loading budget.
5. Music competes with SFX in the same frequency band.
6. The player needs working per-family volume controls.

## Step-by-step process

1. **Create one `SoundGroup` per family.** Viable minimum: `Master`,
   `Music`, `Ambience`, `SFX_UI`, `SFX_World`, `Vehicles`, `Voice`. Without
   groups, every adjustment is individual surgery.
2. **Set the level hierarchy.** Typical order: voice > critical SFX > UI >
   music > ambience > decorative. Assign a base level per group (e.g. voice
   1.0, music 0.5, ambience 0.4) and document why.
3. **Define priorities and voice stealing.** Each family has a priority and
   voice cap; on saturation, decorative drops first and critical never does.
   Test saturation by staging the worst case (battle + rain + 5 vehicles).
4. **Implement ducking where it matters.** Under voice or critical SFX,
   music and ambience drop 3–6 dB with fast attack and slow recovery (1–2 s).
   Illustrative example (simplified):
   ```luau
   -- Ilustrativo: ducking de música bajo un anuncio de voz.
   musica.Volume = musica.Volume * 0.5
   task.wait(2)
   -- recuperar con fundido en vez de salto (ver fundidos en skills de dominio)
   musica.Volume = nivelBaseMusica
   ```
5. **Apply protective compression.** A gentle `CompressorEffect` on the
   master bus tames peaks that distort on mobile; an `EqualizerEffect` trims
   useless lows for small speakers. Exact values are tuned by ear, not by
   table.
6. **Set asset budgets.** Cap on total audio size, per-asset duration, and
   simultaneous voices per platform (stricter on mobile). Every new asset
   must fit or displace another.
7. **Optimize formats and durations.** Short loops that chain cleanly,
   trimmed one-shots with no dead air, nothing stereo where mono suffices
   (background ambience, rolling loops).
8. **Expose controls to the player.** Volume per family (at least master,
   music, SFX) + total mute, persisted as a preference. Verify mute truly
   silences every family, including the modern graph.
9. **Reference mix on three devices.** Headphones, phone speaker, and laptop
   speaker. If you only mix on one, you fail on the other two, guaranteed.
10. **Test the worst sonic case.** Multiplayer battle with rain, combat
    music, vehicles, and voice: must stay readable and distortion-free.
11. **Record and freeze the mix.** Group → level → priority → voice cap →
    ducking table. Without a table, every update reintroduces chaos.
12. **Review per platform.** Mobile: fewer voices, fewer lows, more
    conservative levels. PC/console: you can open up, but never break the
    hierarchy.

## Technical knowledge

- The server validates what matters: levels and priorities are client-side
  design, but any gameplay-tied volume (e.g. ducking a rival) must come from
  server-validated data, never from the local preference.
- Persistence: save player volume/mute preferences; the base mix lives in
  versioned configuration, not player data.
- Errors: if an effect (`CompressorEffect`, `EqualizerEffect`) doesn't exist
  in a context, the mix must keep working without it (graceful degradation,
  not silence). Wrap environment-dependent parts in `pcall`.
- `SoundService` as the global bus; `SoundGroup` per family as faders;
  `CompressorEffect` and `EqualizerEffect` as protection and correction.
- With the modern graph (`AudioPlayer`, `AudioEmitter`, `AudioListener`,
  `Wire`), replicate the same bus hierarchy: the mix is the same, only the
  wiring changes (engine detail: `roblox-audio`).

## Best practices

- Mix by families, never sound by sound.
- Ducking with slow recovery: fast pumping tires more than volume.
- Permanent headroom on the master: summed peaks always surprise.
- Written, visible budgets before producing new assets.
- Simple player controls: 3–4 sliders max.
- Revisit the mix after every major audio feature, not just at the end.

## Common mistakes

1. No `SoundGroup` per family → unmaintainable adjustments.
2. Everything at maximum volume → volume war and distortion.
3. Ducking with instant recovery → audible, annoying pumping.
4. Aggressive compression flattening all dynamics → fatigue.
5. Word-only budgets → broken on the first delivery.
6. Mixing only on good headphones → disaster on mobile.
7. Mute that doesn't mute some family (usually ambience or a graph
   emitter) → bug reported on day 1.

## Quality and done criteria

- [ ] `SoundGroup` per family with documented levels and priorities.
- [ ] Music/ambience ducking under voice and critical SFX, no pumping.
- [ ] Protective compression with no audible flattening.
- [ ] Size, duration, and voice budgets defined per platform.
- [ ] Per-family volume controls + total mute, persisted.
- [ ] Mix verified on headphones, mobile, and laptop.
- [ ] Worst sonic case readable and distortion-free.

## Tools

- `SoundService`, `SoundGroup`, `Sound` as the family-mix base.
- `CompressorEffect`, `EqualizerEffect` for protection and correction.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` if the project uses
  the modern graph (engine: `roblox-audio`).
- Preference persistence for player volumes.

## Limitations

- Does not design content (ambience, music, SFX, vehicles): see the four
  domain skills.
- Does not document the modern graph in depth: see `roblox-audio`.
- Does not do visual accessibility or subtitles.
- Check any doubtful API member in create.roblox.com/docs.
