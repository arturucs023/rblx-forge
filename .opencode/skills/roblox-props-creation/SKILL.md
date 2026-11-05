---
name: roblox-props-creation
description: Prop creation with instance budget, simple colliders, and manual LOD. Use it when you need furniture, decoration, or themed sets that perform well and read at a distance.
---

# Prop Creation

## Objective

Create props (furniture, decoration, visual interactive objects) that read well at gameplay distance, cost few instances, collide simply, and work as coherent themed sets reusable in several places.

## Scope and limits

What this skill does NOT do or cover:

- It does NOT design WHICH props each zone needs (theme, style, set list): that is designed by `roblox-world-building` (generalist) and `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (own, in progress).
- It does NOT cover vehicle construction: that is covered by `roblox-vehicle-construction`.
- It does NOT cover advanced geometry with `MeshPart` or complex CSG: that is covered by `roblox-meshparts-geometry`.
- It does NOT cover global organization or versioning: that is covered by `roblox-model-organization` and `roblox-rojo` (sync).

Declared differentiation: `roblox-world-building` (installed, fine generalist) and the own skills (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) design WHAT to build; this skill explains HOW to build it (prop technique). `roblox-rojo` covers sync; this skill covers modeling technique.

## Use cases

- Interior furniture (tables, chairs, shelves) for several rooms.
- Exterior decoration (lampposts, crates, barrels, signs) repeated across a city.
- Coherent themed set (medieval tavern, laboratory, shop) with a common palette and materials.
- Event objects that must perform well even with dozens on screen.

## Step-by-step process

1. **Define the budget.** Set an instance cap per prop (e.g. small ≤8, medium ≤20) and a per-scene cap; write it down in the set folder.
2. **Block the silhouette with `Part`.** Model the distance-legible volume first (box, cylinder) and validate it reads from the gameplay `Camera` before detailing.
3. **Validate avatar scale.** Check usage height (table, counter, chair) against the avatar; nearby steps and accesses ~2x avatar where applicable.
4. **Simplify colliders.** Wrap the prop in 1–2 simple collision boxes; details (thin legs, ornaments) do not collide individually.
5. **Detail cheaply.** Add detail with `Decal`/`Texture`, a simple `SurfaceGui`, or a basic `SpecialMesh` instead of dozens of small `Part`s.
6. **Create manual LOD.** For repeated props, prepare a full version and a simplified far version (fewer pieces) and decide at which distance they swap in your level.
7. **Group the themed set.** Reuse a coherent palette and `MaterialVariant` (via `MaterialService`) across the set; check create.roblox.com/docs if anything is unclear.
8. **Package as a `Model`.** Each prop is a `Model` with a useful `Pivot` (centered base to rest on the floor) and a descriptive name (`Prop_Mesa_Taberna`).
9. **Label with Tags/`Attributes`.** Tag set and role (`Prop`, `Set="Taberna"`, `ColliderSimple="true"`, `LOD="Cerca/Lejos"`) with `CollectionService` for scripted management.
10. **Test in bulk.** Place the real count the scene will hold, walk it on foot, bump into the props, and verify performance and distance legibility.

## Technical knowledge

- Instance budget: each `Part`/`MeshPart` adds up; dozens of props × dozens of pieces scale fast. Fewer pieces per prop = healthier scenes.
- Simple colliders: 1–2 boxes per prop avoid snags and cost little; colliding with every leg or ornament is the typical snag cause.
- Manual LOD: far version with silhouette but no interior detail; used when the prop is far from the `Camera` and detail is not visible.
- Avatar scale: a "pretty" but unusable prop (a chair the avatar does not fit, a counter blocking the camera) fails its function.
- `MaterialService` / `MaterialVariant`: reusing set variants keeps coherence and avoids unique materials per prop (check exact names at create.roblox.com/docs if in doubt).
- `Terrain`, `Lighting`, `Workspace`/`StreamingEnabled`: validate props under real lighting and with streaming, because color and visibility change between editor and game.
- `SurfaceGui`/`Decal`/`Texture`: cheap visual detail versus geometry; ideal for labels, screens, grain, or posters.
- Hierarchies: one `Model` per prop inside one `Folder` per set (`Set_Taberna`) to locate and reuse without duplicating.

## Best practices

- One prop = one `Model` = one base `Pivot`; makes placing dozens easy with no tweaks.
- Reuse legs, handles, and trims across props of the same set as a micro-kit.
- Prefer textures/decals over geometry for details smaller than ~0.5 studs.
- Name with the set included (`Prop_Taberna_Silla01`) to filter by set.
- Document the real budget (instances per prop) next to the set.

## Common mistakes

- 40-piece chair that tanks performance when repeated 30 times. Cause: no budget. Fix: instance cap and cheap detail.
- Avatar snagged on table legs. Cause: every leg collides. Fix: one simple wrapping box.
- Floating or sinking props. Cause: `Pivot` off the base. Fix: pivot on centered base and rest test.
- Incoherent set (5 different woods in the same tavern). Cause: per-prop materials. Fix: shared palette and `MaterialVariant`.
- Detail invisible in game. Cause: modeling zoomed-in in the editor. Fix: always validate from the real `Camera` and distance.
- Duplicating props by hand-renaming until count is lost. Cause: no `Tags`/`Attributes`. Fix: label set and role from the start.
- Rojo sync overwriting other people's props. Cause: editing shared files without coordination. Fix: sets per folder and sync per `roblox-rojo`.

## Quality and done criteria

- [ ] Each prop meets its declared instance budget.
- [ ] Simple colliders (1–2 boxes) verified by bumping on foot, no snags.
- [ ] Avatar scale validated on use props (sit, lean, walk around).
- [ ] Far LOD version ready for mass-repeated props.
- [ ] Thematically coherent set in palette and materials, packaged in a per-set `Folder`.
- [ ] Props as `Model` with base `Pivot`, set names, and `Tags`/`Attributes`.
- [ ] Bulk test (real in-scene count) passed at real `Camera` distance.

## Tools

- `Part`, `MeshPart`, `SpecialMesh`, `Model`, `Folder` to model and package.
- `Decal`, `Texture`, `SurfaceGui` for cheap detail.
- `MaterialService` / `MaterialVariant` for set material coherence.
- `CollectionService` / Tags, `Attributes` to tag set, role, and LOD.
- `Workspace` / `StreamingEnabled`, `Lighting`, `Camera`, `Terrain` for validation under real conditions.

Illustrative Luau example (organization by script):

```luau
-- Ilustrativo: marcar todos los props de un set.
local CollectionService = game:GetService("CollectionService")
local set = workspace:WaitForChild("Set_Taberna")
for _, prop in set:GetDescendants() do
	if prop:IsA("Model") then
		CollectionService:AddTag(prop, "Prop")
		prop:SetAttribute("Set", "Taberna")
	end
end
```

## Limitations

- Does not design the set theme; only the efficient construction technique.
- Does not implement automatic LOD swapping by script; only prepares the versions.
- Does not configure Rojo sync or global versioning (see `roblox-rojo` and `roblox-model-organization`); if in doubt about a class or service, check create.roblox.com/docs.
