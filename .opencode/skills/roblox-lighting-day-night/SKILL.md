---
name: roblox-lighting-day-night
description: Set up readable day/night cycles with sun, moon, shadows, and night interiors. Use it when you need ClockTime, transitions, shadows, or night readability.
---

# Day and Night Lighting in Roblox

## Objective

Build a day/night cycle that orients (readable time), moves (distinct dawn/noon/dusk/night), and keeps the game readable at night without frying mobile.

## Scope and limits

Does: Lighting scheme per band, ClockTime and transitions, sun/moon and shadows, night readability, interiors at night, light budgets.

Does NOT do:

- Atmosphere, fog, rain, and post-effects → `roblox-lighting-atmosphere`.
- Ambient effects (fireflies, dust) → `roblox-ambient-effects`.
- Materials and variants → `roblox-materials-surfaces`.
- Lamppost and signage placement → `roblox-props-decoration`.
- Interiors (zones, furniture) → `roblox-interior-design`.

Declared differentiation: `roblox-world-building` (installed) is a concise generalist (154 lines with no helpers); this skill is its deep specialty version (day/night light only). `roblox-visual-design` and `roblox-art-direction` direct (approve mood per band); this skill executes (parameterizes and budgets).

## Use cases

1. New game needing 4 coherent bands (morning/noon/dusk/night).
2. Currently unplayable night: all black or all blown out.
3. Interiors that go dark at night with the sun.
4. Shadows sinking mobile.
5. Day→night transition with visible jumps.

## Step-by-step process

1. **Define 4 bands with a phrase.** E.g. "fresh morning", "harsh noon", "warm dusk", "readable blue night". Set ClockTime per band (starting points: 8, 13, 18, 0 — not truth). Capture each from the same spot.
2. **Set base daylight.** Clear ambient washing shadows + directional sun with shadows on. Verify: a building's north face still reads (no pure black) at noon.
3. **Design night as "blue day", not blackout.** Faint bluish base + warm punctual lampposts. Rule: main route walkable with no lantern; side paths may require one.
4. **Budget lights.** Starting point: 1 PointLight every 15–20 studs on route, SpotLight only on landmarks, SurfaceLight on backdrops. Count per chunk; if a chunk exceeds budget, first turn off redundant ones (two lights overlapping the same radius).
5. **Solve interiors at night.** Interior layer (dim PointLight + task SpotLight) independent of the sun, with day/night logic (brighter at night). Test: interior readable with night outside.
6. **Shadows under control.** Active shadows on main sun/moon; PointLight/SpotLight without shadows except 1–2 hero lights. On mobile, reduce distance/range before turning off the sun.
7. **Smooth transitions.** Change ClockTime and colors by interpolation in small steps (starting point: full cycle ≥5 real min). Verify: record 30 s of dusk; no jumps or flicker.
8. **Sun and moon as compass.** Consistent east dawn / west dusk; starting moon opposite the sun. Document orientation so landmarks use it.
9. **Blind readability test.** New player at night: finds exit, reads 3 signs, and crosses the plaza with no help. If it fails, raise night base before adding more lampposts.
10. **Freeze presets.** Save 4 named presets (`LUZ_Morning`, `LUZ_Noon`, `LUZ_Dusk`, `LUZ_Night`) with values and captures from 3 fixed points. Every later change compares against them.

## Technical knowledge

- Lighting: global container (ambient, directional sun/moon light, ClockTime). All presets live here; document every changed value.
- ClockTime: time of cycle (starting points 8/13/18/0, not truth). Abrupt changes break immersion; always interpolate.
- PointLight: night base and lampposts; starting range 20–30, low brightness. Cost scales with count and overlap.
- SpotLight: landmarks and tasks; starting angle 40–60 (starting point). No shadows except hero cases.
- SurfaceLight: backdrops and guide walls at night; cheap for washing large surfaces.
- Shadows: directional shadow (sun/moon) gives depth; shadows from 20 lampposts kill it on mobile. Prioritize one shadow source.
- BloomEffect/ColorCorrectionEffect in moderation (detail in `roblox-lighting-atmosphere`); here only the minimum for readability.

## Best practices

- Readable night > realistic night: a little blue cheating beats 20 lampposts.
- Warm vs. cold: warm lampposts over a cold base = instant depth.
- Repeat temperature per district for orientation (cold harbor, warm forge).
- Measure on the worst device: night that works on PC can be a black puddle on cheap mobile.
- Always capture from the same 3 points to compare bands.

## Common mistakes

1. **Blackout night.** Base at zero and 3 lampposts. Fix: raise bluish base until the main route walks with no lantern.
2. **Blown-out noon.** All white with no readable shadow. Fix: lower intensity and reinforce fill ambient.
3. **20 lampposts with shadows.** Mobile on its knees. Fix: shadows only on sun/moon + 1 hero.
4. **Interior enslaved to the sun.** At night, black interior. Fix: independent interior layer, brighter at night.
5. **6 PM jump.** Instant transition. Fix: interpolation over a ≥5 min cycle.
6. **Unreadable signs at night.** No dedicated light. Fix: SurfaceLight or SpotLight per key sign (with `roblox-props-decoration`).
7. **Sun switching east to west.** Inconsistent between maps. Fix: document orientation and respect it.

## Quality and done criteria

- [ ] 4 presets with ClockTime and captures from 3 fixed points.
- [ ] Main route walkable at night with no lantern (blind test passed).
- [ ] Interiors readable with night outside (3 captures).
- [ ] Per-chunk light budget met and documented.
- [ ] Shadows: 1 main source + ≤2 hero lights; rest without shadows.
- [ ] 30 s transition recorded with no jumps.
- [ ] Sun/moon orientation documented and consistent.
- [ ] Target worst device tested with acceptable FPS.

## Tools

- Lighting and ClockTime as master controls.
- PointLight / SpotLight / SurfaceLight with per-chunk budget.
- Minimal post-effects (BloomEffect/ColorCorrectionEffect) for readability only; rest in `roblox-lighting-atmosphere`.
- Captures from fixed points as QA instrument.

## Limitations

- No fog, rain, or creative post-effects (see atmosphere skill).
- ClockTime values, ranges, and angles are starting points, not truth.
- If unsure about an exact property, write "(see create.roblox.com/docs)" and don't assert it.
- Distinguish visual reference (dusk photo) from importable preset: the preset only exists if saved and captured.
