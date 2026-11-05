---
name: roblox-expressive-animation
description: Emotes, facial expressions, and interaction gestures. Use it when characters feel robotic in social, shops, or cinematics.
---

# Expressive Animation and Social Interaction

## Objective

Give the character social life: readable emotes, facial expressions (including `FaceControls` where applicable), and interaction gestures with objects (`ProximityPrompt`, `Tool`) with timing that doesn't interfere with locomotion or combat.

## Scope and limits

Covers player expressiveness: emotes, dances, greetings, use/collect gestures, expressions, and social layer rules.

**What it does NOT do:**

- Does NOT cover the respawn-safe lifecycle: covered by `roblox-characters`.
- Does NOT cover rigs or facial weights: covered by `roblox-rigging` (here we use already-valid rigs).
- Is NOT the general dispatcher: `roblox-animation` defines the framework; expressive domain here.
- Does NOT cover locomotion or combat: see `roblox-locomotion-animation` and `roblox-combat-animation` (this skill lives on low-priority layers).
- Does NOT cover NPCs with dialogue/AI: covered by `roblox-npcs`.
- Does NOT cover cinematic cameras: covered by `camera-systems`.

## Use cases

1. Emote wheel (wave, dance, sit) for social lobby.
2. Collect/open-chest gesture synced with `ProximityPrompt`.
3. Victory/defeat expressions at round end.
4. Character pointing at an objective for teammates.
5. Shop where the vendor makes an offering gesture (player with role).
6. Group photo where everyone dances without clipping.

## Step-by-step process

1. **Classify each gesture.** Pure social (dance, wave: may interrupt locomotion), interaction (collect, use: brief and with object), reactive (surprise, victory: event-driven). Each class has different priority and cancel rules.
2. **Define duration and cancel.** Socials: 1–4 s, cancellable on move. Interaction: 0.5–1.2 s, not cancellable mid-way except on forced movement. Reactive: 0.5–1 s, never interrupt combat. Write it down before animating.
3. **Design in layers.** Legs = locomotion (keep walking if the player moves), torso/arms/head = gesture. A wave should never lock the legs unless it's a seated dance.
4. **Exaggerate the key pose.** At social distance (10–20 studs) subtle gestures don't read: wave with the arm high, surprise with torso back + open arms. One strong pose beats 2 s of timid motion.
5. **Sync with the object.** For `ProximityPrompt` or `Tool`: contact frame = moment the object changes (picked up, opened). If the gesture ends 0.5 s before the effect, it looks like mime. Fit the clip to the event, not the other way around.
6. **Add the face last, not first.** Body readable first, then expression (`FaceControls` or head) as reinforcement. The face alone doesn't carry an emote at 15 studs.
7. **Control social timing.** Fast entry (0.1–0.15 s fade), readable hold (at least 0.4 s on the key pose), soft exit. Looped dances need start/end that match with no jump.
8. **Test in a group.** Put 5 characters doing the emote at once with latency: is it readable? Do sounds stack? Do `Accessory` items clip through neighboring faces?
9. **Abuse rules.** Define cooldown per emote, which emotes are blocked in combat or competitive play, and which gestures need server validation (those granting effects).
10. **Ship the catalog.** Each emote with: name, duration, layer, cancellable yes/no, cooldown, whether it needs an object, and whether it grants a gameplay effect.

## Technical knowledge

- **Layers and priorities:** expressive lives at low/medium priority over torso locomotion, never over hit-react or attack (see combat). Legs almost always stay with locomotion.
- **Social `AnimationTrack`:** short entry fade for snappy response; loops (dance) must have matching start = end pose or a dedicated loop fade.
- **`FaceControls`:** facial controls where the rig supports them; they reinforce but don't replace body pose. If the rig lacks them, the head (neck `Motor6D`) carries the expression with tilts.
- **`ProximityPrompt` + gesture:** the prompt fires the event; the gesture is presentation. The server validates the interaction (distance, cooldown, object ownership); the gesture never grants the item.
- **`Tool` in gestures:** hiding or lowering the `Tool` during dances avoids weapons clipping through heads. Define per emote whether the weapon is stowed.
- **`Accessory` and emotes:** big hats + bows = guaranteed clipping. Test each emote with the largest allowed accessory.
- **Social replication:** emotes must show on other clients; the server validates permission/cooldown and orders playback (see `roblox-animation-systems`).

Illustrative example (social layer that respects legs, not final code):

```luau
-- Ilustrativo: saludo solo en torso/brazos, piernas libres para locomoción.
local saludo = animator:LoadAnimation(animSaludo)
saludo.Priority = Enum.AnimationPriority.Action2 -- por encima de idle, por debajo de golpe
saludo:Play(0.12)
-- Al moverse se detiene: el jugador recupera el control sin pop largo.
```

## Best practices

- The client proposes the emote, the server validates: permission, cooldown, context (in combat? dead?) and if the emote grants anything, only the server grants it.
- Every social emote must be cancellable by movement or damage; never lock control for more than 1 s without a gameplay reason.
- One gesture, one read at 15 studs: if it needs explanation, exaggerate it.
- Separate "pure" emotes (no effect) from interactions (with effect): the latter always go through the server.
- Respect locomotion: expressive never moves `HumanoidRootPart` except for dances marked as "rooted" and documented.
- Include at least one seated/accessible emote option for group photos and social accessibility.

## Common mistakes

1. **Emote locking control for 3 s in competitive play:** frustration and reports. All social emotes cancel on move.
2. **Gesture with no contact:** collect ending before the object disappears. Sync contact frame with the event.
3. **Face as the only channel:** subtle expression invisible at 15 studs. Body first, face after.
4. **Broken dance loop:** visible jump every 2 s. Match start/end pose or add a fade.
5. **Weapon through heads:** dancing with an equipped `Tool` not stowed. Lower or hide the weapon per emote.
6. **Emote spam with sound:** 10 players dancing = chaos. Cooldown + simultaneous-sound limit.
7. **Emote granting advantage:** gesture hiding the hitbox or letting you see through walls. Validate on the server and ban in combat if needed.

## Quality and done criteria

- [ ] Catalog delivered with duration, layer, cancel, and cooldown per emote.
- [ ] Each emote readable at 15 studs by a new tester with no explanation.
- [ ] Interaction gestures synced with the event (contact = effect).
- [ ] Cancel on movement/damage verified for all socials.
- [ ] 5-player group test with no major clipping or sound chaos.
- [ ] Server validation for emotes with effects; purely visual ones documented as visual.
- [ ] No `HumanoidRootPart` displacement except for declared "rooted" dances.

## Tools

- Emote catalog (standard table of this skill).
- Social test scene: 5 dummies, distance marked at 15 studs.
- Largest-`Accessory` list for clipping tests.
- Object-gesture sync checklist for each `ProximityPrompt`.

## Limitations

- Does not cover branching dialogue or conversational AI (see `roblox-npcs` for NPCs).
- Does not cover multi-camera cinematics (see `camera-systems`).
- Does not replace content moderation: user emotes need additional filters outside this skill.
- APIs outside the stable list: "(verificar en create.roblox.com/docs)".
