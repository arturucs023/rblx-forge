---
name: Roblox Inventory and Equipment
description: Roblox inventory and equipment grids, categories, equip, and tooltips. Use it when building a backpack, equipment, drag/click to equip, or visible sync with saving.
---

# Roblox Inventory and Equipment

## Objective

Give the player full control over their items: see what they have, compare, equip/use/drop without errors, and understand what is equipped at a glance. The inventory must be fast (equip in 2 clicks), readable with 100+ items, and honest about what is saved on the server.

## Scope and limits

Covers: slot grid, categories/filters, click or drag equip, detail tooltips, states (equipped, new, locked), and UI reflection of datastore saving.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Shop and item purchase: covered by `roblox-shop-ui`.
- Quest journal and rewards: covered by `roblox-quest-journal-ui`.
- Pets and vehicles as systems: covered by `roblox-pets-ui` and `roblox-vehicle-ui` (only the grid pattern here if reused).

## Use cases

- Backpack with Weapons/Armor/Consumables tabs and scrolling grid.
- Equip a sword by clicking or dragging it to the hand slot.
- Tooltip with stats, rarity, and Use/Equip/Drop buttons.
- "Saving… / Saved" indicator after equipping or moving.
- Capacity bar "23/40" with warning when full.

## Step-by-step process

1. **Define the data model on paper.** Item types, equipment slots (hand, head, etc.), stackables vs. uniques, max capacity. Without this contract, the UI accumulates patches.
2. **Mock up the layout.** Left: categories + grid (`ScrollingFrame` + `UIGridLayout`); right: equipment + detail panel. On mobile: tabs on top, full-screen grid, and detail as a bottom sheet.
3. **Build the grid.** `ScrollingFrame` with `UIGridLayout` (cell at relative `Scale`, e.g. 64 px-equivalent minimum), each slot = `Frame` + `ImageLabel` icon + `TextLabel` count + rarity mark (`UIStroke` or band). Empty slots with faint placeholder.
4. **Implement categories and search.** Filter `TextButton`s + optional search box; filtering never destroys data, only hides slots. Visible counter per category.
5. **Equip by click and by drag.** Click = select + Equip button; double-click or button = direct equip. Drag = move between slots with a visual clone following cursor/finger. Both paths call the same `requestEquip(id)` function.
6. **Tooltips with actions.** On select or hover: `Frame` with name, rarity, compared stats (+12 vs. equipped), 1-2 line description, and Use/Equip/Drop buttons. On touch the tooltip is a fixed panel, not hover.
7. **Visible sync.** The UI is optimistic but honest: apply the change instantly and show "Saving…" until server confirmation (see create.roblox.com/docs for remotes and datastores); on failure, revert and warn. Never show "Saved" before confirmation.
8. **Capacity and edges.** Capacity bar, warning at 90%, and blocked pickup with a clear message. New items with a "New!" badge that clears when seen.
9. **Verify with 150 items.** Fill a test inventory, measure scroll at 60 fps, check that equip/unequip doesn't duplicate and that rejoin preserves equipment.

## Technical knowledge

- Grid cell (stable classes):

  ```luau
  -- Ejemplo ilustrativo: crear un slot de inventario
  local slot = Instance.new("Frame")
  slot.Name = "Slot_001"
  slot.Size = UDim2.fromScale(0.18, 0.18)
  slot.Parent = gridFrame

  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 8)
  corner.Parent = slot
  -- Icono (ImageLabel), cantidad (TextLabel) y rareza (UIStroke) cuelgan del slot.
  ```

- `UIGridLayout` with relative `CellSize` + `CellPadding`; `ScrollingFrame` with discreet `ScrollBarThickness` and automatic `CanvasSize` (see create.roblox.com/docs for exact properties).
- Selection: a single selected slot, marked with accent `UIStroke`; the equipment panel reflects state with icons in each body slot.
- Drag: icon clone with high `ZIndex` following `UserInputService.InputChanged` (mouse/touch); on release, resolve target slot or cancel with return tween.
- Data: the client requests, the server validates and saves (datastores and remotes; see create.roblox.com/docs). The client never invents items or counts.
- `UIScale` for compact mode on small screens without rewriting the layout.

### Visual identity of this skill (original, do not copy)

- "Technical armory" direction: slate background (#171D2E), graphite slots (#232B45) with rarity band (common gray, rare blue #4DA3FF, epic purple #B45CFF, legendary amber #FFC53D). Cyan selection accent (#38E1FF).
- Typography: names 14 semibold, counts 13 bold in corner, stats 13 monospaced or tabular, descriptions 13 light gray.
- Composition: 5-6 column grid on PC / 4 on mobile, right-side equipment panel with body-slot silhouette (head, torso, hands, feet). `UIPadding` 12, `UICorner` 8, 1 px `UIStroke` per rarity.
- Spacing: 8 gap between slots, 16 between sections. Slots minimum 56 px-equivalents on touch.
- States: hover raises + border, pressed 0.96, equipped with check + accent border, new with amber dot, locked/full in gray with textual lock, saving with spinner in header.
- Animation: equip with 0.25 s pulse via `TweenService`; move with clone fade; no exaggerated bounces.

## Best practices

- Always equip in ≤2 clicks; frequent actions (use consumable) in 1.
- Visible comparison: "+12 damage vs. equipped" beats 6 bare stats.
- Confirm only destructive actions (drop/sell legendary); don't modal the reversible.
- Stable order: by rarity/recent with a visible criterion that persists across sessions.
- Consistent with shop and journal: same icons, same rarities, same buttons.
- Actionable error text: "Backpack full (40/40). Drop or sell something." not "Error 7".

## Common mistakes

- Allowing two items in the same slot via fast double-click (missing debounce + server validation).
- Showing items the server never confirmed and duplicating after rejoin.
- Grid with `Offset` only that overflows on mobile or leaves 2 giant columns on PC.
- Hover-only tooltip that is unreachable on touch.
- Dropping items with no confirmation or recovery.
- Rarity icons by color only, unreadable for color-blind players (add text or shape).

## Quality and done criteria

- [ ] Equip/unequip/move/use work with mouse and touch.
- [ ] With 150 items scrolling stays smooth and search filters in <200 ms.
- [ ] State after rejoin matches the server save.
- [ ] No duplicates or losses under click spam or simulated high latency.
- [ ] Readable on PC, tablet, and portrait mobile with no overlaps.
- [ ] Destructive actions ask for confirmation; the rest don't interrupt.

## Tools

- Studio: Play with server to validate saving, touch simulator for drag.
- Studio MCP (if available): captures of the full grid on 3 resolutions, `Output` on sync failures.
- Rojo: item definitions (name, rarity, icon) as versioned data.
- Selene: lint equip/move handlers and debounce.

## Limitations

- Real persistence (datastore) and validation live on the server (see create.roblox.com/docs); this UI only reflects them.
- No player-to-player trading or auctions; self-management only.
- Touch drag on long lists may need per-platform tuning; test on a real device.
- Icons and images must respect the project's memory budget; no new external assets.
