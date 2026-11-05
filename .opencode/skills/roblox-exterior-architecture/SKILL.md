---
name: roblox-exterior-architecture
description: Design readable exterior buildings scaled to the avatar. Use it when you need facades, entrances, roofs, bay rhythm, or building masses.
---

# Exterior Architecture in Roblox

## Objective

Produce exterior buildings that read well at distance, walk well up close, and are scaled to the avatar, with clear masses, rhythmic facades, and entrances locatable in under 10 seconds.

## Scope and limits

Does: building masses and proportions, facade composition (bays, rhythm, cornices, bases), entrances and interior/exterior transitions, roofs and caps, scaling to the avatar, modular facade repetition.

Does NOT do:

- Interiors (zones, furniture, internal circulation) → `roblox-interior-design`.
- Urban layout (streets, districts, zoning) → `roblox-city-settlements`.
- Terrain and biomes under the building → `roblox-terrain-sculpting`.
- Perimeter vegetation → `roblox-vegetation-landscaping`.
- Material palette and variants → `roblox-materials-surfaces`.
- Day/night lighting → `roblox-lighting-day-night`.
- Fine decor and signage → `roblox-props-decoration`.

Stated differentiation: the installed `roblox-world-building` is a generalist and fine-grained (154 lines without aids); this skill is its deep version by specialty (exterior architecture only). `roblox-visual-design` and `roblox-art-direction` direct (they decide style and approve); this skill executes (it builds the building).

## Use cases

1. Housing block repeated 6 times on a block without looking cloned.
2. Shop with an entrance the player finds unaided at 40 studs distance.
3. Tower that works as a landmark without breaking neighborhood scale.
4. Industrial warehouse converted into a playable zone with clear facade rhythm.
5. Existing facade remodel that looks flat or out of proportion.

## Step-by-step process

1. **Set program and footprint.** Note: use (housing/shop/civic), floor count, footprint in studs (e.g. starting point: 24×16, not truth). Block the footprint with simple Parts before detailing.
2. **Define the mass in at most 3 volumes.** Base (base, 1 floor), body (repetition), cap (cornice/roof). Verify: silhouette readable in a capture at 150 studs with fog off.
3. **Scale to the avatar.** Door starting point: 4 studs wide × 7 studs tall. Window starting point: sill at 3 studs from the slab. Check with an R15 avatar next to it: the lintel sits at ~1.5× avatar height.
4. **Compose the facade with A-B-A rhythm.** Alternate solid/opening with a fixed module (starting point: 4-stud module). Verifiable rule: no solid panel exceeds 3 modules without a joint, cornice, or plane change.
5. **Mark the entrance.** Set back 2 studs, add canopy or portico, change frame material, and double lighting vs the rest of the facade. Test: at 40 studs and at night, the entrance is the brightest point.
6. **Solve the roof per the game's climate.** Flat with parapet (urban), gabled (rural), sawtooth (industrial). Eaves overhang 1–2 studs; verify it doesn't clip the camera on streets under 12 studs.
7. **Add depth in layers.** Layer 1: base plane. Layer 2: trims/jambs with 0.25–0.5 studs of relief. Layer 3: selective balconies/cornices. Limit: 3 layers max; more layers = noise and overdraw.
8. **Modularize.** Turn a facade bay (starting point: 12 studs) into a reusable Model with pivot at the corner. Name: `FAC_A_Window`, `FAC_B_Blind`, `FAC_Entrance`. Reuse, don't rebuild.
9. **Integrate with ground and street.** 1–2 stud base with resistant material, 4+ stud perimeter sidewalk, ramp wherever a step exceeds 1 stud.
10. **Pass architecture QA.** Checklist in § Criteria; fix and document variants (color/material) in a `Variants` folder.

## Technical knowledge

- Avatar scale: R15 ≈ 5 studs tall. Doors, railings (starting point: 3 studs), and steps (starting point: tread 2, riser 0.6) derive from it. They are starting points, not truth.
- Depth with Parts: pilasters and cornices as thin Parts separated from the wall give cheap real shadow without Decal/Texture.
- MeshPart and SpecialMesh: reserve MeshPart for repeated caps (cornices, capitals); SpecialMesh only for fast prototyping, not for final massive facade.
- Decal/Texture: only for subtle jointing (brick, panels) at low density; if the pattern visibly repeats at 10 studs, increase tile size or switch to geometry.
- MaterialService and MaterialVariant: one MaterialVariant per facade finish (brick, render, panel). Don't create one variant per building.
- Collisions: walls and low cornices with collision; ornaments above 8 studs without collision (CanCollide off) to save physics.
- Camera: on narrow streets (<12 studs) avoid overhangs below 9 studs high; the camera will clip through them.

## Best practices

- Work far to near: silhouette → mass → rhythm → detail. Never detail without blocked mass.
- Repeat with variation: 3 base bays combined give 6+ distinct facades by rotating order and color.
- Controlled contrast: opening frames one tone darker or one different material, never more than 2 materials per facade plus the base.
- Entrance always on a visible corner or symmetry axis; never on a blind side panel.
- Document the module (e.g. "module 4, floor height 8") in the Model name so another builder can reuse it.

## Common mistakes

1. **Dollhouse-scale windows.** 2×2 openings on 12-stud walls: the building looks like a model. Fix: minimum opening starting point 3×4 per 8-stud floor.
2. **Flat facade with texture.** Brick Decal only with no relief: looks like cardboard at night. Fix: add jambs with 0.5 studs of relief.
3. **Six materials on one building.** Visual noise and draw calls. Fix: reduce to 2+base.
4. **Invisible entrance.** Same door as the rest with no canopy or light. Fix: setback + material change + warm PointLight.
5. **Roof clipping the camera.** Large eaves on a narrow street. Fix: reduce overhang or raise eaves above 9 studs.
6. **Obvious clones.** Same facade 6 times in a row. Fix: alternate 3 bays and vary base/cornice.
7. **Accidental monumental scale.** 14-stud floors on housing: the avatar looks like an ant. Fix: housing floor starting point 7–9 studs.

## Quality and done criteria

- [ ] Silhouette readable at 150 studs (capture without fog).
- [ ] Entrance locatable in ≤10 s at 40 studs by day and night.
- [ ] No solid panel >3 modules without articulation.
- [ ] Test avatar next to door: believable proportion (reference photo saved).
- [ ] ≤3 facade materials + base; named MaterialVariants.
- [ ] Modular bay saved as reusable Model with correct pivot.
- [ ] No overhangs blocking the camera on streets <12 studs (recorded walkthrough).
- [ ] Base, sidewalk, and access with no steps >1 stud without a ramp.

## Tools

- Parts and Models for blocking and modularity; MeshPart for repeated caps.
- MaterialService / MaterialVariant for facade finishes.
- Decal / Texture only for subtle jointing (verify density at create.roblox.com/docs if unsure about tiling).
- PointLight / SpotLight to mark entrances (night details with `roblox-lighting-day-night`).

## Limitations

- Does not cover real structural engineering: proportions are visual and playable.
- Does not generate interiors or distribute urban plots (see linked skills).
- If you doubt a Lighting/Atmosphere property when integrating the building, write "(verificar en create.roblox.com/docs)" in the note and don't assert it.
- Distinguish visual reference (inspiration photo/sketch) from importable asset: don't claim a model or texture exists without creating or locating it in the project.
