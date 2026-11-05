---
name: roblox-sfx-design
description: Design UI, interaction, and character SFX with anti-repetition variation. Use it when you need clicks, footsteps, jumps, impacts, pickups, or action sound feedback.
---

# UI, Interaction, and Character SFX Design

## Objective

Create short, readable sound effects that confirm every player action (UI, footsteps, jumps, hits, pickups) with enough variation to avoid fatigue over hundreds of repetitions, within a clear budget of assets and simultaneous voices.

## Scope and limits

**Declared differentiation:** the installed skill `roblox-audio` covers the engine and the modern graph (`AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire`, effects). This skill does NOT repeat the engine: it covers per-domain SFX design (one-shots, variation, usage budgets). The installed skill `roblox-animation-audio-feedback` covers general *juice* and movement feel; this skill does not repeat it (it references it to sync SFX with animations and feel markers).

This skill does NOT do:

- Continuous ambiences per zone → covered by `roblox-ambient-soundscapes`.
- Adaptive music → covered by `roblox-dynamic-music`.
- Engine and vehicle audio → covered by `roblox-vehicle-audio`.
- Global mix and compression → covered by `roblox-audio-mixing`.

## Use cases

1. UI clicks (hover, press, error, purchase) consistent across the game.
2. Footsteps that change by surface (grass, stone, wood, metal).
3. Jump, landing, and character damage with believable weight.
4. Sword impacting flesh, wood, stone, or missing, with distinct sounds.
5. Coin pickup that does not drill after 200 pickups.
6. Mobile game with a strict voice and asset-size budget.

## Step-by-step process

1. **List every action with SFX.** UI, movement, combat, interaction, system (achievement, error). If it is not on the list, it does not exist: orphan SFX appear late and wrong.
2. **Classify by priority.** Critical (damage taken, purchase error), normal (footsteps, clicks), and decorative (extra sparkles). Under saturation, decorative ones drop first.
3. **Set the budget.** Cap simultaneous voices (e.g. 8–12 on mobile) and total SFX size. Everything you design must fit; if not, cut before producing.
4. **Design short one-shots with clear attack.** 0.1–0.5 s for UI and footsteps; up to 1 s for major impacts. An SFX that takes time to "come in" feels like lag.
5. **Add anti-repetition variation.** 3–5 variants per frequent SFX or a random `PlaybackSpeed` of 0.94–1.06 plus volume ±10%. Illustrative example (simplified):
    ```luau
    -- Ilustrativo: paso con variación de tono y volumen.
    local variantes = { paso1, paso2, paso3 }
    local elegido = variantes[math.random(1, #variantes)]
    elegido.PlaybackSpeed = 0.94 + math.random() * 0.12
    elegido.Volume = 0.45 + math.random() * 0.1
    elegido:Play()
    ```
6. **Map surfaces and materials.** Material→sound table for footsteps and impacts. The server validates what matters: the real material of the impact is confirmed on the server (transport and fine validation: `roblox-networking`, `roblox-security`).
7. **Spatialize what happens in the world.** World SFX as positional sound with cutoff distance; UI always non-positional and centered.
8. **Sync with animation.** Fire footsteps and impacts from animation events, not from eyeballed timers. Timing feel belongs to `roblox-animation-audio-feedback`: coordinate with it.
9. **Apply repetition limits.** Minimum cooldown per SFX (e.g. footsteps every 0.25 s, coin every 0.05 s with voice stealing: oldest gets cut).
10. **Test fatigue.** Repeat each frequent SFX 100 times in a row. If it annoys, add variants or cut highs before continuing.
11. **Verify on mobile.** Small speakers exaggerate highs and distort lows: test the full SFX table on a real device or equivalent profile.
12. **Freeze the table.** Final document: action → asset → priority → cooldown → variants. Without a document, chaos returns on the first update.

## Technical knowledge

- The server validates what matters: impacts with damage, purchases, and economy events are confirmed on the server; the SFX is feedback, never proof the action counted. Validation details belong to `roblox-security`.
- Persistence: only preferences (SFX volume, mute); cooldown and variant state is ephemeral and not saved.
- Errors: if an SFX asset fails, the game continues without it and logs it; no `Play` may break gameplay. Wrap external loads in `pcall`.
- Group into your own `SoundGroup`s (`SFX_UI`, `SFX_World`, `SFX_Player`) to mix by family and mute separately.
- Non-positional `Sound` for UI; positional with attenuation for world. If the project uses `AudioEmitter`/`AudioPlayer`, the graph belongs to `roblox-audio`.

## Best practices

- Fast attack, short tail: the sooner the SFX ends, the less it gets in the way.
- 3–5 variants for anything that plays more than 50 times per session.
- Cooldowns per SFX, not global: footsteps must not mute damage.
- Name by convention: `SFX_ui_click_v2`, `SFX_step_grass_03`.
- Leave headroom: no SFX mastered to the limit; the mix adds them up.
- Accessibility: every critical SFX information must have a visual echo.

## Common mistakes

1. A single sample for footsteps or coins → fatigue in minutes.
2. Long SFX overlapping themselves → mud and saturation.
3. Firing SFX on timers instead of animation events.
4. Positional UI or non-positional world → spatial disorientation.
5. No cooldown: 20 coins at once blow up the mix.
6. Trusting the outcome (damage, purchase) to the client SFX → exploitable.
7. Not testing on a mobile speaker → killer highs in production.

## Quality and done criteria

- [ ] Full table action → asset → priority → cooldown → variants.
- [ ] Frequent SFX survive 100 repetitions without obvious fatigue.
- [ ] Footsteps and impacts vary by real surface/material.
- [ ] Non-positional UI; positional world with cutoff distance.
- [ ] Cooldowns and voice stealing implemented and tested under saturation.
- [ ] Events with effect (damage, purchase) validated on server.
- [ ] Table verified on mobile with no distortion or harshness.

## Tools

- `Sound`, `SoundGroup` (`SFX_UI`, `SFX_World`, `SFX_Player`), `SoundService`.
- `AudioPlayer`, `AudioEmitter`, `AudioListener`, `Wire` if the project uses the modern graph (engine: `roblox-audio`).
- `RemoteEvent` to announce server-validated SFX events.
- Animation events as sync triggers.

## Limitations

- Does not design ambiences, music, or engines: defer to `roblox-ambient-soundscapes`, `roblox-dynamic-music`, and `roblox-vehicle-audio`.
- Does not set global mix or compression: defer to `roblox-audio-mixing`.
- Animation feel and flourishes belong to `roblox-animation-audio-feedback`.
- Verify any dubious API member in create.roblox.com/docs.
