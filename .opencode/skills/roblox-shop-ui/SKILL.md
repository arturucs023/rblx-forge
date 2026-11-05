---
name: Roblox Shop and Showcase
description: Product grids, prices, preview, and purchase with confirmation. Use it when you create shops, showcases, passes, owned/out-of-funds states, or purchase confirmations.
---

# Roblox Shop and Showcase

## Objective

Sell without deceiving: the player understands what they buy, how much it costs, what they get (real preview), and confirms before paying. Covers the full showcase —browse, compare, confirm, feedback— with clear available, owned, and out-of-funds states.

## Scope and limits

Covers: product grid, soft/hard currency prices, item preview, purchase confirmation, owned/no-funds/limited states, and post-purchase feedback.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior monetization UX design: covered by `roblox-game-ux`; this skill implements the screen.
- Real Robux processing or receipts: validated on server (verify in create.roblox.com/docs); the UI only starts and reflects.
- Inventory and equipment: covered by `roblox-inventory-ui` (here only the "See in inventory" button).
- Season pass as a progression system: teaser in `roblox-main-menu`; here only its purchasable card.

## Use cases

- Shop with Featured/Weapons/Pets/Coins tabs.
- Sword card with "1,250 coins" price, preview, and Buy button.
- "Buy X for Y?" confirmation with visible balance.
- "Owned" state that switches to Equip, and "You need 300 more" out-of-funds.
- Limited offer with honest timer and visible stock.

## Step-by-step process

1. **Define the catalog in data.** ID, name, price, currency, preview, whether unique or consumable, requirements (level/pass). No data, no UI: first the table, then the screen.
2. **Mock up the showcase.** Header with balance (2 visible currencies max) + category tabs + `ScrollingFrame` grid + detail/preview panel. Mobile: 2-column grid + detail as bottom sheet.
3. **Build the cards.** Each product = `Frame` + `ImageLabel` or `ViewportFrame` preview + `TextLabel` name + `TextLabel` price with icon + `TextButton` Buy/Equip. Price always with explicit currency ("1,250" alone never).
4. **Implement honest preview.** Show the real object (real model or real stats from the catalog). Slow rotation in `ViewportFrame` only if it costs no performance; otherwise faithful static image. No renders that do not match what is delivered.
5. **Purchase confirmation.** Every purchase opens a modal: what + how much + balance before/after + Confirm/Cancel. No purchase without confirmation. Double-click protected with loading state + debounce.
6. **States per card.** Available (primary button), Owned (secondary "Equip"/"View" button), Out-of-funds (disabled button + "You need X more"), Locked by requirement ("Level 10"), Offer (timer + struck old price only if real).
7. **Post-purchase feedback.** Success: check + "Added to inventory!" + View button; failure: reason + action ("Get coins" leads to the source, not a dead end). Balance updates only after server confirmation.
8. **Social proof and light legality.** "Best seller" only with real data. Regional pricing, taxes, and Robux/payment policies: (verify in create.roblox.com/docs) and with the game owner; the UI never invents terms.
9. **Verify at 3 resolutions.** Prices without truncation, touch buttons ≥48 px, smooth scroll with 60+ products, no heavy images that break mobile memory.

## Technical knowledge

- Product card (stable classes):

  ```luau
  -- Ejemplo ilustrativo: tarjeta de tienda
  local card = Instance.new("Frame")
  card.Name = "ProductCard"
  card.Size = UDim2.fromScale(0.3, 0.4)
  card.Parent = grid

  local buyButton = Instance.new("TextButton")
  buyButton.Name = "BuyButton"
  buyButton.Text = "Comprar · 1.250"
  buyButton.Size = UDim2.fromScale(1, 0.18)
  buyButton.Position = UDim2.fromScale(0, 0.82)
  buyButton.Parent = card
  ```

- Grid with `UIGridLayout` at `Scale`, `UIPadding`, `UICorner` 10-12, `UIStroke` by rarity/offer. Prices with `UITextSizeConstraint` so "1,250,000" does not break.
- `ViewportFrame` for 3D preview only on the selected card or detail panel, not on all 60 cards at once.
- Purchase: the client requests, the server validates funds, delivers, persists (verify in create.roblox.com/docs for products and receipts). The UI shows loading until the response and rolls back on failure.
- Visible balances: the UI paints them from the player's replicated state; never computes them locally.
- `TweenService` for card entrance (slight stagger) and the confirmation modal.

### Visual identity of this skill (original, do not copy)

- "Bright showcase" direction: navy background (#12172A), smoke-white cards (#F4F6FB) with dark text for product contrast, buy green accent (#22C55E), offer coral (#FF6B6B), coin gold (#FFC53D).
- Typography: price 18-20 extra-bold (largest on the card), name 15 semibold, meta 12 gray. Price never truncated or in light gray.
- Layout: 3-4 column grid on PC / 2 on mobile; detail panel on the right (PC) with large preview + stats + confirmation. `UIPadding` 14, gap 12.
- Spacing: air around the price; full-card-width buy button, 44-52 tall.
- States: buy (solid green, hover +brightness, pressed 0.97), owned (secondary with border), out-of-funds (gray disabled + "You need X more" line), loading (spinner in button, ignores clicks), success (0.4 s animated check).
- Animation: staggered entrance 50 ms per visible card, modal with fade + 0.96→1 scale. No preview autoplay on every card.

## Best practices

- Price + currency always together and with visible balance in header.
- Preview = what is delivered. If there is random variation (crate), say so explicitly.
- Confirmation on every paid purchase; no "1-click buy by accident".
- Offers with real timer and real end; no eternal "ends in 5:00".
- Consistency with inventory: same icon, same name, same rarity before and after.
- Accessible: price readable without depending on color, visible focus on Confirm/Cancel.

## Common mistakes

- Buy button that charges without confirmation or double-charges on double-click.
- Showing "Purchased" before server confirmation and then silently rolling back.
- Prices with only `Offset` that get cut on mobile ("1,250.0…").
- Misleading previews that do not match the delivered item.
- Fake offers with a restarting countdown and later distrust.
- Covering the balance with the modal and asking to confirm blind.

## Quality and done criteria

- [ ] Every purchase requires confirmation with price, currency, and before/after balance.
- [ ] No double charge under click spam or high latency (debounce + loading state).
- [ ] Available/owned/out-of-funds/locked states tested with real data.
- [ ] Preview faithful to the delivered item, verified by design.
- [ ] Readable and purchasable on PC, tablet, and mobile without overlaps.
- [ ] Errors (funds, network, requirement) with message and next action.

## Tools

- Studio: Play with server for purchase flow, mobile simulator for grid.
- MCP Studio (if available): card, detail, and modal captures at 3 resolutions.
- Rojo: catalog as data (prices, texts, IDs) for review without touching code.
- Selene: lint of purchase handler and debounce.

## Limitations

- Does not implement real charging or persistence: they live on the server (verify in create.roblox.com/docs).
- Does not include platform policies, regional pricing, or taxes: validate with official docs and the game owner.
- No player-to-player trading or auction house.
- Massive `ViewportFrame` degrades performance; use it sparingly with documented moderation.
