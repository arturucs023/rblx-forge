---
name: roblox-horror
description: Horror with tension, fair scares, readable darkness, and audio. Use it when you need scare pacing, monsters, flashlights, and light anti-cheat.
---

# Horror (Tension, Pacing, and Fair Scares)

## Objective
Create horror that scares without frustrating: tension→relief pacing, rule-telegraphed scares, readable darkness, audio as 50% of the fear, and anti-cheat traps for light exploits.

## Scope and limits
Deep genre version: loops, progression, mechanics, UX, performance, and pitfalls.
Declared differentiation: `roblox-genre-patterns` is a 1-line catalog; this skill is the deep horror version. `roblox-game-systems` is a concise recipe book. Does NOT repeat: detailed monster chase AI composes with `roblox-combat-systems` (damage/hit) and pathfinding, quests/objectives with `roblox-quest-progression-systems`, pass economy with `roblox-economy-balancing`, social/matchmaking with `roblox-social-systems`.

## Use cases
- Survival with a monster that patrols and listens.
- 20-minute story chapter with 3 scripted scares.
- 4v1 asymmetric with flashlights and hiding spots.
- Co-op horror with objectives and extraction.
- Haunted house with random events.

## Game or system loop (design)
- 2-min loop: explore in the dark → clue/sound → decide (hide/run) → brief relief.
- Chapter loop: 3–4 tension peaks (70–90 s) + 60 s valleys with light/clear objective.
- Session loop: complete objectives (3–5), survive/escape, badge + unlock.
Pacing: 60% tense exploration, 25% chase, 15% calm; scares every 4–7 min, never 2 within <90 s; flashlight battery 6 min + 2 batteries per chapter; if tester heart-rate (fun) drops with scares more frequent than every 2 min, space them out by 30%.

## Step-by-step process
1. Define the monster's rules in 3 visible lines (e.g. "it hears you run, doesn't see you crouch, fears light for 3 s").
2. Map readable in the dark: silhouettes, dim edge lighting, marked exits; darkness = contrast, not total black.
3. Flashlight with `SpotLight`: battery, flicker at 15%, batteries with `ProximityPrompt`; anti-brightness: gameplay must not depend only on seeing.
4. Audio: layers (ambience, footsteps, stinger 2 s before the scare, 1.5 s prior silence); optional subtitles + color-blind signal mode.
5. Hiding spots with `Attributes` (`Escondite=true`): enter with 0.8 s hold, exit with noise; monster checks 1–2 nearby spots, not all.
6. Objectives: 3–5 (keys/fuses) with partially free order; HUD with minimal current objective.
7. Fair scares: always counter-play (light, hiding, sprint with stamina); no jumpscare without a prior cue.
8. Difficulty: forgiving day 1 (monster 10% slower than sprint), night 2+ real; 1 revive per casual player.

## Technical knowledge
### What the server validates
- Damage/death by server logic only (monster–player distance, line of sight, hidden state).
- Objectives: proximity ≤12 studs + allowed order + no duplicates.
- Battery/batteries on server; client never sets `Bateria=100`.
- Real hiding: validate zone + stance; exiting generates audible noise for AI.
### Persistence
- Save unlocked chapter, badges, best time, and mode (casual/nightmare) with `DataStoreService`.
- Never save monster position; on rejoin restart the encounter, keep objectives.
### Errors/disconnections
- Player drops during chase: monster returns to patrol, doesn't camp their corpse.
- If the key carrier leaves, the key respawns at a visible point within 20 s.
- Stuck in hiding spot: "exit" button + smooth teleport 3 m away on collision.
### Anti-exploit
- Anti-max-light: monster uses server-side hearing/proximity, not what the client renders; raising brightness doesn't avoid detection.
- Anti-noclip to final room: validate keys on server before opening.
- Anti-speed while fleeing: speed clamp; sprint with server stamina.
- Interaction rate-limit 8/s.

## Best practices
- Accessibility: scare warning, "less intense" mode (fewer stingers, same story), guaranteed minimum brightness.
- Younger players: no excessive gore; comply with Roblox policies (see create.roblox.com/docs).
- Performance: 1 monster with cheap AI (0.2 s tick), limited lights (max 6 nearby dynamic), fog instead of per-pixel darkness.
- Use `CollectionService` for reusable scares and `Attributes` for state (chase/calm).
- Playtest with 5 people: if someone gets lost for >3 min, add signage.

## Common mistakes
1. Total black → players raise brightness and the fear is lost; use blue-gray + focal points.
2. Unfair monster (always faster) → rage; 90–95% of sprint speed + shortcuts for it.
3. Scare without cue → feels like cheating; always 2 s of prior audio.
4. Cryptic objectives with no HUD → abandonment; 1 line of objective always visible.
5. Unlimited lights with no cost → no tension; battery + scarce safe zones.

## Quality and done criteria
- [ ] 5 new testers complete the chapter in 18–30 min with no external guide.
- [ ] 0 deaths without counter-play in 20 chases (all had light/hiding/sprint).
- [ ] Max brightness avoids detection in 0/10 tests.
- [ ] Battery lasts 5–7 min and there are enough batteries without trivializing.
- [ ] Nobody lost for >3 min across 5 runs.
- [ ] 8 players with 1 monster at ≥45 FPS on a dark map.

## Tools
Services/classes: `Players`, `Attributes`, `CollectionService`, `ProximityPrompt`, `DataStoreService`, `PathfindingService` (patrol/chase), `RemoteEvent`. Sound with `SoundService` (see create.roblox.com/docs). Compose with `roblox-combat-systems` for damage.

## Limitations
- No advanced AI with complex senses; base here + extension.
- No branching narrative; compose with a quest/dialogue system.
- Sensitive content must be reviewed against platform policies.

```luau
-- Ilustrativo: ¿jugador detectable? (servidor).
local function detectable(escondido: boolean, corriendo: boolean, luzEncendida: boolean, dist: number): boolean
	if escondido and dist > 6 then return false end
	if corriendo and dist < 40 then return true end
	if luzEncendida and dist < 25 then return true end
	return dist < 8
end
```
