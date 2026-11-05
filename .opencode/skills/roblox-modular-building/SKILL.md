---
name: roblox-modular-building
description: Modular construction with grid, reusable kits, and pivots. Use it when you need interchangeable pieces, variations without breaking the set, or scaling a level with few assets.
---

# Modular Construction

## Objective

Build levels and buildings from a small kit of reusable pieces (walls, floors, corners, trims) that snap to a fixed grid, keep coherent pivots, and allow visual variation without breaking set compatibility.

## Scope and limits

What this skill does NOT do or cover:

- It does NOT design WHAT to build (theme, style, level layout): that is designed by `roblox-world-building` (generalist) and `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (own, in progress).
- It does NOT cover file sync or `project.json` configuration: that is covered by `roblox-rojo`.
- It does NOT cover loose props or custom MeshParts: that is covered by `roblox-props-creation` and `roblox-meshparts-geometry`.
- It does NOT cover global hierarchy organization or versioning: that is covered by `roblox-model-organization`.

Declared differentiation: `roblox-world-building` (installed, fine generalist) and the own skills (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) design WHAT to build; this skill explains HOW to build it (modular technique). `roblox-rojo` covers sync; this skill covers modeling technique.

## Use cases

- Wall/floor/roof set for a city that must grow without modeling each house from scratch.
- Interiors (dungeon, ship, office) with hallways and rooms that recombine.
- Stair, railing, and trim kit that fits any building in the game.
- Fast prototyping of a level using gray pieces before the art pass.

## Step-by-step process

1. **Fix the base grid.** Pick a module (e.g. 4 studs) and declare that every piece measures exact multiples (4, 8, 12...). Document the module in the kit folder name.
2. **Define the closed kit list.** Write the minimum list (4x4 floor, 4-tall wall, corner, lintel, step, trim) and do not add new pieces without justifying which one they replace.
3. **Model one master piece per type.** Use `Part` with exact grid size, anchored (`Anchored=true`), and check that two pasted copies leave no gaps or overlaps.
4. **Normalize pivots.** Place each `Model`'s `Pivot` at the same reference (e.g. bottom corner or base center) so moving/rotating pieces is predictable.
5. **Validate avatar scale.** Check doors and passages: a comfortable door is ~2x avatar height. Adjust the kit (wall height, opening width) before duplicating.
6. **Add variation without breaking compatibility.** Create variants that keep measurements and pivot (plain wall, windowed wall, damaged wall) and verify each variant substitutes the base without moving the rest.
7. **Tag with `CollectionService`/Tags and `Attributes`.** Label pieces (`Pared`, `Suelo`, `Modular`) and store `Attributes` such as `Modulo="4"` or `Variante="Ventana"` to find them by script.
8. **Stress-test the set.** Build a test room using only the kit, walk every joint on foot, and fix gaps, collision jumps, and z-fighting pieces (coplanar surfaces).
9. **Package by `Folder` and `Model`.** Store the kit in a `Folder` (e.g. `Kit_Muros_4studs`) with each piece as a named `Model` (`Muro_4x4_Liso`, `Muro_4x4_Ventana`).
10. **Prepare for Rojo without overwriting work.** Export the kit as a versioned model and coordinate who edits the kit (one person or branch) so levels that already use it do not break.

## Technical knowledge

- Grid and multiples: if the module is 4 studs, every measurement (length, height, thickness) must be a multiple so joints close.
- Coherent `Pivot`: pieces with different pivots do not align the same way when duplicated; the bottom corner makes stacking easy, the base center makes rotating easy.
- Avatar scale: doors ~2x avatar height; hallways wide enough to turn comfortably; steps climbable without awkward jumping.
- Playable collisions: transit pieces must have solid gapless collision; decorative trims may skip collision if they do not block.
- Performance: few distinct pieces reused many times beat hundreds of unique pieces; avoid 0.2-stud micro-pieces to close gaps (fix the grid instead).
- `Workspace` / `StreamingEnabled`: modular kits benefit from streaming because pieces are predictable; avoid fragile cross-references between distant pieces.
- `Camera`: validate from the gameplay camera that joints show no visible gaps at real gameplay angles, not just in top-down editor view.

## Best practices

- Name pieces with measurements included (`Suelo_8x8`, `Muro_4x4_Puerta`) so you know what substitutes what without opening the model.
- Keep the kit small: better 12 pieces that fit than 60 that almost fit.
- Version the kit (`Kit_v1`, `Kit_v2`) and never change `v1` measurements once used in levels; create `v2` for changes.
- Document the module and pivot in an `Attributes` or note inside the kit `Folder`.
- Test each variant by substituting the base in a real build, not just by looking at the isolated piece.

## Common mistakes

- 3.97-stud pieces on a 4 grid: they accumulate visible gaps when repeated. Cause: eyeball modeling. Fix: write the exact numeric size.
- Mixed pivots (some at center, some at corner): on rotation, some pieces fit and others shift. Fix: re-pivot the whole kit the same way.
- Wrong-scale doors (avatar crouches or a huge gap is left). Cause: no avatar validation. Fix: ~2x avatar rule and on-foot test.
- Variants that change size (the "windowed wall" measures differently). Cause: decorating outside the base volume. Fix: decoration must fit inside the module volume.
- Flickering coplanar surfaces (z-fighting). Cause: two exactly overlapping faces. Fix: offset 0.01–0.05 studs or merge into one piece.
- Breaking levels by "improving" the kit with measurement changes. Fix: version and never edit measurements of kits in use.

## Quality and done criteria

- [ ] Every piece measures exact multiples of the declared module, verifiable in its sizes.
- [ ] All `Model`s in the kit share the same `Pivot` convention.
- [ ] Each variant substitutes its base without moving neighboring pieces (substitution test passed).
- [ ] Doors and passages validated on foot with an avatar (~2x avatar in doors).
- [ ] Test build with no gaps, no collision jumps, and no flicker visible from the gameplay `Camera`.
- [ ] Kit packaged in a `Folder` with measured names and identification `Tags`/`Attributes`.
- [ ] Kit versioned and ready for Rojo without breaking existing levels.

## Tools

- `Part`, `Model`, `Folder` for kit pieces, assemblies, and packaging.
- `CollectionService` / Tags and `Attributes` to tag pieces and variants.
- `Workspace` / `StreamingEnabled` and `Camera` to validate streaming and real angles.
- Rojo `project.json` / `$path` / `$className` only as sync destination (configuration is covered by `roblox-rojo`).

Illustrative Luau example (organization by script, not gameplay):

```luau
-- Ilustrativo: listar piezas del kit marcadas con un Tag.
local CollectionService = game:GetService("CollectionService")
for _, pieza in CollectionService:GetTagged("Modular") do
	if pieza:IsA("Model") then
		print(pieza.Name, pieza:GetAttribute("Modulo"))
	end
end
```

## Limitations

- Does not design the theme or level layout; only the modular technique.
- Does not configure Rojo (`project.json`, `$path`, `$className` — check create.roblox.com/docs if in doubt); it only leaves the kit ready to sync.
- Does not replace performance testing with real instance counts in the final place.
