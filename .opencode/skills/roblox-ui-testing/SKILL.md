---
name: roblox-ui-testing
description: UI testing per screen (walkthroughs, states, resolutions, legibility). Use it when validating menus, HUD, or flows before each release.
---

# UI Testing in Roblox

## Objective
Guarantee every screen works and reads well at all sizes: complete walkthroughs per flow, states (loading/empty/error), mobile–PC resolutions, legibility, and a repeatable checklist per release.

## Scope and limits
Differentiation: `roblox-testing` (installed) is the QA umbrella and `roblox-testez` covers unit logic; this skill is the dedicated UI practice (walkthroughs, states, resolutions). `roblox-multiplayer-testing` covers concurrency; here we cover what each player sees.

What it does NOT do:

- Does NOT design UI art; it verifies the implemented design works and reads.
- Does NOT test server logic (see `roblox-testez`, `roblox-multiplayer-testing`).
- Does NOT automate external captures; it defines walkthroughs runnable in Studio/on device.

## Use cases
1. Shop flow: open → buy → confirm → receive → see HUD reflection.
2. Menu → lobby → match → results with no dead screens.
3. States: empty inventory, slow load, data error with degradation.
4. Small mobile vs wide PC: no overlaps or unreachable buttons.
5. Release checklist: 15 min that blocks shipping if it fails.

## Step-by-step process
1. Inventory screens and flows: list each screen, where it's reached from, and where it leads. No map, no coverage.
2. Write walkthroughs as numbered steps with an expected result per step (what appears, what changes). One walkthrough = one player flow.
3. Add a state matrix per screen: loading, empty, with data, error/degraded. Each cell has a capture or a description of what's expected.
4. Define test resolutions: small phone (e.g. 4.7"), tablet, 16:9 PC, ultra-wide PC if applicable. Always verify on at least mobile + PC.
5. Run with safe area and thumb: on mobile, everything actionable with the thumb without covering info; on PC, navigable with keyboard/mouse and no focus traps.
6. Verify legibility: contrast, minimum size, no clipped or overlapped text, localization without overflow (long test strings).
7. Test interruptions: mobile call/notification, resize on PC, late join changing the UI, data error that must show degradation (see `roblox-error-handling`).
8. Log defects with screen, resolution, steps, and capture; classify Blocker (flow can't complete) vs Minor (visual).
9. Freeze a release checklist (10–20 items, <20 min) and run it identically every time; any Blocker stops the release.

## Technical knowledge
- Walkthrough as contract: each step has a precondition, action, and observable postcondition. If the postcondition isn't observable, the walkthrough is useless.
- States as a machine (see `roblox-state-machines`): Loading → Ready → Empty/Error. The UI never sits blank without explanation.
- `Attributes` to force states in tests (e.g. `UIState=Loading`) without touching code, making each cell easy to capture.
- Text: test with 2x-long strings and wide characters; if layout breaks, the layout is the bug.
- Touch vs click: generous minimum touch areas on mobile; on PC, visible focus and sane tab order (verify exact controls at create.roblox.com/docs if in doubt).
- UI performance: long lists with reuse/pagination; measure with MicroProfiler if scrolling hundreds of cells.
- Data consistency: the UI reads from the same config as the logic (e.g. odds from `roblox-rarity-collectibles`); no duplicated text.

Illustrative example (shop walkthrough):

```text
R-TIENDA-01 Compra de sobre (ilustrativo)
1. Desde HUD, pulsa Tienda → se abre en <1s, muestra odds.
2. Pulsa Comprar → aparece confirmación con precio.
3. Confirma → descuento visible, apertura animada, item + rareza.
4. Cierra → HUD refleja item/polvo, historial registra apertura.
Falla si: falta confirmación, odds invisibles, HUD no actualiza.
```

Illustrative example (state matrix):

```text
Pantalla Inventario (ilustrativo)
| Estado   | Esperado |
| Loading  | skeleton + "Cargando", sin botones rotos |
| Vacío    | ilustración + CTA "Abrir tienda" |
| Con datos| grid sin solapes en móvil y PC |
| Error    | aviso + "Reintentar", modo degradado visible |
```

Illustrative example (release checklist):

```text
UI-RELEASE vX (ilustrativo, <20 min)
[ ] R-TIENDA-01 en móvil + PC
[ ] Inventario vacío/error
[ ] Resultados post-partida legibles
[ ] Sin texto cortado con strings largos
[ ] Botones críticos alcanzables con pulgar
```

## Best practices
- Fewer screens, well tested. Each new screen adds 4 states × N resolutions.
- Captures per state and resolution in the UI PR; visual diff is evidence.
- Real copy (not lorem) from the first test; localization breaks late layouts.
- Minimum accessibility: contrast, size, colorblind-safe rarity (not color only).
- The release checklist lives in the repo and is versioned with the game.

## Common mistakes
1. Testing only on wide PC: on mobile buttons overlap or go off-screen. Mobile always.
2. Only the "with data" state: empty and error are discovered in production. Full matrix.
3. Duplicated text between UI and logic (odds, prices): they diverge. One source.
4. Walkthroughs with no observable postcondition ("check that it works"): never fails. Every step verifies something.
5. Ignoring safe area/notch: buttons under the notch unreachable. Respect insets.
6. Lists without pagination holding hundreds of items: scroll at 5 FPS. Paginate or virtualize.
7. A different checklist every release: regressions return. Freeze and version it.

## Quality and done criteria
- [ ] Complete screen/flow map and walkthroughs with a postcondition per step.
- [ ] Loading/Empty/Data/Error matrix verified per critical screen.
- [ ] Mobile + PC verified with no overlaps, clipping, or unreachable buttons.
- [ ] Long/localization strings without overflow; contrast and legibility accepted.
- [ ] Release checklist (<20 min) green with a tagged build.
- [ ] Zero open Blockers; Minors triaged with an owner.

## Tools
- Playtest in Studio + real device (mobile) for resolutions.
- `Attributes` to force UI states in tests.
- `BindableEvent` to simulate system events toward UI in the same context.
- `roblox-testez` for UI-state logic; `roblox-ci-cd` to block release on red.

## Limitations
- Does not cover visual design or copy; verifies implementation.
- Does not cover multi-client concurrency; defer to `roblox-multiplayer-testing`.
- If you doubt UI or inset APIs, note "(verify at create.roblox.com/docs)".
