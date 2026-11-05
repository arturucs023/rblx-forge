---
name: Roblox Visual Design
description: Analyze and improve the visual design of a Roblox build. Use it for composition, color, lighting, material, scale, and legibility reviews against references and Studio captures.
---

# roblox-visual-design

Commercial is functional too. Judge as a player and reviewer, propose
as an art director, verify with captures. Complementary:
`roblox-reference-research`, `roblox-art-direction`, `roblox-environment-art`,
`roblox-visual-quality-audit`, `roblox-user-interfaces`.

## Objective

Evaluate and improve: composition, color harmony, lighting mood,
material believability, proportions/scale against the avatar, and
UI legibility over 3D.

## Scope and limits

- Covers: recorded critique, proposal with concrete values, and
  before/after comparison with captures.
- Does NOT execute construction (that's `roblox-environment-art` and the
  architecture/environment skills) nor define direction (that's
  `roblox-art-direction`): this skill diagnoses and proposes.
- Does NOT approve UI without a runtime test (`PlayerGui`).

## Use cases

- A map that "works" but looks flat, empty, or illegible.
- Visual review before publishing or after a lighting/material change.
- Deciding between two look variants with criteria and evidence.

## Step-by-step process

1. **Gather evidence.** Frame the subject (`selection` + `view`), take a
   `capture_screenshot` and inspect the image yourself. Bring 1–3 references
   from `references/` for the target look; cite their paths.
2. **Critique in writing** (one line each): focal point, palette (count
   distinct tones), light direction + shadows, material contrast
   (rough vs smooth, matte vs metal), scale legibility (door heights,
   railings vs avatar), depth (foreground/mid/background).
3. **Propose.** Concrete changes with values: `Lighting.ClockTime`,
   `Ambient`/`OutdoorAmbient` colors, `Atmosphere.Density`, material changes,
   accent trims, fog distances. Small coherent steps,
   one capture per step.
4. **Compare.** Put the reasoning before/after next to the new capture;
   keep what measurably improves the critique lines, revert the rest.

## Technical knowledge

- Visual reading: focus, hierarchy, color rhythm, motivated light, avatar scale.
- `Lighting`, `Atmosphere`, materials and their interplay on legibility.

## Best practices

- Critique in writing BEFORE changing; if it isn't written, it doesn't exist.
- One change at a time, one capture at a time.
- Cite references by path, not by impression.

## Common mistakes

- `Ambient` maxed out killing the mood; single-material builds (all
  SmoothPlastic reads as toy, not as style).
- Text over busy backgrounds without scrims; Offset-only UI that breaks on mobile.
- Judging lighting only from the editor camera: always check the
  player view.

## Quality and done criteria

- [ ] Critique recorded before changing; references cited by path.
- [ ] Each change has a capture inspected by the agent.
- [ ] Final look matches the direction document (`roblox-art-direction`).
- Verification: capture + inspected-content note per change; runtime
  test in `PlayerGui` for any UI claim.

## Tools

- MCP: `selection` (+`view`), `capture_screenshot`, `capture_device_matrix`
  for device variants. Local library `references/`.

## Limitations

- If the current session can't display images, say so explicitly and mark
  every visual claim as NOT VERIFIED. Never describe an image you didn't
  inspect; never present a generated concept as a game capture.

## Visual honesty (required)

See `Limitations`: faking inspection invalidates the whole review.
