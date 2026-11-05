---
name: roblox-ambient-effects
description: Add subtle ambient effects (dust, fireflies, leaves, local rain) with storytelling. Use it when you need a living ambience on a strict mobile budget.
---

# Ambient Effects in Roblox

## Objective

Bring the air to life with subtle effects —dust, fireflies, leaves, local rain— that tell a story and mark a place, with no visual noise or mobile cost.

## Scope and limits

Does: localized dust/fireflies/leaves/rain, ambient storytelling (what each effect tells), mobile budgets, effect zones and transitions.

Does NOT do:

- Technical emitters in detail (curves, modules) → `roblox-vfx` (covers technical emitters; this skill covers ambient effects: when, where, and how much).
- Global weather, fog, and post-effects → `roblox-lighting-atmosphere`.
- Base day/night cycle → `roblox-lighting-day-night`.
- Planting vegetation → `roblox-vegetation-landscaping`.
- Props and signage → `roblox-props-decoration`.

Declared differentiation: `roblox-world-building` (installed) is generalist and thin (154 lines with no auxiliaries); this skill is its deep version per specialty (ambience only). `roblox-visual-design` and `roblox-art-direction` direct (approve tone); this skill executes (places effects with budget). `roblox-vfx` covers technical emitters; this skill covers ambient effects.

## Use cases

1. Library with dust in light shafts that feels old.
2. Swamp with localized fireflies and low fog.
3. Autumn courtyard with falling leaves that don't block the view.
4. Porch with rain visible outside and a dry shelter inside.
5. Map with 40 global emitters melting mobile: ambient diet.

## Step-by-step process

1. **Assign 1 effect per place.** Place→effect→sentence table (e.g. library→dust→"quiet abandonment"). Forbidden: 2 effects competing within the same 30-stud radius.
2. **Localize with radius, not global.** Each effect lives in a volume (starting point: 20–40 stud radius) with clear entry/exit. Verify: outside the radius it is neither seen nor heard.
3. **Pick the right carrier.** Dust: slow ParticleEmitter in a light shaft. Leaves: ParticleEmitter with fall + ground with leaf Decal. Fireflies: small night-only ParticleEmitter (+ dim PointLight on 1–2 spots only). Local rain: emitter on eaves/window, not on the whole sky.
4. **Parameterize subtle.** Starting point: low rate (e.g. 5–20/s), 2–4 s lifetime, small size, opacity ≤0.5 (starting points, not truth). Rule: if the effect is noticed before the scene, halve it.
5. **Storytelling in 3 touches.** Each effect tells something: origin (where does it come from?), rhythm (constant or gusts?), residue (leaves on the ground, puddles). Without residue it's a decorative empty effect; add 1 Decal or witness prop.
6. **Day/night zones.** Fireflies only at night, dust only with daytime shafts, rain per weather (with `roblox-lighting-atmosphere`). Transition with a 5–10 s starting-point fade, never an abrupt on/off.
7. **Strict mobile budget.** Starting point: ≤3 visible emitters at once, ≤100 simultaneous particles per scene, no shadows on emitters, no collisions. Count on the worst device and cut the least narrative effect first.
8. **Test in motion.** Run, rotate the camera, and jump inside the volume for 60 s. Verify: no hitches, no popping on enter/exit, readable path (the effect doesn't cover exits or signs).
9. **Save kits.** `AMB_Library_Dust`, `AMB_Swamp_Fireflies` as Models with emitter + settings. Reuse a kit before creating a new emitter.
10. **Final QA.** Checklist in § Criteria; disable all effects and compare captures: the scene must work without them (they are a layer, not a crutch).

## Technical knowledge

- ParticleEmitter: rate, lifetime, speed, size, and transparency define the effect. Low rate + medium lifetime = ambience; high rate = event (not here).
- PointLight in effects: maximum 1–2 per scene (firefly spot, lantern with insects); never one PointLight per particle.
- Beam: threads of localized rain, cobwebs with dew, or faint shafts; 1–2 per scene with a soft texture.
- Trail: trails of leaves or sparks in motion; reserved for 1 narrative focus, not general ambience.
- Highlight: not an ambient effect; forbidden as a substitute for light or weather.
- Render distance: emitters with short range (40–60 stud starting point); beyond that, suggest with Decal/fog, not particles.
- Coordination: global weather is set by `roblox-lighting-atmosphere`; here only its local manifestation (rain under the eave, dust in the shaft).

## Best practices

- Subtlety as the norm: the player notices the place, not the emitter.
- One memorable effect per district; silence everywhere else.
- Effects that respect gameplay: never over exits, signs, or intense combat zones.
- Night and rain multiply the effect's value: concentrate them there.
- Document each emitter's radius, rate, and narrative sentence in its name or note.

## Common mistakes

1. **Global emitter.** Dust across the whole map. Fix: 20–40 radius per place.
2. **Event rate.** 200/s for "ambience". Fix: 5–20/s and opacity ≤0.5.
3. **Daytime fireflies.** Visible at noon as noise. Fix: night only + fade.
4. **Blocking effect.** Leaves hiding an exit. Fix: clear exits and signs.
5. **40 emitters.** Mobile melts. Fix: ≤3 visible at once, reused kits.
6. **No residue.** Rain without puddles, leaves without ground cover. Fix: add Decal/witness prop.
7. **Abrupt on/off.** Effect flickering on enter. Fix: 5–10 s fade.

## Quality and done criteria

- [ ] 1 effect per place with a narrative sentence; no competition within 30 studs.
- [ ] Radii 20–40 defined; not perceivable outside the radius (test).
- [ ] Subtle parameters (rate/lifetime/opacity) documented as starting points.
- [ ] Visible residue (Decal/prop) per continuous effect.
- [ ] Day/night/weather transitions with 5–10 s fade, no cuts.
- [ ] Mobile budget: ≤3 emitters and ≤100 particles per scene, measured on the worst device.
- [ ] Path, exits, and signs readable inside the effect (photos).
- [ ] Scene works without effects (on/off comparison archived).

## Tools

- ParticleEmitter as the main carrier (low rates, medium lifetimes).
- PointLight (1–2 spots), Beam (1–2 threads/shafts), and Trail (1 focus) in moderation.
- Decal/Texture for residue (leaves on the ground, puddles, settled dust).
- Coordination with Atmosphere/fog (`roblox-lighting-atmosphere`) and light shaft (`roblox-lighting-day-night`).

## Limitations

- Does not cover gameplay VFX (impacts, abilities, magic) or advanced technical emitters (see `roblox-vfx`).
- Rates, radii, and counts are starting points, not truth: the mobile measurement rules.
- If in doubt about an engine limit, write "(check create.roblox.com/docs)".
- Distinguish visual reference (video of real fireflies) from an importable kit: the kit only exists if saved as a Model.
