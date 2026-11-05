---
name: roblox-character-design
description: Visual design of characters and avatars (silhouette, proportions, role/team). Use it when creating a hero, enemy, playable NPC, or customization system.
---

# Character and Avatar Design

## Objective

Define characters that are readable, appealing, and coherent with gameplay: a silhouette recognizable at distance, proportions that communicate role and speed, clear team/faction colors, and customization that doesn't break readability or performance.

## Scope and limits

This skill covers visual character direction: silhouette, proportions, palette, `Accessory`, `HumanoidDescription`, and customization rules.

**What it does NOT cover:**

- Does NOT cover respawn-safe lifecycle (`Character` respawn, `Humanoid`/`Animator` caching): covered by `roblox-characters`.
- Does NOT cover rig building (`Motor6D`, hierarchies, validation): covered by `roblox-rigging`.
- Is NOT a general animation dispatcher: covered by `roblox-animation`; domain details live in `roblox-locomotion-animation`, `roblox-combat-animation`, and `roblox-expressive-animation`.
- Does NOT cover NPCs with AI/navigation: covered by `roblox-npcs`.
- Does NOT cover cameras (framing, follow, shake): covered by `camera-systems`; here only what must read well on camera.

## Use cases

1. Playable hero that must stand out among 8 players on screen.
2. Enemies with tiers (weak / elite / boss) readable at 30+ meters.
3. Red vs blue teams with no confusion for color-blind players.
4. Customization system (skin, clothes, hats, backpacks) with limits.
5. Platform avatar (`HumanoidDescription`) adapted to the game's style.
6. Pet or companion that isn't mistaken for an enemy.

## Step-by-step process

1. **Define the role in one sentence.** Example: "slow tank that blocks doorways". Everything (width, height, color) derives from it.
2. **Sketch the silhouette in pure black.** Draw 3 variants with shapes only. If they can't be told apart in thumbnail, start over.
3. **Lock proportions with blocks.** Head:torso:legs. Note: total height in studs, shoulder width, leg length (long legs read as "fast").
4. **Assign a role palette.** 1 dominant color (60%), 1 secondary (30%), 1 accent (10%). Reserve the accent for the zone gameplay needs to read (hands, weapon, core).
5. **Design team readability.** Team band on torso + head, not just on one small `Accessory` lost at distance. Test with color-blindness filters.
6. **Map to `HumanoidDescription`.** Translate your design into standard properties: heights, widths, body colors, shirt/pants. Document which field each decision touches.
7. **Define an allowed `Accessory` kit.** Allowlist: which slots exist (head, torso, back), max size, and whether they affect the visual hitbox. Forbid accessories covering the face or team color.
8. **Validate in context.** Place 4 copies on a gray map, pull the `Camera` back to 20/40/60 studs (see `camera-systems` for framing) and ask: do I know what each is and which team it's on?
9. **Base animation test.** Play idle and walk (see `roblox-locomotion-animation`). If the design breaks in motion (hands clipping through torso), adjust proportions, not the animation.
10. **Freeze the guide.** Export a character sheet: silhouette, palette with codes, customization limits, and approval checklist.

## Technical knowledge

- **Silhouette first:** players recognize shapes before details. Broad shoulders = power; tall narrow body = speed; low wide mass = tank.
- **Proportions and gameplay:** big-headed characters read "friendly"; realistic proportions read "serious". Big hands improve attack readability (see `roblox-combat-animation`).
- **`Humanoid` and scale:** height affects perceived speed: a tall character looks slower at the same speed. Compensate with effects or adjust `Humanoid` only after testing on a real map.
- **`HumanoidDescription`:** the standard way to apply avatar appearance without rebuilding the `Character` by hand. Use it as the contract between design and code.
- **`Accessory`:** each accessory adds geometry and potential visual collisions. Recommended limit: 0–3 per playable character on mobile.
- **`SkinnedMesh` vs rigid parts:** skinned meshes smooth shoulders/elbows but need correct weights; rigid parts are cheaper and more predictable. Decide by budget, not fashion.
- **Contrast and background:** design against the game's real backgrounds (green grass, dark cave), not a white editor background.
- **Facial readability:** beyond 15 studs the face doesn't read; don't put gameplay information only on the face (see `roblox-expressive-animation` for when to use it).

Illustrative example (design → code contract, not final logic):

```luau
-- Ilustrativo: aplicar la paleta aprobada vía HumanoidDescription.
local description = Instance.new("HumanoidDescription")
description.Torso = Color3.fromRGB(30, 90, 200) -- color de equipo documentado
description.LeftArm = Color3.fromRGB(30, 90, 200)
description.RightArm = Color3.fromRGB(30, 90, 200)
-- El Humanoid del Character aplica esta descripción al aparecer.
```

## Best practices

- One idea per character: if it takes two sentences to explain, split it into two designs.
- Reserve the most saturated colors for gameplay information (team, danger, objective).
- The client proposes customization, the server validates: every appearance change (color, equipped `Accessory`) must pass server validation against the allowlist before replicating to other players.
- Document "what's forbidden" with visual examples, not just text.
- Keep the `HumanoidRootPart` visually centered: giant capes or backpacks decenter the pivot's perception.
- Design for `SkinnedMesh` and rigid parts at once if the game supports both.
- Review design with real animations playing, never in a static T-pose alone.

## Common mistakes

1. **Designing at max zoom:** looks great up close, unreadable in game. Always test at real `Camera` distance.
2. **Team color on one small pin:** gone at 30 studs. Team color must cover torso or head.
3. **Accessories covering the visual hitbox:** huge hats hiding whether the player carries a weapon.
4. **Character palette = map palette:** green character in a green jungle. Demand a documented minimum contrast.
5. **Unlimited customization:** allows combos that break role (an enemy looking like an ally). Always a server-validated allowlist.
6. **Hands and feet the same color as the floor:** footstep and attack reads get lost. Reserve a different tone.
7. **Ignoring `HumanoidDescription`:** rebuilding appearance by hand creates inconsistencies between respawns; use the standard contract managed by `roblox-characters`.

## Quality and done criteria

- [ ] Silhouette recognizable in thumbnail (64 px) by 3 of 3 testers.
- [ ] Role (fast/tank/support) guessed correctly with no explanation.
- [ ] Team/faction identified 100% at 30 studs, including color-blindness simulation.
- [ ] `Accessory` kit with written limits and server validation.
- [ ] Frozen character sheet: palette, proportions, and base `HumanoidDescription`.
- [ ] Validated with real idle/walk and no major clipping.

## Tools

- Avatar editor and `HumanoidDescription` preview in the dev environment.
- Gray test map with marked distances (20/40/60 studs) and game backgrounds.
- Character approval checklist (this skill) + camera tests with `camera-systems`.
- Customization allowlist table for server validation.

## Limitations

- Does not generate models or textures by itself; defines direction and contracts.
- Does not tune mesh performance or triangle budgets (see the project's performance audit).
- Does not replace testing with real players or legal accessibility criteria; color-blindness verification here is heuristic.
- Any API outside the stable list must be written as "(check create.roblox.com/docs)".
