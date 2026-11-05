---
name: Roblox Visual Quality Audit
description: Pass visual gates with captures in a Roblox build. Use it for pre-release art passes, regression after lighting/material changes, and UI legibility.
---

# roblox-visual-quality-audit

The visual equivalent of playtest QA: frame, capture, inspect,
score, fix, re-capture. Complementary: `roblox-visual-design`,
`roblox-art-direction`, `roblox-mobile-playtest`, `roblox-performance-audit`
(for the graphic-cost half).

## Objective

Score a build on: artistic coherence, composition, scale, lighting,
materials, UI legibility, and graphic performance. Fail out loud,
with captures attached.

## Scope and limits

- Covers: shot planning, capture, 0–2 scoring per dimension with
  evidence, device matrix, and fix loop.
- Does NOT fix gameplay or logic (that's functional QA) nor measure fine
  FPS (that's `roblox-performance-audit`): here we score what's visible.
- A 0 doesn't always block: it can be logged as accepted risk.

## Use cases

- Pre-release art pass.
- Regression after changing lighting/materials/UI.
- Deciding whether an area is ready for a promo capture.

## Step-by-step process

1. **Plan shots.** 3–6 named views (spawn, landmark, interior,
   moment with dense UI, night if applicable). Frame each with
   `selection view` on the exact part or instance.
2. **Capture.** `capture_screenshot` (png for text-legibility checks)
   during playtest for runtime truth; captures in Edit only for
   raw geometry.
3. **Score each shot 0–2** per dimension with one line of evidence:
   - Coherence vs direction (palette/material/type gates).
   - Composition (focus, foreground/mid/background, no accidental clutter).
   - Scale (avatar-referenced: doors ~2x height, railings, steps).
   - Lighting (right mood, faces/HUD legible, no pitch-black playable zones).
   - Materials (no single-material expanses, trims where they meet).
   - UI (sizing by scale, safe insets, contrast over 3D, minimums on mobile).
   - Graphic cost (top `get_scene_analysis` for the shot zone).
4. **Devices.** Repeat key shots with `capture_device_matrix` (phone
   + tablet presets); UI failures on small screens block release.
5. **Fix loop.** Worst dimension first, one change, re-capture the SAME shot.

## Technical knowledge

- Reading captures: pixels, not memory. Text legibility at 1x.
- Art-direction gates as rubric.

## Best practices

- Plan shots in writing before capturing.
- One dimension per iteration; same shot for comparison.

## Common mistakes

- Auditing Edit captures and missing runtime-only issues (scaled
  `PlayerGui`, streaming pop-in, night lighting in play).
- Scoring from memory instead of captured pixels; approving legibility
  from a downscaled preview.

## Quality and done criteria

- [ ] All planned shots captured, inspected, and scored with evidence.
- [ ] Each 0 item fixed and re-captured, or logged as accepted risk.
- [ ] UI shots on phone preset pass legibility.
- Verification: cite scores + evidence per shot; attach before/after
  on fixes. If the session can't display images: mark as NOT VERIFIED.

## Tools

- MCP: `selection`/`view`, `capture_screenshot`, `capture_device_matrix`,
  `get_scene_analysis`; `docs/ART_DIRECTION.md` as rubric.

## Limitations

- Not a substitute for the profiler on hard numbers.
- Requires Studio open with the place; no shots without it.
