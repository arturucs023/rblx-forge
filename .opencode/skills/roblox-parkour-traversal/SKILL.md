---
name: roblox-parkour-traversal
description: Parkour and traversal (vault, climb, wallrun, slide, stamina). Use it when adding climbing, sliding, or wall-running with anti-fly validation.
---

# Parkour and Traversal

## Objective

Add fluid obstacle movement — vault, climb, wallrun, slide — with robust edge detection, clear stamina costs, and server validation that allows fluidity without giving away flight.

## Scope and limits

Covers on-foot traversal beyond the base controller: detection, execution, cancellation, stamina, and anti-exploit.

**What it does NOT do:**

- It does NOT cover respawn-safe lifecycle: covered by `roblox-characters`.
- It does NOT cover the base controller (walk/jump/coyote-time): covered by `roblox-character-controller` (this skill extends it, it does not replace it).
- It does NOT cover base locomotion clips: covered by `roblox-locomotion-animation` (here only vault/climb/slide-specific clips).
- It does NOT cover vehicles: see `roblox-land-vehicles`, `roblox-air-vehicles`, `roblox-water-vehicles`.
- It does NOT cover NPCs with parkour: covered by `roblox-npcs`.
- It does NOT cover traversal cameras: covered by `camera-systems`.

## Use cases

1. Vaulting low walls fluidly instead of jumping.
2. Climbing marked walls with an animated climb and cost.
3. Short wallruns on smooth walls for shortcuts.
4. Sliding under obstacles with a cancel window.
5. Stamina that prevents infinite climb spam.
6. Players using climb to fly out of the map.

## Step-by-step process

1. **Fix the game's vocabulary.** Pick 2–4 moves (e.g. vault + climb + slide). Each with: max height/length, stamina cost, cooldown, whether it preserves momentum. More than 4 with no tutorial = nobody uses them.
2. **Label the world.** With `CollectionService` tag: `Vaultable` (0.8–1.5 m), `Climbable` (specific walls), `Wallrun` (smooth straight walls), `SlideUnder` (gaps). The untagged never triggers parkour.
3. **Implement forward detection, not touch.** For vault/climb: probe at hip/head height in the `HumanoidRootPart` movement direction. Requires: minimum speed, approach angle (<45°), and free edge above. Without all three, it does not fire.
4. **Define execution as a state with an end.** Each move is a temporary state: start (0.1 s) → guided displacement → exit with agreed velocity. Hardcoded max duration (vault ~0.4 s, wallrun ~1.2 s). With no guaranteed end there are flights.
5. **Sync clip with displacement.** The clip (see locomotion) lasts as long as the displacement: 0.4 s vault over a 1 m wall. If art and movement disagree, adjust the agreed displacement first, then the clip.
6. **Add stamina as economy.** Cheap vault, costly climb per second, wallrun drain, free slide but with cooldown. Without stamina the player climbs the skyscraper on chained jumps.
7. **Design cancellations.** Every move cancels on: damage, jump (wallrun→wall jump), stamina out, surface loss. Every cancellation leaves coherent velocity, never a flat zero mid-air.
8. **Validate on the server.** The server knows tags, positions, and stamina: it accepts parkour only if there is a tagged surface nearby, height is within range, and stamina suffices. The client proposes ("I want to vault"), the server authorizes the displacement.
9. **Test the golden route and the broken one.** Design one route chaining your 3 moves and one exploit route (attempt to climb out of the map). The first must flow; the second must be rejected with no false kicks for laggy players.
10. **Teach it in the world.** One obvious low wall + prompt the first time; the rest is discovered. Without teaching, parkour does not exist for the player.

## Technical knowledge

- **Detection:** probes (rays/volumes) from the `HumanoidRootPart` or `Humanoid`: obstacle height, free space above, wall normal. The normal decides: floor = walk, vertical wall = wallrun/climb, low edge = vault.
- **Guided `HumanoidRootPart`:** during vault/climb the displacement follows an agreed curve (not free physics). At the end, control returns to the base controller with the documented exit velocity.
- **Wallrun:** requires a continuous wall, minimum entry speed, and a max timer; gravity is reduced, not removed. Without wall or speed, it falls.
- **Slide:** low state with reduced friction and a crouched visual hitbox; cancels on jump or impact. Useful under `SlideUnder` obstacles.
- **Stamina:** 0–100 resource with regen only when grounded and still or walking. Every parkour action declares a cost; the server owns the balance.
- **`CollectionService`:** single source of truth for what is climbable. Asking by tag prevents a rename from opening an exploit.
- **Anti-fly:** hard limits: max height gain per move, max duration, cooldown between climbs. The server corrects (smooth snap) instead of kicking on small lag discrepancies.

Illustrative example (entry gate with triple condition, not final code):

```luau
-- Ilustrativo: el vault exige etiqueta, altura y velocidad mínima.
if etiqueta == "Vaultable" and alturaBorde <= 1.5 and velocidadHumanoide >= 8 then
	-- El cliente pide; el servidor re-valida etiqueta + distancia antes de autorizar.
	solicitarVault(borde)
end
```

## Best practices

- The client proposes, the server validates: tags, distance to the surface, stamina, and cooldown are checked on the server; the client only predicts the visual start.
- One new move = one tag + one cost + one limit. No exceptions.
- Preserve momentum on exit: vault keeps speed, wallrun→jump converts it into agreed lateral impulse.
- All parkour works with gamepad and touch (one contextual jump button); no 3-key combos.
- Log server-rejected attempts to spot exploit spots and lag false positives.
- Coordinate fades with `roblox-animation-systems` and `roblox-locomotion-animation`: parkour is one more state in the matrix.

## Common mistakes

1. **Contact parkour:** triggering on touching any part. Require tag + angle + speed.
2. **Infinite climb:** with no cost or cooldown everything gets climbed. Stamina + cooldown + max height per attempt.
3. **Eternal wallrun:** with no timer the player crosses the map on the wall. ~1 s max + minimum speed.
4. **Zero-velocity exit mid-air:** cancelling wallrun and floating. Every exit leaves agreed velocity or immediate fall.
5. **Trusting server:** accepting "I'm climbing" without checking a nearby surface = free flight. Validate tag and distance.
6. **Visual-only detection:** the clip says vault but the body crosses the wall. Agreed displacement + real collision, not just animation.
7. **Parkour breaking cameras:** sharp turns fighting `camera-systems`. Fix turn speed during guided states.

## Quality and done criteria

- [ ] 2–4 moves with datasheet (range, cost, cooldown, exit velocity).
- [ ] `CollectionService` tags placed and documented; nothing works without a tag.
- [ ] Triple detection (tag + geometry + speed) verified on the test bench.
- [ ] Stamina with measured costs and regen; test spots impossible to climb without pausing.
- [ ] Server validation rejects flight/exploits in adversarial testing with no false positives at 150 ms.
- [ ] Golden route completable by a new player after a single prompt.
- [ ] Transitions registered in the `roblox-animation-systems` matrix.

## Tools

- Obstacle bench (0.8/1.2/1.5 m low walls, climbable wall, wallrun wall, slide tunnel).
- Standard move datasheet + world tag table.
- Exploit test client (climb attempts on untagged walls, infinite wallrun).
- Timed golden route to calibrate fluidity.

## Limitations

- Does not cover hooks, air dash, or teleports (they are abilities, another discipline).
- Does not cover ropes physics or ragdoll.
- Does not replace the base controller: it extends it.
- APIs outside the stable list: "(check create.roblox.com/docs)".
