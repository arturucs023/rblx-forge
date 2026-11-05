---
name: roblox-rigging
description: R6/R15/custom rigs with Motor6D, hierarchies, and validation. Use it when your model does not animate, deforms oddly, or you need a custom rig.
---

# Rigging R6 / R15 / Custom

## Objective

Build and validate articulated rigs that animate without deformation: correct `Motor6D` hierarchy, coherent pivots and offsets, scaling that does not break joints, and a checklist that catches broken rigs before animating.

## Scope and limits

Covers rig structure: bones/parts, `Motor6D`, `Bone`/`SkinnedMesh` basics, scaling, and validation.

What it does NOT do:

- It does NOT cover respawn-safe lifecycle or `Humanoid` management in-game: covered by `roblox-characters`.
- It does NOT cover visual direction (silhouette, palette): covered by `roblox-character-design`.
- It does NOT cover clips or blending (covered by `roblox-animation`; by domain: `roblox-locomotion-animation`, `roblox-combat-animation`, `roblox-expressive-animation`).
- It does NOT cover NPCs with AI: covered by `roblox-npcs` (here only the rig those NPCs would use).
- It does NOT cover cameras: covered by `camera-systems`.

## Use cases

1. Turn a static model into an animatable character.
2. Create a custom rig (6-legged spider, neckless golem, weapon with moving parts).
3. Diagnose an arm rotating from the wrong shoulder or a stretching head.
4. Scale a 2x boss without joints separating.
5. Prepare `SkinnedMesh` with `Bone` for smooth shoulders/elbows.
6. Migrate animations between R6 and R15 deciding what to redo.

## Step-by-step process

1. **Choose a template: R6, R15, or custom.** R6 = 6 rigid parts, cheap and robust. R15 = 15 parts, better limb deformation. Custom only if the body is not humanoid (more than 2 arms, no neck). Record the decision.
2. **Verify the root.** There must be a `HumanoidRootPart` as the movement base and a `Humanoid` governing it. Everything visible hangs off that root, directly or indirectly.
3. **Build the hierarchy top-down.** Torso → head / upper arm → lower arm → hand. Thigh → leg → foot. Each joint is exactly one `Motor6D` with `Part0` = parent and `Part1` = child. No duplicate `Motor6D` on the same joint.
4. **Set `C0`/`C1` in neutral pose.** Place the model in T or A pose, align pivots, and record the `C0`/`C1` values. Every animation starts from these offsets; if you change them later, all animations shift.
5. **Name canonically.** Use standard R6/R15 names when humanoid (head, torso, arms, legs). Custom rigs use clear suffixes (`FrontLeg_L1`, `FrontLeg_L2`). No `Part1`, `Part2`.
6. **Connect the `Animator`.** The `Animator` lives inside the `Humanoid` and `AnimationTrack`s act on `Motor6D`s by name. Without `Animator`, nothing moves even if the rig is perfect.
7. **If using `SkinnedMesh`, validate `Bone`.** Each `Bone` must have the right parent and the mesh must reference those bones. A vertex weighted 100% to the wrong bone produces "taffy" stretching.
8. **Scale test.** Scale the model to the design minimum and maximum and play idle. If joints separate, scaling did not preserve `C0`/`C1`: fix the scaling pipeline, not values one by one by hand.
9. **Pass the validation checklist** (see criteria). Do not deliver the rig until all 8 checks pass.
10. **Freeze and document.** Save neutral pose, base `C0`/`C1` values, and name map so animators and code speak the same language.

## Technical knowledge

- **`Motor6D` 101:** joins two parts with an offset (`C0` on the parent, `C1` on the child). Animation modifies relative rotation/position. If `Part0`/`Part1` are swapped, the limb rotates backwards.
- **R6 vs R15:** R6 has single-piece arms/legs (rougher but cheap animation); R15 splits into upper/lower/hand/foot (believable elbows and knees). Do not mix names from both in one rig.
- **`HumanoidRootPart`:** not animated directly with `Motor6D`; it is the displacement pivot. If the rig "floats" when animating, the `Humanoid` is usually compensating for an off-center pivot.
- **`Animator` + `Animation` + `AnimationTrack`:** the `Animation` is the clip; playing it on the `Animator` yields a controllable `AnimationTrack` (weight, speed, fade). The track looks up joints by name: a misspelled name = motionless limb with no visible error.
- **`Bone` and `SkinnedMesh`:** allow smooth bending but are more fragile to scaling and renaming. A bone renamed after weighting the mesh breaks deformation.
- **Scaling:** scale positions and offsets proportionally. Scaling only parts without touching `C0`/`C1` separates the rig.
- **`Accessory` and rigs:** accessories usually weld to head or torso; if the weld point depends on a renamed bone, the hat flies off.

Illustrative example (rig audit, not final code):

```luau
-- Ilustrativo: verifica que cada Motor6D tenga Part0/Part1 y nombres esperados.
for _, d in ipairs(rigModelo:GetDescendants()) do
	if d:IsA("Motor6D") then
		assert(d.Part0 ~= nil and d.Part1 ~= nil, "Motor6D sin extremos: " .. d.Name)
		print(d.Name, "une", d.Part0.Name, "->", d.Part1.Name)
	end
end
```

## Best practices

- One `Motor6D` per joint, neither zero nor two.
- Versioned neutral pose: any base `C0`/`C1` change is communicated to animation and code.
- Canonical names; the client proposes a custom rig, the server validates that names/bones match the allowlist before accepting that player's animations or scales.
- Prefer standard R15 unless there is a measured reason (performance or style); custom multiplies animation work.
- Validate the rig with a test `AnimationTrack` (arms up) before producing 20 clips.
- Document which parts are visual and which collide: the visual rig must not define physics.

## Common mistakes

1. **Two `Motor6D` on the same neck:** they fight and the head shakes. Keep one.
2. **Swapped `Part0`/`Part1`:** the elbow bends backwards. Check parent → child.
3. **`Animator` outside the `Humanoid` or duplicated:** tracks do not play or double-play. A single `Animator` inside the `Humanoid`.
4. **Non-standard names:** the R15 clip moves nothing because your arm is called `CoolArm`. Rename to the standard or re-map.
5. **Hand-scaling part by part:** separates `C0`/`C1`. Use the `Humanoid`/`HumanoidDescription` scaling flow or a script that scales offsets.
6. **`Bone` weights at 100% on a neighbor bone:** the shoulder stretches like taffy when raising the arm. Review mesh weights.
7. **`Accessory` welded to the wrong bone:** hat follows the hand. Re-weld to the documented point.

## Quality and done criteria

- [ ] Complete parent→child hierarchy with no orphaned or duplicate `Motor6D`.
- [ ] Neutral pose with recorded, reproducible `C0`/`C1`.
- [ ] Test clip moves each main joint without silent failure.
- [ ] Min/max scale with no separations or stretching.
- [ ] Single `Animator` inside `Humanoid`; test tracks with correct weight and fade.
- [ ] If `SkinnedMesh`: no lost vertices when bending elbows/knees fully.
- [ ] Name document delivered to animation and code.

## Tools

- Editor hierarchy view + platform rig plugin to create `Motor6D`.
- Audit script (example above) listing `Motor6D` without ends.
- Standard test clip (arms up, squat, head turn).
- R6/R15 comparator to decide migrations.

## Limitations

- Does not cover advanced facial animation or real-time `IKControl` beyond structure (IK is handled in locomotion/combat).
- Does not optimize meshes or bone budgets for mobile.
- Does not replace the `roblox-characters` lifecycle (respawn, streaming).
- Any API outside the stable list: "(verify in create.roblox.com/docs)".
