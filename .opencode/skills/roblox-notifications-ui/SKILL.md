---
name: Roblox Notifications and Popups
description: Queue of notices, toasts, and modals without spam. Use it when creating notifications, confirmations, global errors, or banners that do not interrupt the game.
---

# Roblox Notifications and Popups

## Objective

Inform without interrupting: each message arrives through the right channel (toast, banner, or modal), with the right priority, in queues that do not overlap, and with an anti-spam policy that protects the match. The critical interrupts; the rest waits or groups.

## Scope and limits

Covers: priority queue system, toasts, banners, modals, optional notice center, anti-spam policy, and message accessibility.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design: covered by `roblox-game-ux`; this skill implements.
- Persistent HUD: covered by `roblox-hud` (notifications use it, they do not replace it).
- Pause or settings: `roblox-pause-menu`, `roblox-settings-ui`.
- Player-to-player chat: `roblox-text-chat` (here only system notices).

## Use cases

- "+200 gold!" toast that stacks and disappears in 3 s.
- "Event in 2:00 at the Volcano" banner that does not block the game.
- "Sell legendary sword?" modal with Confirm/Cancel.
- Global error "No connection. Retrying…" persistent until recovery.
- 5 pickups in a row grouped into "+5 items!" instead of 5 toasts.

## Step-by-step process

1. **Classify each message.** Critical (error, loss, destructive confirmation) → modal. Important (event, completed quest) → persistent banner/toast. Informative (pickup, save) → fleeting toast. If everything is a modal, everything gets ignored.
2. **Define the channel matrix.** Toast bottom-right (PC) / top-center (mobile), compact top-center banner, modal centered with overlay. One message = one channel; document the exceptions.
3. **Build the container.** `ScreenGui` in `PlayerGui` → toast-stack `Frame` (`UIListLayout` vertical, anchored corner, at `Scale`) + banner-slot `Frame` (1 visible) + modal-slot `Frame` (1 visible with overlay). `DisplayOrder` above the HUD, below the system menu.
4. **Implement the queue with priority.** FIFO queue with 3 levels; max 3 visible toasts, rest waiting; 2.5-4 s duration by severity; critical ones jump to modal and pause the queue. Group repeats within a 2 s window ("+200 gold! x3").
5. **Design each type.** Toast = `Frame` + `ImageLabel` icon + 1-2 line `TextLabel` + optional lifetime bar; banner = wide version with action ("View event"); modal = title + 2-3 line body + Confirm/Cancel buttons + X close. All with `UICorner`, `UIPadding`, `UIStroke` by severity.
6. **Mandatory anti-spam.** Cooldown per type, grouping of repeats, per-minute limit, "Do not disturb" mode in combat/boss (only critical) plus a Mute non-critical notices button in settings. Log discards for tuning.
7. **Accessibility.** Minimum 4 s duration if it has an action, 44+ px button, AA contrast, never color-only (icon + text), and a persistent version in the notice center for important expired items.
8. **Moderate animation.** 0.2 s slide-in + fade via `TweenService`, fade-out; modal with 0.96→1 scale. No loud sounds by default; an optional soft tick configurable.
9. **Verify under fire.** Fire 20 notices in 5 s, simulate a network error, open a modal over a toast, rotate the phone. Nothing may cover the critical HUD or block the game except the intentional modal.

## Technical knowledge

- Toast stack (stable classes):

  ```luau
  -- Ejemplo ilustrativo: encolar un toast
  local stack = script.Parent:WaitForChild("ToastStack") :: Frame

  local function pushToast(text: string)
    local toast = Instance.new("Frame")
    toast.Name = "Toast"
    toast.Size = UDim2.fromScale(0.9, 0.12)
    toast.Parent = stack
    local label = Instance.new("TextLabel")
    label.Text = text
    label.Size = UDim2.fromScale(1, 1)
    label.Parent = toast
    -- Expiración y agrupación se gestionan en el controlador de cola.
  end
  ```

- `UIListLayout` with arrival `SortOrder` and `Padding`; `CanvasGroup` to fade whole toasts; `UISizeConstraint` so half the screen is not invaded on mobile.
- Queue in a local `ModuleScript`: `push({level, text, duration, action})`; rendering only paints. Visible limit + time-based purge with `TweenService` and instance cleanup.
- Modals: one full-screen `Frame` overlay that captures clicks + centered card; default focus on the safe action (Cancel) unless the design requires otherwise documented.
- `TextChatService` is not used for system notices unless the game requires it; system notices live in this UI, not in chat.
- Persistence: the notice center (if any) keeps the last N important items in session memory; nothing sensitive or permanent without a server.

### Visual identity of this skill (original, do not copy)

- "Sober messaging" direction: graphite toasts (#1C2233 at 92%) with severity icon (info cyan #38E1FF, success green #3DDC84, warning amber #FFC53D, error red #FF5A5A); banners with a top color strip; modals as a light card (#F4F6FB) with dark text.
- Typography: toast 14 semibold 1-2 lines, banner 15 with underlined action, modal title 20 + body 14. No sustained uppercase.
- Composition: 320-360 equivalent-px toasts stacked with 8 gap, max-560 centered banner, 420-480 centered modal. `UICorner` 10-12, 1 px `UIStroke` by severity.
- Spacing: `UIPadding` 12-14, 24 icons, 50/50 modal buttons with 10 gap.
- States: info/success/warning/error with icon + color + text (triple channel), loading only in modal with async action (disabled button + spinner), expired with fade, grouped with "x3" counter.
- Animation: only 0.2 s slide + fade; brief modal scale. No blinking or bouncing toasts.

## Best practices

- 1 modal at a time; if another critical arrives, it queues, never overlaps.
- Every toast with an action lives ≥4 s or is stored in the notice center.
- Actionable texts: "No connection. Retrying… (Retry)" not "Error 500".
- Total icon and color consistency for severity across the game.
- Respect "do not disturb": in boss/combat only critical + minimal banner.
- Measure: if a notice is dismissed 95% of the time without a click, lower its priority or remove it.

## Common mistakes

- 10 toasts covering the HUD and touch buttons at the worst moment.
- A modal per pickup that blocks the game and earns the player's hatred.
- Color-only notices that color-blind players cannot tell apart.
- Unbounded queue accumulating 50 toasts and freezing scroll.
- Double system (HUD + notifications) duplicating the same message.
- Loud sound per toast forcing the player to mute the whole game.

## Quality and done criteria

- [ ] 20 notices in 5 s group up and neither cover the critical nor block the game.
- [ ] Only 1 visible modal, with safe focus and clear close (X + Cancel + Esc).
- [ ] Severities distinguishable by icon + text + color, with AA contrast.
- [ ] Legible on PC, tablet, and mobile without covering touch controls.
- [ ] Documented anti-spam policy (limits, cooldowns, do-not-disturb) and verified.
- [ ] No console errors or orphan instances after 10 minutes of notices.

## Tools

- Studio: notice stress test, mobile simulator, `Output` for leaks.
- MCP Studio (if available): captures of stack/banner/modal over real gameplay.
- Rojo: texts and thresholds (durations, limits) as editable data.
- Selene: lint the queue controller and toast cleanup.

## Limitations

- Does not replace the technical log or error telemetry; it is UI for the player.
- Does not handle player-to-player chat or text moderation (check create.roblox.com/docs).
- The notice center here is per-session; persistent history requires a server.
- Too many criticals signal a game-design problem, not a UI problem.
