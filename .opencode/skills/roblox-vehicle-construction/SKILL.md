---
name: roblox-vehicle-construction
description: Vehicle construction (chassis, cabins, wheels/propellers/hulls, colliders, and seats). Use it when you need cars, boats, ships, or mounts modeled in a playable, stable way.
---

# Vehicle Construction

## Objective

Model vehicles (land, water, or flying) with a stable chassis, legible cabin, believable contact elements (wheels, propellers, hulls), simplified colliders, and well-placed seats, prioritizing that they don't tip over, don't get stuck, and read well from the game camera.

## Scope and limits

What this skill does NOT do or cover:

- It does NOT design WHICH vehicle suits the game (theme, role, roster): that is designed by `roblox-world-building` (generalist) and `roblox-exterior-architecture`, `roblox-interior-design`, `roblox-city-settlements`, `roblox-terrain-sculpting`, `roblox-vegetation-landscaping`, `roblox-materials-surfaces`, `roblox-props-decoration` (own, in progress).
- It does NOT program driving or movement physics (this skill is modeling/construction technique, not gameplay).
- It does NOT cover Rojo file sync: that's covered by `roblox-rojo`.
- It does NOT cover global hierarchy organization: that's covered by `roblox-model-organization`; nor generic props (`roblox-props-creation`) or advanced geometry (`roblox-meshparts-geometry`) beyond what's needed for the vehicle.

Declared differentiation: `roblox-world-building` (installed, thin generalist) and the own skills (`roblox-exterior-architecture` / `roblox-interior-design` / `roblox-city-settlements` / `roblox-terrain-sculpting` / `roblox-vegetation-landscaping` / `roblox-materials-surfaces` / `roblox-props-decoration`) design WHAT to build; this skill explains HOW to build it (vehicle technique). `roblox-rojo` covers sync; this skill covers modeling technique.

## Use cases

- Playable car or truck for a city or circuit.
- Boat or launch with a believable hull for water zones.
- Stylized ship or aircraft with propellers or rotors.
- Event mount or vehicle that must look good and not break when getting on/off.

## Step-by-step process

1. **Define type and scale.** Decide land / water / air and validate size against the avatar: cabin with ~2x avatar headroom at entries and seats where the avatar fits sitting without major clipping.
2. **Block the chassis first.** Model the main volume with a simple `Part` or `MeshPart`, symmetric, with a coherent base height (wheels or hull underneath, not floating or sunk).
3. **Add the playable collider.** Create simple invisible colliders (boxes with `Part`) that wrap the chassis and protrusions; the detailed visual model must not be the collision.
4. **Build cabin and entries.** Model a legible cabin (windshield, sides) and leave wide entry/exit gaps; verify the avatar enters and exits without getting stuck.
5. **Model wheels / propellers / hulls.** Wheels: same diameter per axle, symmetric, not overlapping the chassis. Propellers/rotors: centered on their axis with free spin clearance. Hulls: legible bow/stern and lateral symmetry.
6. **Place seats.** Put the driver seat centered relative to the visual controls and passenger seats with enough room; check seated with a real avatar.
7. **Balance the whole.** Check left/right symmetry, low visual center, and no heavy overhanging pieces suggesting tip-over; fix before decorating.
8. **Decorate on budget.** Add details (lights, bumpers, spoilers) with `Part`, `Decal`/`Texture`, or simple `SurfaceGui`; each detail must fit inside the vehicle volume.
9. **Organize the hierarchy.** Store everything in a `Model` (`Vehicle_Name`) with sub-`Folder`s (`Chassis`, `Cabin`, `Wheels`, `Details`, `Colliders`) and `Tags`/`Attributes` (`Vehicle`, `Type="Land"`, `Seats="2"`).
10. **Final playable test.** Walk around the vehicle and with a seated avatar: get on, sit, get off, push against walls, and pass through level doors/bridges (~2x avatar in passages).

## Technical knowledge

