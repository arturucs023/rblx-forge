---
name: roblox-city-settlements
description: Plan cities, towns, and settlements with readable districts and streets. Use it when you need zoning, street layout, plaza/landmark placement, or industrial and futuristic district design.
---

# Cities and Settlements in Roblox

## Objective

Lay out settlements the player navigates without a map: districts with identity, streets with hierarchy, plazas as nodes and orienting landmarks, with playable zoning and district-based performance.

## Scope and limits

Does: zoning (residential/commercial/civic/industrial/futuristic as districts), street hierarchy, plazas and nodes, urban landmarks and wayfinding, block parceling and rhythm, per-district identity.

Does NOT do:

- Single-building detail → `roblox-exterior-architecture`.
- Interiors of those buildings → `roblox-interior-design`.
- Terrain sculpting and rivers/mountains → `roblox-terrain-sculpting`.
- Park and street vegetation → `roblox-vegetation-landscaping`.
- Fine signage and props → `roblox-props-decoration`.
- Weather and post-effects → `roblox-lighting-atmosphere`.

Declared differentiation: `roblox-world-building` (installed) is generalist and thin (154 lines with no auxiliaries); this skill is its deep per-specialty version (city/settlement only). `roblox-visual-design` and `roblox-art-direction` direct (approve style per district); this skill executes (lays out and zones). Industrial and futuristic districts are treated here as districts, not as separate skills.

## Use cases

1. Starter town of 3 streets where the player finds the shop, town hall, and exit.
2. Mid-size city with 4 districts with identity and a central plaza.
3. Industrial settlement (factories, chimneys, rails) readable and camera-safe.
4. Futuristic district (towers, walkways, restrained neon) without visual noise.
5. Existing confusing city where everyone gets lost: wayfinding overhaul.

## Step-by-step process

1. **Set playable size and population.** Town: 200×200 stud starting point. City: 400×400+. Rule: 1 landmark every 150 studs max; if the map is bigger, add sub-landmarks.
2. **Define 3–5 districts with an identity sentence.** E.g. "low fishing harbor", "white civic hill", "forge district". Each district: 2 materials + 1 accent color + average height. Record in a table.
3. **Lay the 3-level street hierarchy.** Artery 16-stud starting point, street 10, alley 6. Draw arteries first connecting entrances and plaza; verify connectivity with a jumpless walkthrough.
4. **Place a plaza as a node every 150–200 studs.** Plaza 40×40 starting point with central fountain/statue, perimeter benches, and 3+ exits. Test: from the plaza you see 2+ landmarks or signs.
5. **Put landmarks at crossings and endpoints.** Tower, clock, chimney, arch. Rule: landmark height ≥1.5× district average and unique silhouette. Check visibility at 150 studs.
6. **Parcel blocks with rhythm.** Parcel frontage 16–24-stud starting point; alternate widths to avoid monotony. Leave a courtyard or alley every 4 parcels for camera and shortcuts.
7. **Zone industry as a separate district.** At the visual downwind (map corner), with wide road (16+ starting point), chimneys as landmarks, and muted palette + warm accent. Green buffer or wall with `roblox-vegetation-landscaping`.
8. **Zone futurist as a district, not the whole city.** Contain neons and walkways in 1 district; walkway 6-stud minimum starting point with 3-stud railing. Contrast with a neighboring historic district for orientation.
9. **Apply urban wayfinding.** Every decision (crossing) offers: visible landmark, sign (with `roblox-props-decoration`), or pavement change. Verify with a new player: reaches plaza and exit without asking.
10. **Split into streaming chunks.** One district = 1 folder/Model; name `DIST_Harbor`, `DIST_Forge`. Test loading per part and measure draw calls per district (coordinate with the project's own `roblox-performance-audit`).

## Technical knowledge

- Street scale: 5-stud avatar; a 16-stud artery fits 2 flows + camera; a 6-stud alley is the playable minimum without camera jams.
- Modular block: combine `roblox-exterior-architecture` segments (12 studs) for varied fronts with few assets.
- Highlight: reserve for marking town hall or exit during tutorial, not permanent.
- Beam/Trail: not for the base city; if you mark routes (parade, race), use them temporarily and remove.
- Terrain vs Parts: streets and plazas in flat Parts for control; Terrain only at edges/parks (coordinate with `roblox-terrain-sculpting`).
- Shadows and draw calls: repeated cornices and overhangs multiply shadows; measure per district and simplify the most expensive first.
- Streaming: districts as load units; avoid cross-references (one district's lamppost in another breaks the chunk).

## Best practices

- One good plaza beats 10 signs: invest in nodes, not signage.
- Contrast between neighboring districts (height, color, material) for unconscious orientation.
- Contained industry and futurist: one district each max except on large maps.
- Streets with a visible end (landmark, turn, plaza); avoid endless straight streets with no endpoint.
- Name everything `DIST_*`, `PLAZA_*`, `LM_*` for fast Explorer filtering.

## Common mistakes

1. **Monotonous grid.** 10×10 identical streets: nobody orients. Fix: hierarchy + 2 diagonals or plazas breaking the mesh.
2. **No landmarks.** Everything at the same height. Fix: 1 landmark per district + 1 main one.
3. **Roundabout plaza.** Round space with no use or active edges. Fix: focal center + 3 exits + edges with shops/benches.
4. **Industry in the center.** Noise and blockage. Fix: perimeter district with buffer.
5. **Futurist everywhere.** Global neon = fatigue. Fix: contain it to 1 district.
6. **4-stud streets.** Jams and wedged camera. Fix: minimum 6, arteries 16.
7. **Map with no chunks.** Everything in one folder, heavy load. Fix: 1 folder per district.

## Quality and done criteria

- [ ] New player reaches plaza and exit unaided (test with 2 players).
- [ ] 3–5 districts with applied identity table (materials, color, height).
- [ ] Landmark visible every ≤150 studs (captures from 6 points).
- [ ] Complete street hierarchy: measured artery/street/alley.
- [ ] Plaza every ≤200 studs with focal point and 3+ exits.
- [ ] Industry and futurist (if any) contained in their districts.
- [ ] 1 folder/Model per district, `DIST_*` names, per-part loading tested.
- [ ] No streets without a visual endpoint or crossings without information.

## Tools

- Parts/Models for layout, blocks, and modularity; MeshPart for repeatable landmarks.
- MaterialService / MaterialVariant for per-district identity (palette in `roblox-materials-surfaces`).
- Decal/Texture for pavements and fronts (moderate density).
- PointLight/SpotLight for plazas and axes (night with `roblox-lighting-day-night`).

## Limitations

- Does not design single buildings or interiors (see linked skills).
- Does not compute traffic or urban economy: zoning is visual and playable.
- Street and plaza measurements are starting points, not truth.
- Distinguish visual reference (plan/photo of a real city) from an importable asset: don't claim a pack exists without creating or locating it.
