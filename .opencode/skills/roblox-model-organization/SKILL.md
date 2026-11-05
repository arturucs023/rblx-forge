---
name: roblox-model-organization
description: Organization of models and hierarchies (naming, folders, tags/attributes, versioning, Rojo). Use it when you need clean hierarchies, importing without duplicating, and leaving the project ready to sync.
---

# Model and Hierarchy Organization

## Objective

Keep hierarchies clean and predictable (naming, `Folder`, `Model`, `Tags`/`Attributes`) so any piece can be found in seconds, imports do not duplicate, what matters is versioned, and the project is left ready for Rojo without overwriting other people's work.

## Scope and limits

What this skill does NOT do or cover:

- It does NOT design WHAT to build (theme, style, levels): that is designed by `roblox-world-building` (generalist) and `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (own, in progress).
- It does NOT cover modeling technique (modular, vehicles, props, geometry): that is covered by `roblox-modular-building`, `roblox-vehicle-construction`, `roblox-props-creation` and `roblox-meshparts-geometry`.
- It does NOT configure Rojo sync (`project.json`, `$path`, `$className`): that is covered by `roblox-rojo`; this skill only prepares the hierarchy for syncing.

Declared differentiation: `roblox-world-building` (installed, fine generalist) and the own skills (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) design WHAT to build; this skill explains HOW to build it (organization technique). `roblox-rojo` covers sync; this skill covers modeling/ordering technique.

## Use cases

- Project with hundreds of instances where nobody finds anything.
- Importing a new set without duplicating existing materials, props, or kits.
- Preparing folders and names before enabling Rojo sync.
- Cleaning up an inherited place full of loose `Part`s and `Part(47)` names.

## Step-by-step process

1. **Audit the current state.** List root `Folder`s, count loose `Part`s outside `Model`, and detect duplicates by name; note the 5 worst clutter hotspots.
2. **Define the naming convention.** Set the format (`Category_Name_Variant`: `Muro_4x4_Ventana`, `Prop_Taberna_Silla01`, `Vehiculo_Coche01`) and forbid new generic names.
3. **Create the root hierarchy.** Organize into stable `Folder`s (`Kit_Modular`, `Sets`, `Vehiculos`, `Props`, `Colliders`, `Decoracion`) and avoid more than 3 levels of nesting.
4. **Convert loose pieces into `Model`.** Group each logical object into a `Model` with a useful `Pivot` (centered base on props, coherent corner/center on modular pieces) and avatar scale verified (~2x avatar in steps).
5. **Label with `CollectionService` and `Attributes`.** Add Tags by role (`Modular`, `Prop`, `Vehiculo`, `Collider`) and `Attributes` (`Set`, `Modulo`, `Version`) for scripted searches.
6. **Dedup before importing.** Before bringing anything in, search by name and Tag for whether it already exists; reuse or version (`Silla02`) instead of duplicating (`Silla(1)`).
7. **Decide what to version.** Version kits, sets, and vehicles (`Kit_v1`); do not version temporary work pieces or duplicates. Document the version in `Attributes`.
8. **Separate collisions and decoration.** Move colliders into a per-model `Colliders` sub-`Folder` so they are visible, auditable, and not confused with visuals.
9. **Prepare for Rojo.** Group into folders that will map to `$path`/`$className`, avoid unannounced mass renames, and coordinate edits so nobody overwrites work (configuration is done by `roblox-rojo`).
10. **Verify and freeze.** Walk the place on foot, check that everything is found by name/Tag, that there are no duplicates, and that the instance count is reasonable; freeze the convention.

## Technical knowledge

- `Model` vs `Folder`: `Model` for objects with `Pivot` and position (placeable pieces); `Folder` for grouping without transforms (sets, categories).
- Naming with measurement and set: including the module or set in the name avoids wrong substitutions and eases sync.
- `CollectionService` / Tags and `Attributes`: the robust way to classify without depending on fragile names; enables scripted audits.
- Coherent `Pivot` per category: props at the base, modular pieces per the kit convention; mixed pivots break placement.
- Instance budget: organization reveals cost (count per folder/set) and lets you prune before performance drops.
- `Workspace` / `StreamingEnabled`: flat, zoned hierarchies stream better than tangles of cross references.
- `Camera`: validates that cleanup did not break visibility (pieces moved into folders are still visible from real angles).
- Rojo `project.json` / `$path` / `$className`: the hierarchy must map cleanly to paths; stable folders = stable sync (config details in `roblox-rojo`; if in doubt, check create.roblox.com/docs).

## Best practices

- Rename on creation, not at the end: every piece is born with its final name.
- Maximum 3 nesting levels; deeper levels hide pieces and break searches.
- One `Model`, one useful `Pivot`, one role (Tag): no "mixed" models.
- Reuse before importing; version before duplicating.
- Document the convention in an `Attributes` or note in the root folder for the team.

## Common mistakes

- Hundreds of `Part(12)` impossible to search. Cause: not renaming on creation. Fix: mandatory convention and scripted audit.
- Duplicates `Silla`, `Silla(1)`, `Silla(2)`. Cause: importing without searching. Fix: prior name/Tag search and reuse.
- Colliders mixed with decoration. Cause: no subfolder. Fix: `Colliders` `Folder` per model.
- Mass rename breaking Rojo sync. Cause: renaming without coordination. Fix: planned name changes with `roblox-rojo`.
- 6-level hierarchies where nobody finds the car wheels. Cause: over-organizing. Fix: flatten to 3 levels per system (`Chasis`, `Ruedas`, `Detalles`).
- Versioning everything (even tests) until the project fills up. Cause: no criteria. Fix: version only kits/sets/vehicles in use.
- Overwriting other people's work while reorganizing. Cause: moving shared folders without warning. Fix: one person/branch per reorganization and coordinated sync.

## Quality and done criteria

- [ ] Zero functional loose `Part`s outside a named `Model`/`Folder`.
- [ ] Naming convention applied (category, measurement/set, variant) with no new generics.
- [ ] Stable root hierarchy with ≤3 levels and coherent `Pivot` per category.
- [ ] Tags and `Attributes` (role, set, version) verifiable by script.
- [ ] No duplicates: every import explicitly reuses or versions.
- [ ] Colliders separated in a sub-`Folder` and avatar scale validated on foot (~2x avatar).
- [ ] Project ready for Rojo with no pending renames or editing conflicts.

## Tools

- `Model`, `Folder`, `Part`, `MeshPart` as organization building blocks.
- `CollectionService` / Tags and `Attributes` for classification and audits.
- `Workspace` / `StreamingEnabled`, `Camera`, `Lighting` to validate after reorganizing.
- Rojo `project.json` / `$path` / `$className` as the sync destination (configured by `roblox-rojo`).

Illustrative Luau example (organization by script):

```luau
-- Ilustrativo: detectar piezas sueltas sin agrupar en la raíz.
local sueltas = 0
for _, hijo in workspace:GetChildren() do
	if hijo:IsA("Part") or hijo:IsA("MeshPart") then
		sueltas += 1
		print("Suelta:", hijo:GetFullName())
	end
end
print("Piezas sueltas en raíz:", sueltas)
```

## Limitations

- Does not configure `project.json`, `$path` or `$className` (that is `roblox-rojo`); it only prepares sync-compatible hierarchies.
- Does not model new pieces; it only orders, names, and labels what exists.
- Does not introduce new binaries or dependencies. For any doubt about classes or services, check create.roblox.com/docs.
