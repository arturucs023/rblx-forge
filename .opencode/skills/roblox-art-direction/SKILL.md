---
name: Roblox Art Direction
description: Define and protect a Roblox game's art direction. Use it for palettes, lighting direction, material language, typography, and coherence gates across the project.
---

# roblox-art-direction

You own the look. Write the direction once and reject anything that drifts
from it. Complementary: `roblox-visual-design`,
`roblox-environment-art`, `roblox-reference-research`,
`roblox-visual-quality-audit`.

## Objective

Produce a one-page direction: mood words, palette, light, materials,
typography. Enforce it in every build review.

## Scope and limits

- Covers: mood, palette, light, materials, typography, and acceptance gates.
- Does NOT build (that is `roblox-environment-art` and the environment
  skills) nor audit capture by capture (that is
  `roblox-visual-quality-audit`): this skill defines the standard everything
  is measured against.
- An exception to the direction must be written into it; what is not written
  down does not exist.

## Use cases

- New game: lock the look before building the first map.
- Visual drift: the project accumulates incompatible styles and needs redirecting.
- Reviewing third-party content against the game's identity.

## Step-by-step process

1. **Mood in three words** (e.g. "warm, worn, golden-hour"). Every later
   decision must serve at least two of them.
2. **Palette.** 3–5 base `Color3` + 1 accent. Note hex and where each may
   appear (structure / trim / light / UI). Forbid the rest unless reviewed.
3. **`Lighting` style,** `ClockTime` behavior +
   `GeographicLatitude`, `Ambient`/`OutdoorAmbient`, `Atmosphere` (density,
   offset, color, decay), map vs voxel shadows, a single post-effect to
   start (`Bloom` or `ColorCorrection`, with values).
4. **Material language.** Allowed `Enum.Material` set per family
   (stone/wood/metal/fabric/ground) with roughness/color guidance; metalness
   reserved for real metal. Reference `references/materials/*` by path.
5. **Typography.** Maximum 2 families for UI, minimum sizes per device
   class, mandatory scrims over 3D.
6. **Gate.** New content only passes if it meets palette/light/materials/type;
   exceptions are written into the direction, never silently tolerated.

## Technical knowledge

- Color: harmony, indicative WCAG contrast for UI, reserved accent.
- Roblox light: `Lighting`, `Atmosphere`, shadows and their mobile cost.

## Best practices

- One page, exact values, no adjectives without numbers.
- Review every delivery against the gates; record pass/fail.

## Common mistakes

- A new accent color per feature (palette drift); two competing
  post-effect stacks; photorealistic references applied literally to
  stylized builds.

## Quality and done criteria

- [ ] The direction fits on one page and names exact values, not adjectives.
- [ ] Every content review cites pass/fail per gate.
- Verification: a full build reviewed against the direction with no
  unwritten exceptions.

## Tools

- Editor + project `docs/ART_DIRECTION.md`; `references/` to anchor the
  look; `capture_screenshot` to check drift.

## Limitations

- Does not impose taste: it imposes coherence with what is written. If the
  mood is poorly chosen, the direction perpetuates the error (review mood
  each milestone).

## Example: direction excerpt

```text
Mood: warm, worn, golden-hour
Palette: Sand #E8C97A (walls), Clay #A85B2A (trim), DeepTeal #1E4A4A (accents),
         Night #14141E (UI), Gold #FFB800 (rewards only)
Light: ClockTime 17.2, OutdoorAmbient #6B5A4A, Atmosphere density 0.35,
       Future lighting, shadows on
Materials: stone=Cobblestone/Slate, wood=WoodPlanks, metal=Metal only
```
