---
name: Roblox Environment Art
description: Build Roblox environments with deliberate lighting, materials, and composition. Use it for Terrain-vs-parts decisions, LightingService setups, atmosphere, day-night, weather, and exterior/interior staging.
---

# roblox-environment-art

Execution skill for the look defined in `roblox-art-direction`,
informed by `references/`. Complementary: `roblox-terrain-sculpting`,
`roblox-vegetation-landscaping`, `roblox-lighting-day-night`,
`roblox-lighting-atmosphere`, `roblox-materials-surfaces`,
`roblox-props-decoration` (subsystem specialists),
`roblox-world-building`, `roblox-world-level-design`, `roblox-visual-design`.

## Objective

Deliver readable, performant spaces: exteriors/interiors with motivated light,
believable material sets, and composition that guides the player.

## Scope and limits

- Covers: integrating terrain+architecture+light+materials+staging in one area.
- Does NOT replace the specialists (terrain, vegetation, lighting,
  materials, props): it coordinates them. For depth in a subsystem, defer.
- Does NOT define direction (that is `roblox-art-direction`).

## Use cases

- Building a new area that combines terrain, buildings, light, and props.
- Diagnosing why a zone looks flat or unreadable.
- Preparing a zone for promo capture or playtest.

## Step-by-step process

1. **Ground first.** Terrain for the organic (sculpt with the editor and tune
   decoration density `Water*` and `Grass`); parts for architecture. Never
   a single `BasePart` larger than 2048 studs: split into tiles.
2. **Light the scene.**
   - Set `ClockTime`, `Ambient`/`OutdoorAmbient`, `Brightness` per direction.
   - `Atmosphere`: density/offset/color/decay for depth; `Bloom`
     threshold ~1 for neon/night, off or subtle by day.
   - Shadows: Future lighting on desktop; verify mobile fallbacks
     stay readable.
   - Interiors: one key light per room (window/lamp), cold fill,
     warm practicals; never flat full ambient.
3. **Materials.** Assign from the allowed set; break large flat surfaces
   with trims, beams, or texture variation. Ground needs at least two
   tones (path vs field) or it reads as empty.
4. **Staging.** Foreground framing (arch/branches), midground subject,
   background silhouette (mountains/city per `references/terrain/*`). Landmarks
   visible from spawn; obvious paths without signage.
5. **Day-night/weather (only if the game needs it).** Move `ClockTime`
   from a server script, replicate a single value, clients render.
   Keep night readable: raise the `Ambient` floor and add practical
   lights; darkness is not difficulty.
6. **Cost check.** `get_scene_analysis` after each area; decoration
   is the usual suspect: halve density before touching systems.

## Technical knowledge

- Terrain vs parts, Lighting + Atmosphere, instance budgets and
  shadows, streaming for large maps.

## Best practices

- One area at a time, with capture and cost logged before moving to the next.
- Always motivated light: every source visible or justifiable.
- Reuse kits (`roblox-modular-building`) instead of modelling one-offs.

## Common mistakes

- Painted terrain but no lighting (no atmosphere/fog → flat); interiors
  with a `PointLight` per wall (light soup); night builds unplayable on
  mobile brightness; fog hiding the landmark the level needs.

## Quality and done criteria

- [ ] Values noted (ClockTime, Ambient, Atmosphere, effects) per area.
- [ ] Eye-level capture inspected; landmark visible from spawn.
- [ ] Scene cost checked; mobile still readable.
- Verification: re-read lighting properties + capture per area; cite both.

## Tools

- MCP: `execute_luau` for values, `capture_screenshot`,
  `get_scene_analysis`; Terrain editor; `references/`.

## Limitations

- Does not generate assets: composes with existing ones or defers to specialists.
- Heavy weather/effects must pass the mobile gate or be cut.

## Example: golden-hour exterior values

```lua
local Lighting = game:GetService("Lighting")
Lighting.ClockTime = 17.2
Lighting.Ambient = Color3.fromRGB(70, 60, 55)
Lighting.OutdoorAmbient = Color3.fromRGB(107, 90, 74)
Lighting.Atmosphere.Density = 0.35
Lighting.Atmosphere.Color = Color3.fromRGB(230, 200, 160)
```
