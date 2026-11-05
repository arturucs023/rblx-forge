---
name: roblox-ambient-soundscapes
description: Design layered, zoned ambient soundscapes with smooth transitions. Use it when you need forest, city, cave, rain, day/night ambience, or mixes that change by zone.
---

# Layered, Zoned Ambient Soundscapes

## Objective

Build believable, performance-cheap ambient soundscapes: independent layers (base, detail, sporadic events) that enter and leave according to the player's zone, time of day, and weather, with transitions free of cuts or perceptible volume jumps.

## Scope and limits

**Declared differentiation:** the installed `roblox-audio` skill covers the audio engine and the modern graph (`AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire`, effects). This skill does NOT repeat the engine: it covers domain design of ambience (layers, zones, day/night, transitions). The installed `roblox-animation-audio-feedback` skill covers general *juice* and interaction feel; this skill does not repeat it (it references it for feel accents where a zone change deserves one).

This skill does NOT do:

- Adaptive musical composition → covered by `roblox-dynamic-music`.
- One-shot design for UI, footsteps, or impacts → covered by `roblox-sfx-design`.
- Global mixing, compression, and asset budgets → covered by `roblox-audio-mixing`.
- Voice chat or voice moderation → covered by the engine (`roblox-audio`) and `VoiceChatService` (check exact members in create.roblox.com/docs).

## Use cases

1. Forest with wind base + sporadic birds + stream only near the river.
2. City with distant daytime traffic that drops at night while crickets rise.
3. Cave with random dripping and a perceived tighter reverb.
4. Global rain with an attenuated indoor layer under roofs.
5. Danger zone with a low tension layer entering by proximity.
6. Day/night transition with a 10–20 second crossfade and no silences.

## Step-by-step process

1. **Inventory the zones.** List each biome or interior with its approximate rectangle or radius. Don't go beyond 6–8 zones with their own audio in a first pass.
2. **Define 2–4 layers per zone.** Continuous base (wind, traffic), detail (leaves, echoes), and sporadics (owl, drip). The base uses a `Sound` with `Looped = true`; sporadics are one-shots on a random timer.
3. **Assign each layer to a `SoundGroup`.** For example: `AmbienceBase`, `AmbienceDetail`, `AmbienceOneshots`. This lets you mix by family without touching individual volumes (how to mix is `roblox-audio-mixing`'s job).
4. **Choose global vs. positional emitter.** Zone bases: non-positional `Sound` (or `AudioEmitter` global per the graph used). Details tied to a point (waterfall, generator): positional sound with `RollOffMaxDistance` tuned.
5. **Implement zone detection on the server.** The server determines which zone each player is in (by position) and replicates it; the client only mixes. The server validates what matters: never trust the client to decide zones with gameplay effect (audible danger zone).
6. **Program crossfades, not cuts.** On zone change, interpolate the outgoing layer's `Volume` to 0 over 2–4 s and the incoming one to its level over 2–4 s. Illustrative example (simplified):
   ```luau
   -- Ilustrativo: fundido de una capa ambiental.
   local TweenService = game:GetService("TweenService")
   local info = TweenInfo.new(3, Enum.EasingStyle.Linear)
   TweenService:Create(capaSaliente, info, { Volume = 0 }):Play()
   capaEntrante:Play()
   TweenService:Create(capaEntrante, info, { Volume = 0.6 }):Play()
   ```
7. **Add variation to sporadics.** Random interval (e.g. 8–25 s) and slightly random `PlaybackSpeed` (0.92–1.08) to avoid mechanical repetition. If it sounds robotic, return to this step before adding more sounds.
8. **Treat day/night as two mixes.** Define day and night levels per layer and interpolate with game time over 10–20 s. Don't stop and restart sounds: only move volumes.
9. **Attenuate interiors.** Under a roof, lower the exterior layer (0.2–0.4 of level) and raise an interior layer (slight reverb, creaks). Detect interiors with a vertical raycast or a marked zone, not by blind client.
10. **Consider `VoiceChatService`.** Ambience must never mask voice: reserve volume headroom and document that voice mixing is governed by the engine (`roblox-audio`). If in doubt about a member of the service, write "(check create.roblox.com/docs)".
11. **Test with real walkthroughs.** Walk between zones, enter and leave interiors, and switch day/night. Note every click, cut, or volume jump.
12. **Trim and freeze.** Remove layers nobody notices in a blind test. Every simultaneous sound costs; fewer well-mixed layers sound better.

## Technical knowledge

- The server validates what matters: each player's active zone and any gameplay-effect flag are computed on the server and replicated with `RemoteEvent` (fine transport is the installed `roblox-networking` and `roblox-security` skills' job).
- Persistence: the player's ambience preferences (ambience volume, mute) may be saved in `DataStoreService` (check quota and exact API in create.roblox.com/docs); transient state (current zone, fade phase) is NOT persisted, it is recomputed on entry.
- Errors: wrap zone resolution in `pcall` if it depends on external data; on error, fall back to a safe neutral mix instead of silencing everything.
- `SoundService` governs global listening; `SoundGroup` groups by family; `EqualizerEffect` / `CompressorEffect` belong to mixing (`roblox-audio-mixing`), not this skill.
- Positional sounds use distance attenuation; tune `RollOffMaxDistance` so detail dies before contaminating the neighboring zone.

## Best practices

- Maximum 3–4 simultaneous layers per player on mobile.
- Loops of at least 8–15 s, with start and end that chain without clicks.
- Name assets by convention: `AMB_bosque_base_v1`.
- Document per zone: layers, day/night levels, fade times.
- Test with headphones and with a phone speaker: what works on one is guaranteed to saturate on the other.
- Leave a "designed silence": not every zone needs 3 layers.

## Common mistakes

1. Cutting sounds on zone change instead of fading → clicks and dips.
2. Too many simultaneous layers → sonic mud and performance cost.
3. Sporadics on a fixed interval → the brain detects the pattern within minutes.
4. Letting the client decide gameplay-effect zones → exploitable.
5. Raising ambience until it covers voice → guaranteed complaints.
6. Short loops (2–3 s) with an audible seam → instant fatigue.
7. Not testing the night→day transition, only day→night → surprises at dawn.

## Quality and done criteria

- [ ] Each zone has its documented mix (layers + day/night levels).
- [ ] No zone change produces cuts, clicks, or silences.
- [ ] Day/night transitions over 10–20 s with no restarts.
- [ ] Interiors attenuate the exterior audibly but not abruptly.
- [ ] After 5 minutes of play, no sporadic feels repetitive.
- [ ] Voice stays intelligible with ambience at maximum (reserved headroom).
- [ ] Full walkthrough test with no noted anomalies.

## Tools

- `Sound`, `SoundGroup`, `SoundService` for family-based layers and mixing.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` if the project uses the modern graph (engine detail: `roblox-audio`).
- `VoiceChatService` only as a coexistence consideration with voice.
- `RemoteEvent` to replicate the server-computed active zone.
- `TweenService` (check exact name in create.roblox.com/docs) or manual interpolation for fades.

## Limitations

- Does not design music or SFX: see `roblox-dynamic-music` and `roblox-sfx-design`.
- Does not set the final mix or budgets: see `roblox-audio-mixing`.
- Does not document the modern graph in depth: see `roblox-audio`.
- Feel accents and impacts are `roblox-animation-audio-feedback`'s job.
- If an API member is not listed here, check it in create.roblox.com/docs before using it.
