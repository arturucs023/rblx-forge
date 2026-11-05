---
name: roblox-meshparts-geometry
description: MeshParts and geometry (mesh vs parts, moderate CSG, box vs precise collisions, scaling). Use it when deciding between classic parts or meshes and needing complex shapes without breaking performance or collisions.
---

# MeshParts and Geometry

## Objective

Decide with criteria when to use classic `Part`s, when `MeshPart`, and when CSG (`UnionOperation` / `NegateOperation`), and apply correct collisions (box vs. precise) and scaling so complex shapes stay playable and cheap.

## Scope and limits

What this skill does NOT do or cover:

- Does NOT design WHAT each zone's shapes should be (style, theme): that is designed by `roblox-world-building` (generalist) and `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (own, in progress).
- Does NOT cover modular construction, vehicles, or props as such: that is covered by `roblox-modular-building`, `roblox-vehicle-construction`, and `roblox-props-creation` (this skill only provides the geometric criterion).
- Does NOT cover global organization or sync: that is covered by `roblox-model-organization` and `roblox-rojo`.

Declared differentiation: `roblox-world-building` (installed, concise generalist) and the own skills (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) design WHAT to build; this skill explains HOW to build it (geometric technique). `roblox-rojo` covers sync; this skill covers modeling technique.

## Use cases

- Decide whether an arch, curved staircase, or rock goes in `Part`, CSG, or `MeshPart`.
- Cut an opening (door/window) with `NegateOperation` without wrecking performance.
- Replace a group of 30 `Part`s with an equivalent `MeshPart`.
- Fix a `MeshPart` that looks fine but lets the avatar through or snags.

## Step-by-step process

1. **Classify the shape.** Straight/repeatable → `Part`. Punctual cut (opening, hollow) → CSG. Curved/organic/unique repeated many times → `MeshPart` candidate.
2. **Prototype with `Part` first.** Block out the shape with classic parts and validate avatar scale (~2x avatar steps) before investing in mesh or CSG.
3. **Use CSG sparingly.** Union only what's needed with `UnionOperation` and cut punctual openings with `NegateOperation`; avoid chains of dozens of operations.
4. **Separate visual from collision.** After CSG or mesh, wrap in simple `Part` colliders (boxes) for floors, walls, and steps; reserve precise collision for cases that demand it (verify exact options in create.roblox.com/docs if unsure).
5. **Bring in `MeshPart` where it helps.** Replace expensive part groups or shapes impossible in `Part` (wheels, snouts, rocks) with a reasonable-density `MeshPart`.
6. **Scale carefully.** Scale `MeshPart` uniformly when possible; with non-uniform scale, verify deformations and revalidate collisions and supports.
7. **Validate on foot and with camera.** Walk the piece, bump, climb/descend, and view it from the real `Camera`; a perfect-in-editor mesh can fail in game.
8. **Measure cost.** Compare instances and readability before/after; if the `MeshPart` doesn't reduce parts or improve readability, go back to `Part`.
9. **Pack and label.** Save each piece as a named `Model`/`MeshPart` in its `Folder`, with `Tags`/`Attributes` (`Geometry="Mesh/CSG/Parts"`, `Collider="Box/Precise"`).
10. **Leave it Rojo-ready.** No versioned new binaries or dependencies: the mesh stays referenced and organized so `roblox-rojo` syncs it without clobbering work.

## Technical knowledge

- `Part` vs `MeshPart`: `Part` is predictable, cheap, and easy to edit; `MeshPart` wins on curved/organic shapes and on collapsing many parts into one, but demands scale and collision control.
- CSG (`UnionOperation` / `NegateOperation`): useful for punctual merges and cuts; abuse (dozens of unions) complicates editing and collisions. In moderation.
- Box vs. precise collisions: the box (simple `Part` collider) is stable and cheap for play; precise follows the mesh but can snag on detail. Box by default; precise only with reason.
- Scaling: scaling `MeshPart` also changes its apparent collision; revalidate supports (floating/sinking) and steps after each non-uniform scale.
- `SpecialMesh`: cheap rounding inside `Part` for details (spheres, cylinders) without jumping to a full mesh.
- Avatar scale: openings cut with `NegateOperation` must respect ~2x avatar; a beautiful but short arch is a playable failure.
- Performance: fewer instances and simple colliders; a `MeshPart` replacing 30 parts usually pays off, one replacing 2 doesn't.
- `Workspace` / `StreamingEnabled`, `Lighting`, `Camera`: validate meshes under real light, with streaming, and from play angles; shading changes vs. the editor.

## Best practices

- Golden rule: `Part` by default, CSG for punctual cuts, `MeshPart` for what `Part` can't do well.
- One `UnionOperation` per logical piece, not one per whole level.
- Every mesh or CSG in a walk zone gets a box collider even if it "looks" like it collides.
- Name with geometric type (`Arch_CSG_4studs`, `Rock_Mesh_01`) so you know what you're touching.
- Keep the `Part` version as reference until the mesh validates in game.

## Common mistakes

- Whole level merged into one `UnionOperation`, impossible to edit. Cause: union for union's sake. Fix: small reversible unions.
- Avatar walking through a pretty mesh. Cause: trusting mesh collision with no collider. Fix: wrapping simple box.
- Avatar snagging on mesh ornaments. Cause: precise collision on detail. Fix: box collision and detail with no collision.
- Deformed `MeshPart` after non-uniform scale. Cause: stretching without verifying. Fix: uniform scale or full revalidation.
- Cut openings too low/narrow. Cause: not validating with avatar. Fix: ~2x avatar rule and on-foot test.
- Replacing 2 `Part`s with a heavy `MeshPart` for no gain. Cause: mesh fashion. Fix: measure instances and readability before/after.
- Introducing new binaries or dependencies for one mesh. Cause: skipping the rule. Fix: forbidden; geometry only with existing tooling.

## Quality and done criteria

- [ ] `Part` / CSG / `MeshPart` decision justified by shape and cost, not taste.
- [ ] CSG limited to punctual merges/cuts, editable by pieces.
- [ ] Simple colliders across walk zones; precise collision only where justified.
- [ ] Scales verified (no floating, sinking, or deformation) and ~2x avatar steps.
- [ ] On-foot and real-`Camera` test passed; instance cost equal or better than before.
- [ ] Pieces named by geometric type with geometry and collider `Tags`/`Attributes`.
- [ ] No new binaries or dependencies; Rojo-sync ready.

## Tools

- `Part`, `MeshPart`, `SpecialMesh` for base shapes and rounding.
- `UnionOperation`, `NegateOperation` for punctual merges and cuts.
- `Model`, `Folder`, `CollectionService` / Tags, `Attributes` for packing and marking.
- `Workspace` / `StreamingEnabled`, `Lighting`, `Camera` for real validation.
- Rojo `project.json` / `$path` / `$className` as destination only (configured by `roblox-rojo`).

Illustrative Luau example (scripted organization):

```luau
-- Ilustrativo: auditar qué piezas usan colisión precisa.
local conteo = 0
for _, d in workspace:GetDescendants() do
	if d:IsA("MeshPart") and d:GetAttribute("Collider") == "Precisa" then
		conteo += 1
		print("Precisa:", d:GetFullName())
	end
end
print("MeshParts con colisión precisa:", conteo)
```

## Limitations

- No external mesh creation or editing; only decides and applies their use inside Studio.
- No physics or gameplay programming; only geometry and playable collisions.
- No Rojo or global versioning setup. If unsure about any property (collisions, scaling, CSG), verify it in create.roblox.com/docs.
