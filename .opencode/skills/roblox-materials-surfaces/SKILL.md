---
name: roblox-materials-surfaces
description: Define consistent material palettes with believable wear. Use it when choosing materials, creating variants, mixing texture and flat color, or aging surfaces.
---

# Materials and Surfaces in Roblox

## Objective

Set a short material palette that unifies the game, decide when to use texture vs. flat color, and apply believable wear with no noise or extra cost.

## Scope and limits

Does: material palette per project/district, MaterialVariant, texture-vs-color criteria, wear and aging, consistency across architecture/terrain/props.

Does NOT do:

- Concrete buildings or interiors → `roblox-exterior-architecture`, `roblox-interior-design`.
- Terrain relief and painting → `roblox-terrain-sculpting`.
- Lighting and post-effects → `roblox-lighting-day-night`, `roblox-lighting-atmosphere`.
- Vegetation → `roblox-vegetation-landscaping`.
- Props and signage → `roblox-props-decoration`.

Declared differentiation: `roblox-world-building` (installed) is a concise generalist (154 lines with no helpers); this skill is its deep specialty version (materials/surfaces only). `roblox-visual-design` and `roblox-art-direction` direct (approve palette and realism level); this skill executes (creates variants and applies them).

## Use cases

1. New project needing a closed palette before building.
2. Map with 15 mixed materials needing a diet.
3. Brick/wood/stone finish reusable across 10 buildings.
4. Aging for ruins, harbor, or industrial district.
5. Surfaces that look flat or blow out at night.

## Step-by-step process

1. **Audit what exists.** List materials in use and count: if there are more than 8, diet. Capture 6 representative day and night surfaces.
2. **Set a short palette.** Rule: 3 structural (e.g. stone, wood, plaster) + 2 floors + 1 metallic + 1 accent. Record in a table with allowed and forbidden use.
3. **Create one MaterialVariant per finish, not per object.** E.g. `MV_Red_Brick`, `MV_Dark_Wood`. Verify: each variant is used in ≥3 places; if it appears only once, merge it.
4. **Decide texture vs. color by distance.** Close-up (<20 studs): subtle texture/Decal or geometry. Background (>60 studs): flat color + base material. Mid band: color + 1 detail. Document the rule per district.
5. **Standardize texture scale.** Set tile size per material (starting point: brick 8 studs, wood 6). Verify with a visual ruler: the pattern doesn't visibly repeat at 10 studs.
6. **Apply wear by zone, not globally.** Corners, baseboards (first 2 studs), stair nosings, and frames: 1–2 stud wear band with darker tone or grime Decal. Forbid uniform wear across the whole wall.
7. **Grade aging in 3 levels.** New / worn / ruin, with a table of what changes (color, contrast, stain count). Verify: a third party orders 3 samples from least to most worn.
8. **Night test.** Capture each material with ClockTime night + lights on. Fix: blown ones (whites) get darkened one step; vanishing ones (blacks) get an edge or accent light.
9. **Unify across systems.** Same `MV_Dark_Wood` on building, furniture, and prop. Audit: find duplicate finishes with different names and merge.
10. **Freeze and document.** `MAT_Palette` folder with final variants, usage table, and 6 captures (day/night × 3 biomes). Every new material afterwards needs written justification.

## Technical knowledge

- MaterialService: central variant registry; `MV_*` names with version (`_v1`) for traceability.
- MaterialVariant: reusable finish (color + pattern). Fewer variants = more consistency and less memory.
- Decal/Texture: add grain and coursing; one per large surface maximum; large tiles = less visible repetition.
- MeshPart with its own material: useful for repeated pieces (beams, trims); don't create a unique material per mesh.
- Lighting: the same material changes radically day/night; always validate in both (with `roblox-lighting-day-night`).
- Atmosphere/fog: kills saturation at distance; compensate with background materials one step more saturated (starting point, not truth).
- Contrast: playable surfaces (floor vs. wall, tread vs. riser) need value (light/dark) difference, not just hue.

## Best practices

- Closed palette from day 1; every new material must replace or justify itself.
- Wear where hands and water touch: bottom, corners, edges. Never wall center.
- Pure white and black forbidden as base; reserve white for <5% accents.
- Reuse: one good brick serves 10 buildings with a different frame color.
- Document with captures, not just names: the name lies, the capture doesn't.

## Common mistakes

1. **Material rainbow.** 15 different in one street. Fix: diet to 3+2+1+1.
2. **Variant per object.** 30 single-use variants. Fix: merge into shared finishes.
3. **Global wear.** Whole stained wall = dirt, not age. Fix: baseboard/corner bands.
4. **Micro texture.** 2-stud tile vibrating at distance. Fix: 6–8 tile and test at 10/30/60 studs.
5. **Material blowing out at night.** Pure white + light = blotch. Fix: darken base color one step.
6. **Floor = wall.** Same material and tone: no read. Fix: clear value difference.
7. **Vanishing black.** Black beams invisible at night. Fix: light edge or accent light.

## Quality and done criteria

- [ ] Closed 3+2+1+1 palette documented with allowed/forbidden uses.
- [ ] Each MaterialVariant used in ≥3 places; no name duplicates.
- [ ] Texture-vs-color rule by distance applied and verified at 10/30/60 studs.
- [ ] Wear in zones only (baseboard/corners/edges), 3 levels orderable by a third party.
- [ ] 6+ day/night captures with no blowouts or disappearances.
- [ ] Same finish shared across architecture, furniture, and prop (audit).
- [ ] Frozen `MAT_Palette` folder with table and captures.

## Tools

- MaterialService / MaterialVariant as the central system.
- Decal / Texture for grain and coursing (one per large surface).
- Parts/Models/MeshPart as carriers (don't create material per carrier).
- Day/night Lighting for validation (details in `roblox-lighting-day-night`).

## Limitations

- No building, terrain, or prop design: only their finishes.
- Tile sizes and palette ratios are starting points, not truth.
- If unsure about a material property or variant limit, write "(see create.roblox.com/docs)".
- Distinguish visual reference (real material photo) from importable asset: don't claim a texture exists without creating or locating it.
