---
name: roblox-terrain-sculpting
description: Sculpts believable terrain with biomes, rivers, and mountains in chunks. Use it when you need Terrain, biome transitions, large maps, or playable relief.
---

# Terrain sculpting in Roblox

## Objective

Build playable, legible relief: mountains you can climb, rivers you can cross, biomes with believable transitions, and large maps split into chunks with controlled cost.

## Scope and limits

Does: relief planning, sculpting with the Terrain editor, biomes and transitions, rivers/lakes/mountains, playable paths and slopes, splitting large maps into chunks.

Does NOT do:

- Buildings on top of terrain → `roblox-exterior-architecture`.
- Cities and zoning → `roblox-city-settlements`.
- Vegetation and landscaping → `roblox-vegetation-landscaping`.
- Global material palette → `roblox-materials-surfaces`.
- Atmosphere, fog, and weather → `roblox-lighting-atmosphere`.
- Ambient effects (leaves, dust) → `roblox-ambient-effects`.

Declared differentiation: `roblox-world-building` (installed) is a generalist and thin (154 lines with no auxiliaries); this skill is its deep specialty version (terrain only). `roblox-visual-design` and `roblox-art-direction` direct (they approve biomes and palette); this skill executes (sculpts and blends).

## Use cases

1. Starter island with beach, hill, and crossable river.
2. Valley with 3 biomes (meadow/forest/rock) and smooth transitions.
3. Background mountain range that closes the map with no gameplay cost.
4. Large 800+ stud map split into chunks with visual LOD.
5. Existing unplayable terrain (impossible slopes, stranded water).

## Step-by-step process

1. **Draw a 2D height map.** Sketch on paper or an image: water (blue), flat (green), hill (yellow), mountain (brown). Lock the highest and lowest points before touching the editor.
2. **Block out masses with a large brush.** Starting-point size large (e.g. 1/3 of the map), low strength. Only 3 levels: water, flat, high. Check: top-down capture legible in 3 blobs.
3. **Paint biomes in blobs, not pixels.** Each biome = an ellipse of 60+ studs with a dominant Terrain material + 1 secondary. Rule: no material change in strips <10 studs (avoids noise).
4. **Create transitions with an intermediate band.** Between rock and grass, a dirt/gravel band with a starting point of 8–15 studs. Paint with low opacity and 2–3 passes; verify at ground level, not just top-down.
5. **Sculpt rivers from top to bottom.** Channel with a starting point of 6–10 studs wide, 3–5 deep below the bank, continuous slope with no steps. Test: walk the river; if there are jumps, smooth them.
6. **Mountains in layers.** Wide base → shoulders → summit. Playable slope with a starting point of ≤45° on marked routes; walls >60° only as non-climbable backdrop with a visual barrier (rocks, fog).
7. **Playable paths and slopes.** Path with a starting point of 6–8 studs, a slope the avatar climbs without jumping (test with a base avatar, no gear). Add switchbacks where the slope fails.
8. **Enclosed, legible water.** Lakes with a full shoreline (no visual leaks), depth legible by color. Verify: the player can tell wadeable (<3 studs) from deep at a glance.
9. **Split large maps into chunks.** Grid with a starting point of 200×200 studs per chunk/folder (`CHUNK_A1`). Edges with visual overlap (hill or forest) to hide seams. Test loading chunk by chunk.
10. **Traversal and cost QA.** Run, jump, and swim for 10 min; log snags, falls, and ugly spots. Measure Terrain size and reduce detail in non-playable backdrop first.

## Technical knowledge

- Terrain editor: sculpt, smooth, paint, and water brushes. Always work from large to small and from soft to detailed; premature detail is lost when smoothing.
- Terrain materials: limited engine palette; pick 3–5 and repeat (coordinate with `roblox-materials-surfaces`). Fewer materials = cleaner transitions.
- Slopes: the avatar climbs moderate slopes; above ~45° it needs jumps or switchbacks (starting point, verify at create.roblox.com/docs if in doubt).
- Terrain water: a volume with a level; avoid thin sheets over void (leaks show through). Banks with a sand/gravel band for readability.
- Chunks: logical division (folders + visual overlaps), not an engine-physics feature except via streaming; document which chunk holds each biome.
- Collisions: Terrain collides by default; add invisible Parts only on edges and backdrop summits to block exits.
- Performance: fine detail everywhere costs; concentrate visual resolution within 150 studs of routes.

## Best practices

- Back up the terrain before each phase (dated name): sculpting has no reliable infinite undo.
- Fog and a mountainous backdrop hide the map edge better than a wall.
- Repeat 3–4 formations (hill type, bank type) instead of sculpting 20 unique ones.
- Always paint against a neutral daytime reference (starting-point ClockTime 14, not gospel); at night everything looks like a different biome.
- Document materials per biome in a visible table for whoever plants vegetation later.

## Common mistakes

1. **Material spaghetti.** 8 materials mixed across 30 studs. Fix: 2 per biome + intermediate band.
2. **Stepped river.** Water in disconnected terraces. Fix: continuous slope from top to bottom.
3. **Staircase mountain.** Impossible 90° terraces. Fix: smooth + switchback route.
4. **Beach with no shoreline.** Water cut hard against grass. Fix: 6–10 stud sand band.
5. **Single-chunk map.** 800 studs in one unmanageable piece. Fix: 200×200 grid.
6. **Playable backdrop.** The player climbs the backdrop mountain and sees the void. Fix: rock barrier + fog.
7. **Premature detail.** Fine texture before masses. Fix: go back to a large brush and re-block.

## Quality and done criteria

- [ ] Prior height map archived as reference.
- [ ] 3 blobs legible in top-down capture (water/flat/high).
- [ ] Transitions with an 8–15 stud band, no strips <10 studs.
- [ ] River walkable with no jumps; wadeable vs deep legible.
- [ ] Marked routes climbable with no gear (test video).
- [ ] Named 200×200 chunks with overlaps hiding seams.
- [ ] Backup saved per phase.
- [ ] 10-min traversal with no snags or unfair falls.

## Tools

- Terrain and its editor (sculpt/smooth/paint/water) as the primary tool.
- Invisible Parts for edge and backdrop-summit blockers.
- Lighting with neutral daytime ClockTime for painting (details in `roblox-lighting-day-night`).
- Atmosphere/soft fog to close the horizon (weather in `roblox-lighting-atmosphere`).

## Limitations

- Does not cover vegetation, water gameplay (damage, currents), or biome scripting.
- Brush, chunk, and slope measurements are starting points, not gospel.
- If you doubt an engine limit (size, resolution), write "(verify at create.roblox.com/docs)".
- Distinguish a visual reference (landscape photo) from an importable asset: do not claim a heightmap or pack exists without creating or locating it.