- Chassis as reference: everything (cabin, wheels, colliders) aligns to the chassis; if the chassis is crooked, everything inherits the error.
- Simple colliders: invisible boxes approximating the volume; avoid snags that colliding with every visual detail would cause.
- Avatar scale: entries and cabin sized for a standing/sitting avatar; doors and gaps ~2x avatar as a starting rule.
- Symmetry: an asymmetric vehicle reads as broken; check with front/top views in the editor.
- Wheels/propellers/hulls: wheels aligned per axle and same size; propellers with free spin clearance; symmetric hulls for water readability.
- `SpecialMesh` and `MeshPart`: useful for rounded shapes (wheels, noses) but in moderation and with box collisions (see `roblox-meshparts-geometry`).
- Performance: each vehicle adds instances; reuse wheels and details across vehicles and avoid micro-parts.
- `Workspace` / `StreamingEnabled`: vehicles move through the world; avoid anchoring fragile logic to absolute positions and verify visibility with streaming on.
- `Camera`: validate vehicle readability from the real game camera (typical third person), not just an editor close-up.

## Best practices

- Model symmetric from the start (half + mental mirror) instead of fixing at the end.
- Always separate visual `Colliders` from decoration in their own folder.
- Name wheels by position (`Wheel_Front_Left`) to catch symmetry errors.
- Reuse wheels, seats, and lights across vehicles as a mini-kit.
- Test with a real seated avatar, not just the empty model.

## Common mistakes

- Vehicle floating or sinking wheels into the ground. Cause: chassis with no height reference. Fix: lock base height before decorating.
- Avatar stuck getting on/off. Cause: narrow gaps or decorative colliders. Fix: ~2x avatar gaps and simple colliders.
- Wheels of different size or off-center. Cause: modeling each wheel by eye. Fix: duplicate one master wheel.
- Propeller clipping the fuselage when spinning. Cause: no clearance. Fix: leave free spin volume.
- Pretty model with hundreds of parts hurting performance. Cause: decorating without budget. Fix: instance cap per vehicle and reuse.
- Flat hierarchy with 80 `Part`s and no folders. Cause: not organizing. Fix: subfolders per system (`roblox-model-organization` criterion).

## Quality and done criteria

- [ ] Symmetric chassis at correct height (not floating or sunk).
- [ ] Simple colliders separate from decoration and verified on foot.
- [ ] Cabin and entries validated with avatar (~2x avatar in passages, seat without major clipping).
- [ ] Symmetric wheels/propellers/hulls with functional clearance.
- [ ] Hierarchy in a `Model` with sub-`Folder`s and `Tags`/`Attributes` (vehicle, type, seats).
- [ ] Correct readability from the game `Camera` and instance budget met.
- [ ] Get-on/sit/get-off test and passing through level gaps passed.

## Tools

- `Part`, `MeshPart`, `SpecialMesh`, `Model`, `Folder` for chassis, shapes, and packaging.
- `Decal`, `Texture`, `SurfaceGui` for cheap visual details (lights, plates, panels).
- `CollectionService` / Tags and `Attributes` to tag vehicles and seats.
- `Workspace` / `StreamingEnabled`, `Lighting`, `Camera` to validate in-world and at real angles.

Illustrative Luau example (organization by script):

```luau
-- Ilustrativo: etiquetar un vehículo y sus plazas.
local CollectionService = game:GetService("CollectionService")
local coche = workspace:WaitForChild("Vehiculo_Coche01")
CollectionService:AddTag(coche, "Vehiculo")
coche:SetAttribute("Tipo", "Terrestre")
coche:SetAttribute("Plazas", 2)
```

## Limitations

- Does not program driving, custom physics, or gameplay balancing.
- No advanced CSG detail or precise mesh collisions (see `roblox-meshparts-geometry`; if you doubt a behavior, verify it at create.roblox.com/docs).
- Does not set up Rojo sync; only leaves the model organized for syncing (see `roblox-rojo` and `roblox-model-organization`).
