---
name: roblox-vegetation-landscaping
description: Spread natural-looking vegetation with controlled density and cheap collisions. Use it when you need forests, parks, gardens, or landscaping with mobile-friendly performance.
---

# Vegetation and landscaping in Roblox

## Objective

Create plant cover that looks natural, guides the player, and holds framerate: layered distribution, device-adjusted density, and minimal collisions.

## Scope and limits

Does: plant-community design, natural distribution (blobs, edges, clearings), density vs performance, vegetal blocking and collisions, formal gardens and parks.

Does NOT do:

- Base relief sculpting → `roblox-terrain-sculpting`.
- Global materials and variants → `roblox-materials-surfaces`.
- Weather, fog, and seasons → `roblox-lighting-atmosphere`.
- Ambient effects (leaves, pollen, fireflies) → `roblox-ambient-effects`.
- Parks as urban nodes (plazas, zoning) → `roblox-city-settlements`.
- Park props and signage → `roblox-props-decoration`.

Declared differentiation: `roblox-world-building` (installed) is a generalist and thin (154 lines with no auxiliaries); this skill is its deep specialty version (vegetation/landscape only). `roblox-visual-design` and `roblox-art-direction` direct (vegetal palette and style); this skill executes (plants and optimizes).

## Use cases

1. Walkable forest with clearings and legible edges.
2. Urban park with lawn, trees, and formal flowerbeds.
3. Mansion garden with axes and trimmed hedges.
4. Dense jungle that blocks without visible walls.
5. Map running at 20 FPS from too many trees: vegetal diet.

## Step-by-step process

1. **Define 3–5 species, not 20.** E.g. tall tree, mid tree, bush, grass, (starting point). Each species = 1 reusable Model (`VEG_Oak_A`). Verify: all fit in one comparative capture at equal scale.
2. **Assign species to biome.** Species→biome→density table (e.g. oak in temperate forest, palm on coast). Forbid species outside their biome except justified formal gardens.
3. **Plant in layers.** Canopy (tall trees) → understory (mid/shrubs) → ground (grass/flowers). Rule: never bare ground >15 studs in a vegetal biome without reason (clearing, path, rock).
4. **Use blobs and edges, not grids.** Blobs with a starting point of 20–40 studs, high density inside and diffuse edge (density falling off over 10 studs). Verify top-down: no rows or grids visible.
5. **Leave playable clearings.** Clearing with a starting point of 20×20 every 60–80 studs of forest for combat/rest/camera. Mark clearings on the plan before planting.
6. **Tune density per device.** Define 3 levels: High (PC), Medium, Low (mobile) with counts (starting point: 100%/60%/35%). Test on the weakest target device and set the default level.
7. **Minimal collisions.** Thick trunks with simple cylinder collision; branches, leaves, grass, and flowers with no collision. Barrier bushes with one invisible Part per group, not per leaf.
8. **Block with vegetation.** Hedge/green wall with a starting point of 4–6 studs deep to close passages; verify the avatar neither crosses nor jumps it (starting-point height ≥8).
9. **Formal gardens with geometry.** Axes, symmetry, trimmed hedges (green Parts) + 1 focal (fountain/statue). Visual edging: flowerbeds with a border (starting point 1 stud) for readability.
10. **Performance and readability QA.** Count instances per chunk, measure FPS on a standard route, walk it at night (can you see the path?). Reduce first what isn't visible from routes.

## Technical knowledge

- MeshPart for repeated trees: same mesh + scale/rotation variation (starting point ±15%) gives cheap variety.
- Leaf transparency: alpha textures multiply overdraw; on mobile prefer solid low-transparency canopies.
- Draw calls: 3 species repeated 200 times beat 20 unique species; reuse Models.
- Collisions: CanCollide off on everything that doesn't block; one invisible Part per thicket replaces 20 collisions.
- Decal/Texture: for distant grass or flat flowerbeds; they don't replace close-up volume.
- Highlight: not for permanent vegetation; only events (temporarily marking a target tree).
- Wind: canopy motion is an effect (with `roblox-ambient-effects`); here only static distribution.

## Best practices

- Plant from the player route outward: near is detailed, far is suggested.
- Vary rotation and scale, never the base mesh: coherence + mental batching.
- Path edges clean 2–3 studs with no colliding vegetation, for the camera.
- Limited vegetal palette: 3 greens + 1 flower accent; more greens = noise.
- Name `VEG_*` and group per chunk (`CHUNK_A1/VEG`) for fast per-zone diets.

## Common mistakes

1. **Tree grid.** Planting in a perfect grid. Fix: blobs + position jitter.
2. **20 species.** Every tree unique = memory and chaos. Fix: cut to 5 and vary scale.
3. **Everything colliding.** Grass that slows the avatar. Fix: collision only on trunks and barriers.
4. **Invisible wall.** Hedge you can walk through. Fix: 4–6 stud depth + invisible Part + height ≥8.
5. **Jungle at 15 FPS.** PC density on mobile. Fix: apply Low level (35%) and measure.
6. **Massive transparent leaves.** Overdraw on mobile. Fix: solid or semi canopies in key zones.
7. **No clearings.** Impassable dark forest. Fix: 20×20 clearing every 60–80 studs.

## Quality and done criteria

- [ ] ≤5 species, each as a reusable `VEG_*` Model.
- [ ] Top-down with no grids; 20–40 blobs with diffuse edge.
- [ ] 20×20 clearings every 60–80 studs marked on plan.
- [ ] 3 density levels defined and mobile level tested (target FPS met).
- [ ] Collision only on trunks/barriers; grass/flowers collision-free (audit per chunk).
- [ ] Vegetal blockers impassable on foot and in one jump (avatar test).
- [ ] Path visible by day and night (2 captures per route).
- [ ] Vegetal palette ≤3 greens + 1 accent applied.

## Tools

- Models/MeshPart for reusable species; invisible Parts for barriers.
- MaterialService / MaterialVariant for coherent trunks and foliage (palette in `roblox-materials-surfaces`).
- Decal/Texture for distant ground and flat flowerbeds.
- Coordination with Terrain (soil) and ParticleEmitter (leaves/pollen in `roblox-ambient-effects`).

## Limitations

- Does not cover terrain sculpting or weather/seasons (see linked skills).
- Density counts and percentages are starting points, not gospel: measurement on a real device rules.
- Do not claim a tree pack exists without creating or locating it; distinguish a reference photo from an importable asset.
- If you doubt a render limit (instances, transparency), write "(verify at create.roblox.com/docs)".
