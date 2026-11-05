---
name: roblox-lighting-atmosphere
description: Create atmosphere and weather with fog, rain, god-rays, and moderate post-effects. Use it when you need Atmosphere, storms, weather transitions, or ambient mood.
---

# Atmosphere and Weather in Roblox

## Objective

Give the map air and weather: depth with fog, drama with storms or god-rays, and weather transitions that don't break readability or performance.

## Scope and limits

Does: Atmosphere and fog, visual rain/storm/snow, god-rays and light shafts, weather transitions, post-effects (Bloom, ColorCorrection, SunRays, DepthOfField) in moderation.

Does NOT do:

- Base day/night scheme and lamppost budgets → `roblox-lighting-day-night`.
- Ambient particle effects (dust, leaves, fireflies) → `roblox-ambient-effects`.
- Terrain and biomes → `roblox-terrain-sculpting`.
- Vegetation → `roblox-vegetation-landscaping`.
- Props and signage → `roblox-props-decoration`.

Declared differentiation: `roblox-world-building` (installed) is a concise generalist (154 lines with no helpers); this skill is its deep specialty version (atmosphere/weather only). `roblox-visual-design` and `roblox-art-direction` direct (approve mood); this skill executes (parameterizes weather). `roblox-vfx` covers emitter technique (how an emitter works); this skill covers ambient effects (when and how much weather to use).

## Use cases

1. Valley with morning fog that adds depth without hiding routes.
2. Storm that announces the final dungeon without leaving the game dark.
3. Cathedral interior with believable god-rays over the altar.
4. Sunny→rain transition accompanying a narrative event.
5. Map abusing Bloom and SunRays that needs a post-effect diet.

## Step-by-step process

1. **Pick 2–3 weathers, not 8.** E.g. clear / fog / storm (starting points). Each weather = sheet with fog, light, post-effects, and planned audio. Verify: a third party tells the 3 apart in captures.
2. **Fog first, post-effects after.** Starting density: background fades at 200+ studs, route readable at 80. Rule: if the main route disappears, the fog is too much no matter how pretty.
3. **Atmosphere with low contrast.** Starting point: soft density, small offset, colors close to sky. Tune by day and check at night: night fog must not become a white wall.
4. **Rain/storm in layers.** Layer 1: slight darkening + denser fog. Layer 2: sound and flashes (with audio). Layer 3: rain visible only near the player (starting radius 60 studs). Never rain over the whole map at once.
5. **God-rays with geometry + light.** Visible beam = SpotLight or SurfaceLight + clear volume (dust in `roblox-ambient-effects`) + soft SunRaysEffect. Verify: the beam reads from the player angle, not just in the editor.
6. **Post-effects with moderation and order.** Starting order: ColorCorrection (base) → Bloom (low) → SunRays (only scenes with visible sun) → DepthOfField (only cinematics/menus). Forbidden: high Bloom + high SunRays together in gameplay.
7. **3-phase weather transitions.** Warning (30 s: clouds/fog rise) → climax (full weather) → return (60 s to clear). Starting total duration 3–5 min. Record and verify with no jumps.
8. **Protect readability.** During storms: raise SurfaceLight on signs and exits one step. Blind test: the player finds the exit and reads 2 signs in full storm.
9. **Mobile budget.** Dense fog + Bloom + SunRays together sink low-end. Define a Mobile level: medium fog, minimal Bloom, SunRays off, rain only nearby. Measure FPS in the storm, not in clear weather.
10. **Freeze weather sheets.** Save `CLIMA_Clear`, `CLIMA_Fog`, `CLIMA_Storm` with values + 3 captures each. Every event that changes weather references a sheet, never loose values.

## Technical knowledge

- Atmosphere: density, offset, colors, and decay control aerial depth. Small values change a lot; adjust in steps of 5 (starting point) and capture.
- Fog as a closing tool: hides map edges and distant LOD better than walls.
- BloomEffect: glow on highlights; low starting intensity (not truth). High = everything blows out and mobile suffers.
- ColorCorrectionEffect: global contrast/saturation/tint; one subtle pass unifies disparate biomes.
- SunRaysEffect: glow around the sun; only with the sun on screen; useless and costly at night or indoors.
- DepthOfFieldEffect: distance blur; reserved for cinematics, menus, and photos. Off in mobile gameplay.
- Beam: useful for static light shafts (window, crack) with soft texture; 1–2 per scene, not 20.

## Best practices

- One memorable weather = one dominant effect + subtle rest. Three dominant effects = noise.
- Fog tells time (morning) and place (swamp, coast); don't use it the same everywhere.
- A short intense storm beats eternal lukewarm rain.
- Few motivated god-rays (window, crack, altar); a forest with 30 shafts looks like a disco.
- Document which weather goes with each district/biome in a table.

## Common mistakes

1. **Fog wall.** Density hiding at 30 studs. Fix: route readable at 80 minimum.
2. **Nuclear bloom.** Everything glows, nothing reads. Fix: drop to minimum and raise only landmarks.
3. **SunRays at night.** Glow with no sun. Fix: turn SunRays off in night presets.
4. **Global rain.** Raining the same in cave and desert. Fix: zoned rain + 60 radius around the player.
5. **DepthOfField in gameplay.** Everything blurry while running. Fix: cinematics/menus only.
6. **Instant transition.** Sun to storm in 1 s. Fix: 3 phases over 3–5 min.
7. **Unplayable storm.** Darkness + noise = abandonment. Fix: protect exits and signs with extra light.

## Quality and done criteria

- [ ] 2–3 weather sheets distinguishable by a third party in captures.
- [ ] Route readable at 80 studs in the densest weather (photo).
- [ ] Post-effects: never high Bloom + high SunRays together in gameplay.
- [ ] Motivated god-rays (1–2 per scene) visible from the player angle.
- [ ] Recorded transition with no jumps, 3 phases documented.
- [ ] Blind storm test: exit + 2 signs found.
- [ ] Mobile level defined and measured in storm with acceptable FPS.
- [ ] `CLIMA_*` sheets saved with values and captures.

## Tools

- Atmosphere for fog and aerial depth.
- BloomEffect / ColorCorrectionEffect / SunRaysEffect / DepthOfFieldEffect with moderation and fixed order.
- SpotLight / SurfaceLight for motivated shafts; Beam for static shafts (1–2 per scene).
- Lighting/ClockTime inherited from `roblox-lighting-day-night`; here only modulated by weather.

## Limitations

- No particles (rain as an emitter is coordinated with `roblox-ambient-effects` and `roblox-vfx`).
- No base day/night cycle design (see linked skill).
- Density and intensity values are starting points, not truth.
- If unsure about an exact property, write "(see create.roblox.com/docs)".
- Distinguish visual reference (storm photo) from importable sheet: the sheet only exists saved and captured.
