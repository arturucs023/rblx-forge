---
name: roblox-interior-design
description: Design playable, comfortable interiors with clear zones and smooth circulation. Use it when laying out rooms, furnishing, lighting interiors, or marking exits.
---

# Interior Design in Roblox

## Objective

Create interiors the player understands in 15 seconds: differentiated zones, jam-free circulation, to-scale furniture, and always-visible exits, with visual comfort for long sessions.

## Scope and limits

Does: interior zoning (living/circulation/service), circulation and passage widths, furniture and scale, layered interior lighting, visual comfort (contrast, saturation, eye rest), exit and emergency readability.

Does NOT do:

- Facades and exterior masses → `roblox-exterior-architecture`.
- City or building footprint layout → `roblox-city-settlements`.
- Materials and variants (global palette) → `roblox-materials-surfaces`.
- Global day/night cycle → `roblox-lighting-day-night`.
- Fine props and signage → `roblox-props-decoration`.
- Ambient effects (dust, helpers) → `roblox-ambient-effects`.

Declared differentiation: `roblox-world-building` (installed) is a concise generalist (154 lines with no helpers); this skill is its deep specialty version (interiors only). `roblox-visual-design` and `roblox-art-direction` direct (define style and palette); this skill executes (lays out and furnishes).

## Use cases

1. Starter house where the player finds bed, exit, and chest with no tutorial.
2. Tavern with bar, tables, and stage where avatars don't get stuck.
3. Office/warehouse with readable work zones and clear evacuation routes.
4. Interior dungeon where every room has identity and the exit is guessable.
5. Existing interior that is dark, maze-like, or empty and needs a rework.

## Step-by-step process

1. **List program and areas.** E.g. living 12×10, kitchen 8×8, bedroom 10×10 (studs, starting points). Sum and verify it fits the building footprint.
2. **Lay out circulation first.** Main corridor starting at 6 studs, secondary 4 studs. Draw with different-colored floor Parts. Rule: any point reaches an exit with at most 2 turns.
3. **Zone with 3 devices.** Floor change (material/color), ceiling height change or false ceiling, and furniture barrier (shelf, counter). Verify: top-down capture with each zone nameable.
4. **Furnish large to small.** Anchor pieces (bed, large table, counter) → secondary (chairs, shelves) → filler. Keep a free radius starting at 4 studs around doors.
5. **Scale to the avatar.** Seat starting at: 2×2 base, 1.5 tall. Table: 3 tall. Counter: 3.5–4 tall. Test: R15 avatar sits/serves without clipping geometry.
6. **Light in layers.** Base: dim overhead `PointLight` every 12–16 studs (starting point). Task: `SpotLight` over table/counter. Accent: warm `SurfaceLight` on backdrop wall. Verify at night: no zone pitch-black and none blown out (no pure white).
7. **Always mark exits.** Exit door with distinct frame color + brighter light + floor line leading to it. Test: from any corner, some exit cue is visible.
8. **Add visual comfort.** Every 20 studs, a rest point: window, plant, painting (Decal), or plain wall. Limit: high saturation only on accents (<10% surface).
9. **Optimize collisions and camera.** Large furniture with simple collision (one invisible Part); small decor with no collision. Minimum free height starting at 7 studs; partitions the camera crosses get marked and lowered or made partial.
10. **Real-use QA.** Walk through with 2–3 avatars at once: no door jams, no blind corners, time to exit <15 s. Adjust widths and repeat.

## Technical knowledge

- PointLight: cheap omnidirectional base light; starting range 20–30 studs, low brightness. Too many PointLights = mobile drop; share and space them.
- SpotLight: ideal for tables and displays; starting angle 40–60 (starting point, not truth).
- SurfaceLight: washes walls and creates readable backdrops; use it on the wall the player faces on entry.
- Lighting and Atmosphere: the interior must work with global values; if the exterior changes (night), the interior keeps its base layer (coordinate with `roblox-lighting-day-night`).
- Decal/Texture: paintings, rugs, and panels; at most one large Decal per wall to avoid memory bloat.
- ViewportFrame: for building maps or wall photos without extra geometry (see create.roblox.com/docs if unsure about limits).
- Sound not covered here; if the interior is visually noisy, cut to 2 dominant materials (coordinate with `roblox-materials-surfaces`).

## Best practices

- Doors always open toward a wide zone, never against furniture.
- Corridors with one furniture-free side: the player hugs the camera to the opposite wall.
- Repeat furniture families (same set 3–4 times) instead of 10 unique pieces: consistency + performance.
- Ceilings: light and matte; a dark ceiling lowers 1 visual stud and doubles darkness.
- Save each room as a Model named `INT_Kitchen_v1` for reuse in other buildings.

## Common mistakes

1. **Partition maze.** 5 turns to exit. Fix: open up spans and apply the 2-turn rule.
2. **Human-scale furniture.** 1-stud chairs the avatar can't fit. Fix: rescale everything ×1.3 vs. real furniture.
3. **Single overhead light.** Burned center, black corners. Fix: 3 layers (base/task/accent).
4. **Camouflaged exit.** Door identical to closets. Fix: distinctive frame + light + floor line.
5. **Total saturation.** Walls, floor, and furniture in vivid colors: fatigue in 5 min. Fix: neutral base, accent <10%.
6. **Collision on every trinket.** Unneeded physics and jams. Fix: collision only on anchor pieces.
7. **5-stud ceiling.** The camera clips and the player sees black. Fix: minimum 7 free studs.

## Quality and done criteria

- [ ] Circulation: exit reachable with ≤2 turns from any point.
- [ ] Free widths verified: main ≥6, secondary ≥4, door radius ≥4 studs.
- [ ] Zones nameable in top-down capture by a third party with no help.
- [ ] Night lighting: no black or blown zones (3 captures).
- [ ] Exit visible from any corner (photo from 4 corners).
- [ ] Walkthrough with 3 avatars with no jams or clipping.
- [ ] Reusable furniture saved as named Models.
- [ ] Saturated accents <10% of visible surface.

## Tools

- Parts/Models for partitions and modular furniture; MeshPart for repeated pieces (chairs, shelves).
- PointLight / SpotLight / SurfaceLight for the 3 light layers.
- Decal / Texture for paintings, rugs, and panels (one per wall maximum).
- Highlight sparingly to mark exits or objectives (coordinate with `roblox-props-decoration` for signage).

## Limitations

- No game systems (shops, interactive chests) or door scripting.
- No global material palette: use `roblox-materials-surfaces`.
- Light values and measurements are starting points, not truth: adjust for style and device.
- Distinguish visual reference (interior moodboard) from importable asset: don't claim furniture exists without creating or locating it.
