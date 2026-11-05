---
name: roblox-props-decoration
description: Place props, decor, and signage that guide without cluttering. Use it when you need to furnish scenes, create guide signs/arrows/landmarks, or dress streets and interiors.
---

# Props, Decoration, and Signage in Roblox

## Objective

Dress scenes with props that tell stories and signage that guides: every object has a reason, every sign reads while moving, and no set clutters or slows things down.

## Scope and limits

Does: selection and placement of props, vignette composition (static storytelling), signage and wayfinding (signs, arrows, guide landmarks), density and budgets, decoration collisions.

Does NOT do:

- Structural interior furnishing (zones, circulation) → `roblox-interior-design`.
- Facades and masses → `roblox-exterior-architecture`.
- Vegetation → `roblox-vegetation-landscaping`.
- Global materials and variants → `roblox-materials-surfaces`.
- Ambient effects (dust, leaves) → `roblox-ambient-effects`.

Declared differentiation: `roblox-world-building` (installed) is a generalist and lean (154 lines without auxiliaries); this skill is its deep version by specialty (props/decoration/signage only). `roblox-visual-design` and `roblox-art-direction` direct (they approve style and tone); this skill executes (places and labels).

## Use cases

1. Empty street that needs life without losing readability.
2. Tavern with vignettes (half-cleared table, quest board) that tell stories.
3. Crossroads where players get lost: sign and arrow system.
4. Market with 30 readable, walkable stalls.
5. Saturated map at 20 FPS from excess knick-knacks with collision.

## Step-by-step process

1. **Inventory by families.** List: structural (crates, barrels), narrative (letters, tools), guide (signs, arrows). Starting-point limit: 3 families per scene; everything else is excess.
2. **Set a per-scene budget.** Starting point: street 40–60 props, room 15–25, plaza 30–50 (starting points, not truth). Count and cut what is invisible from routes before what is visible.
3. **Compose vignettes of 3–5 objects.** Rule: each vignette tells 1 sentence ("the blacksmith had dinner here"). Verify: a third party describes the sentence without help. No sentence = filler, remove it.
4. **Place from large to small.** Anchors (cart, stall, statue) → medium (crates, barrels) → small (papers, mugs). Small items only where players stop (counters, benches), never on walk routes.
5. **Signage in 3 levels.** Level 1: landmark/large arrow at 60+ studs. Level 2: street/destination sign at 20 studs. Level 3: door plaque at 5 studs. Verify each level from its distance with a moving avatar.
6. **Sign readability.** Short text (≤3 words), starting-point letter height ≥1 stud, high text/background contrast, dedicated SurfaceLight or SpotLight at night. Test: it reads while running, not just while standing still.
7. **Arrows and guide lines.** Floor arrows (Decal/Texture) or faint Beams at crossroads; one direction per crossroads, never 3. Remove tutorial ones after use or turn them into decoration.
8. **Collisions and camera.** Only anchors with collision (one simple Part per group); small and hanging items without collision. Nothing at camera height in corridors <6 studs.
9. **Reuse sets.** Save `PROP_MarketStall`, `PROP_Street_Sign`, `PROP_Tavern_Vignette` as Models. Vary rotation and 1 object per copy, not the whole set.
10. **Saturation and guidance QA.** Walk through with a new player: reach 3 destinations using only signs; count FPS before/after dressing. If FPS drops >15%, apply a diet (invisible small items first).

## Technical knowledge

- Parts/Models/MeshPart: MeshPart for repeated props (barrels, crates); Parts for simple signs and supports.
- Decal/Texture: sign text, posters, floor arrows. One large Decal per sign; text as crisp image, not letter geometry.
- SurfaceLight: washes signs at night; SpotLight to focus a statue or key board.
- Highlight: guide temporary only (quest object); never permanent on decoration.
- Beam: temporary guide lines or counted decorative beams (1–2 per scene).
- ViewportFrame: display cases or paintings with mini-scenes without extra geometry (verify in create.roblox.com/docs if unsure).
- Collisions: CanCollide off by default on decoration; one invisible Part per stall/group replaces 10 collisions.

## Best practices

- Less is more: 5 props with story beat 50 filler ones.
- Signage always on the decision side (before the crossroads, not after).
- Repeat the same base sign across the whole city (shape and color); change only the text.
- Eye height (starting point 4–6 studs) for signs; above 10 only landmarks.
- Name `PROP_*`, `SIGN_*`, `VIN_*` for quick diets and searches.

## Common mistakes

1. **Filler without a sentence.** 50 identical mugs with no story. Fix: 3–5-piece vignettes with a readable sentence.
2. **Sign unreadable while moving.** Small letters and no light. Fix: ≥1 stud, contrast, and dedicated light.
3. **Three arrows per crossroads.** The player freezes. Fix: one direction per crossroads.
4. **Everything with collision.** Getting stuck between stalls. Fix: anchors only; rest without collision.
5. **Props on the route.** Crates in the middle of the path. Fix: edges; center free 4+ studs.
6. **Mixed styles.** 5 different sets on one street. Fix: 1 base set + minimal variation.
7. **Permanent Highlight guidance.** Everything glows always. Fix: Highlight only for temporary quest guidance.

## Quality and done criteria

- [ ] Per-scene budget met and counted (street/room/plaza).
- [ ] Each vignette conveys 1 sentence recognizable by a third party.
- [ ] 3 signage levels verified at 60/20/5 studs while moving.
- [ ] Signs readable by day and night (photos while running).
- [ ] One direction per crossroads; tutorial guides removed or integrated.
- [ ] Collision on anchors only (audit); corridors and routes clear.
- [ ] Sets saved as reusable `PROP_*`/`SIGN_*` Models.
- [ ] FPS after dressing within target (drop ≤15%).

## Tools

- Models/MeshPart for reusable sets; Parts for supports.
- Decal / Texture for text, posters, and floor arrows.
- SurfaceLight / SpotLight for signs and night focal points.
- Highlight and Beam only for temporary guidance (remove after use).

## Limitations

- Does not cover structural interior furnishing or facades (see linked skills).
- Per-scene counts and letter sizes are starting points, not truth.
- If unsure about a limit (Decal, ViewportFrame), write "(verify in create.roblox.com/docs)".
- Distinguish visual reference (photo of a real market) from importable asset: do not claim a set exists without creating or locating it.
