---
name: roblox-interaction-systems
description: Interactions with raycasts, prompts, holds, and feedback. Use it when you need doors, loot, NPC dialogue, gathering, or buttons with clear UX.
---

# Environment Interactions

## Objective
Create predictable, fast interactions: the player always knows what they can touch, how long it takes, and what will happen, with server validation on every activation.

## Scope and limits
Covers `ProximityPrompt`, `ClickDetector`, gaze raycast, hold-to-interact, feedback, and accessibility.
Declared differentiation: `roblox-game-systems` (installed) is a concise recipe book; this skill is the deep version with UX, concurrency, and spam control. Does NOT cover node-based gathering economy (covered by `roblox-resource-gathering`), nor building (covered by `roblox-building-placement`), nor branching dialogue (requires a dedicated dialogue system). `roblox-genre-patterns` doesn't go deep.

## Use cases
- Doors/safes with hold and key.
- Loot with personal window and spam-click.
- NPC that opens a shop/dialogue on approach.
- Map buttons that activate bridges/traps.
- Repairable/hackable with interruptible progress bar.

## Game or system loop (design)
1. Discover affordance (outline + prompt at readable distance).
2. Approach (range) and read cost/effect.
3. Hold/press (0–3 s hold by risk).
4. Validation and effect + immediate feedback.
5. Cooldown and clear re-use.
Example balance: common loot 0.4 s hold, keyed door instant, 3 s interruptible hack; 10–14 stud range; 1 s cooldown to avoid double use; if average interaction time exceeds 2.5 s on frequent actions, lower the hold or add an upgrade.

## Step-by-step process
1. Pick the channel: `ProximityPrompt` (recommended 3D), `ClickDetector` (simple click), custom raycast (gaze + E key).
2. Standardize prompts: `ActionText`, `ObjectText`, `HoldDuration`, `MaxActivationDistance` (10–14), `RequiresLineOfSight` when it matters.
3. Show only what's relevant: 1 priority prompt by proximity; hide the rest to avoid overlap.
4. Trigger via `Prompt.Triggered` on the server (Script, not LocalScript) or `RemoteEvent Interact(id)` for custom raycast.
5. Validate on server: exists, in range, meets requirements (key/level), no cooldown, no concurrent use.
6. Execute atomically (open, grant loot, local teleport) and mark `inUse` with timeout.
7. Triple feedback: animation + sound + UI ("+3 Wood", "Door unlocked"); failure with reason.
8. Accessibility: hold alternative (press 3 times), large prompt size, subtitles for key sounds.

## Technical knowledge
### What the server validates
- Distance with server position ≤ `MaxDistance + 2` tolerance.
- Hold completed on server (`Triggered` already guarantees it; in custom setups validate duration).
- Requirements: item/key in server inventory, level, team.
- Concurrency: object with `occupiedBy` + 5 s expiry; second player gets "in use".
### Persistence
- Persistent doors/chests save state (`openedBy`, `lootClaimed_UserId`) with `DataStoreService` only if the design requires it.
- Personal loot: save `claimed[]` per player, not global state.
- Daily chests: save `lastClaimUnix` and validate 20 h on server.
### Errors/disconnections
- Hold interrupted by death/exit: cancels with no effect or charge.
- Object destroyed mid-hold: graceful failure with message, no error.
- Double trigger from lag: idempotency via `useId`; second one ignored.
### Anti-exploit
- `ClickDetector` always with `MaxActivationDistance`; without it, use works across the map.
- Never grant loot because the client said "I opened chest X"; the server decides.
- Rate-limit 8 interactions/s; more = ignore + strike.
- Validate line of sight for critical levers with server `Raycast` if there is risk of use through walls.

## Best practices
- One `Script` `InteractionServer` + `ModuleScript InteractDefs`; prompts created by code, not by hand one by one.
- `CollectionService` tags: `Lootable`, `Door`, `Hackable` for registration and cleanup.
- Priority: revive > mission door > loot > decorative.
- Visual cooldown on the prompt (`Enabled=false` + countdown).
- Distinct error sound per reason (too far, locked, in use).

## Common mistakes
1. Logic in `LocalScript` with client `Triggered` → fake loot; move to server.
2. 15 prompts visible at once → unreadable; prioritize the nearest.
3. 5 s hold for trivial loot → abandonment; reserve long holds for real risk.
4. No `RequiresLineOfSight` on secret lever → exploitable; enable it.
5. No `inUse` timeout → object locked forever if the player leaves.

## Quality and done criteria
- [ ] 30 legitimate interactions at 150 ms ping with <3% false rejections.
- [ ] Use at 30 studs or through a wall rejected 10/10.
- [ ] Simultaneous double trigger grants 1 loot only.
- [ ] Hold interrupted by death neither charges nor grants.
- [ ] 50 interactable objects with <1 ms idle cost.
- [ ] Touch test: all prompts usable without keyboard.

## Tools
Services/classes: `ProximityPrompt`, `ClickDetector`, `Players`, `CollectionService`, `Attributes`, `RemoteEvent`, `TweenService`, `DataStoreService` (persistent states). See create.roblox.com/docs.

## Limitations
- No dialogue trees or cinematics; requires a separate narrative system.
- No general inventory; compose with `roblox-resource-gathering` or `roblox-crafting`.
- Custom 60 Hz raycast for many players needs further optimization.

```luau
-- Ilustrativo: registro de interactuables por tag.
local CollectionService = game:GetService("CollectionService")
for _, obj in CollectionService:GetTagged("Lootable") do
	print("Loot:", obj:GetFullName())
end
```
