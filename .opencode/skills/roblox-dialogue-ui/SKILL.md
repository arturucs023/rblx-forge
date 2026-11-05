---
name: Native Roblox Dialogue
description: NPCs with ProximityPrompt, responses, typewriter, and chat. Use it when creating conversations, choices, NPC shops, or narrative integrated with TextChatService.
---

# Native Roblox Dialogue

## Objective

Make NPCs talk with native Roblox tools: approach, press the key, read with typewriter effect, pick a response, and see it integrated with chat. No invented systems: `ProximityPrompt`, `Dialogue`/`DialogueChoice` objects or equivalent custom UI, and `TextChatService` as the channel.

## Scope and limits

Covers: interaction prompt, dialogue box with typewriter, choices/responses, brief history, integration with `TextChatService`, and connection to quests/shops.

Does NOT do:

- Generic responsive mechanics: covered by `roblox-ui` and `roblox-user-interfaces`.
- Prior UX design or script writing: covered by `roblox-game-ux` (here the given script is implemented).
- Quest journal: covered by `roblox-quest-journal-ui` (dialogue may grant a quest, not manage it).
- Full shop: covered by `roblox-shop-ui` (the NPC may open it, not replace it).
- Global notifications: covered by `roblox-notifications-ui`.

## Use cases

- Villager with "Talk (E)" that opens 3 typewriter lines with a Continue button.
- Merchant with "Buy / Sell / Goodbye" choices that open the shop or close.
- Quest handed over when picking "I have the crystals" with visible validation.
- Conversation also shown in chat as a bubble or system message.
- Busy NPC ("Talking to Ana…") that queues instead of overlapping.

## Step-by-step process

1. **Write the minimal script.** Nodes: greeting → 1–3 lines → 2–4 choices → endings. Each line ≤140 characters, each choice ≤48. If it needs scrolling, cut it.
2. **Place the prompt.** `ProximityPrompt` on the NPC with `ActionText` "Talk", `ObjectText` NPC name, `KeyboardKeyCode` E, `HoldDuration` 0 (or short if sensitive), `MaxActivationDistance` 8-12. Only visible with the NPC in range and free.
3. **Build the dialogue box.** `ScreenGui` → bottom-centered `Frame` (70% width on PC, 94% on mobile) + NPC name `TextLabel` + body `TextLabel` with typewriter + row of choice `TextButton`s + Continue/Skip/Goodbye. Optional portrait `ImageLabel` on the left.
4. **Implement the typewriter.** Reveal characters every 15–25 ms with skip on press (first click completes, second advances). Respect "reduce motion" (if enabled, show directly; see `roblox-settings-ui`). Never block progress if the effect fails.
5. **Choices as buttons.** Each `DialogueChoice` or entry in your table = a `TextButton` with visible consequence ("Buy → opens shop"). Disable unavailable ones with a reason ("You need 3 more crystals"), don't just hide them.
6. **Integrate TextChatService.** Show the NPC line in a bubble above its head and/or as a channel message, depending on the game; text visible to everyone goes through filtering (verify at create.roblox.com/docs). Dialogue UI and chat tell the same story, not two different ones.
7. **Handle state and concurrency.** One conversation per player at a time (or visible turns); on walking away beyond distance, close with a fade and save the node. Two players don't step on the same box: the second sees "Busy".
8. **Connect to systems.** "Accept quest" calls the journal flow, "Buy" opens the shop, "Train" opens the selector. Each connection leaves a trace ("Quest added to journal" as a system toast).
9. **Verify in context.** Talk while walking, talk on mobile, spam E, walk away mid-dialogue, two players at once. Subtitles readable over varying backgrounds and with Large text size enabled.

## Technical knowledge

- Prompt + box (stable classes):

  ```luau
  -- Ejemplo ilustrativo: prompt de hablar en un NPC
  local prompt = Instance.new("ProximityPrompt")
  prompt.Name = "TalkPrompt"
  prompt.ActionText = "Hablar"
  prompt.ObjectText = "Aldeana Mira"
  prompt.MaxActivationDistance = 10
  prompt.HoldDuration = 0
  prompt.Parent = npc:WaitForChild("Head")
  ```

- `ProximityPrompt.Triggered` opens the dialogue `ScreenGui`; the UI lives in `PlayerGui` and closes on Goodbye, distance, or `UserInputService` (E/Esc per project).
- `Dialogue`/`DialogueChoice`/`DialogueChoiceSet` as objects on the NPC or an equivalent data table (verify at create.roblox.com/docs for the exact model of the project); the UI paints the current node and its responses.
- `TextChatService` for bubbles/messages: configure the channel and filtering per project (verify at create.roblox.com/docs). Never show unfiltered player text.
- `TweenService` for entry (8 px slide up + 0.2 s fade) and bubble fades; `UITextSizeConstraint` + controlled `TextScaled` for long bodies.
- Camera: keep player control unless a documented cinematic; if you move the camera closer, restore it on close.

### Visual identity of this skill (original, do not copy)

- "Storybook vignette" direction: bottom box in ink color (#141A2E at 94%) with copper accent stripe (#E8A15C), NPC name in amber small caps, circular portrait with `UIStroke`.
- Typography: body 16–18 regular with 1.4 line height, name 13 uppercase with tracking, choices 15 semibold in buttons. Typewriter with slow-blinking "_" cursor.
- Composition: 64 portrait + flexible text + Continue on the right; choices in a column of 2–4 buttons at 48+ px. `UIPadding` 14–18, `UICorner` 12.
- Spacing: box 3% off the bottom edge, without covering touch buttons (coordinate with `roblox-mobile-touch-ui`).
- States: typing (cursor + "Skip"), complete (highlighted Continue), choice hover +brightness / pressed 0.97 / unavailable gray + reason, busy ("Talking to…" band), distance error (close with fade, not a cut).
- Animation: only typewriter + enter/exit. No bounces or shakes in narrative text.

## Best practices

- 1 idea per line, 3 lines per node, 4 choices max.
- Every choice shows its consequence or its blocking reason.
- Skip always available; Goodbye visible from the first node.
- Same tone and names as the journal and shop; the NPC doesn't promise what the game doesn't deliver.
- Subtitles with background so they read over sky, snow, or caves.
- Original script; don't copy dialogue from protected works.

## Common mistakes

- Typewriter with no skip that forces waiting 10 s per line on mobile.
- `ProximityPrompt` with distance 30 that opens dialogues from the next village.
- Player text forwarded to chat without filtering (moderation risk).
- Box covering the joystick and touch buttons and leaving the player stranded.
- Two players in the same dialogue with crossed choices.
- Inventing chat classes or events that don't exist instead of verifying the documentation.

## Quality and done criteria

- [ ] Full conversation (greeting→choice→ending) with keyboard, touch, and gamepad.
- [ ] Skip, Goodbye, and close-on-distance work without broken states.
- [ ] Blocked choices explain the reason; connections (quest/shop) leave a trace.
- [ ] Readable at 3 resolutions and with Large text size.
- [ ] No console errors under E spam or with 2 simultaneous players.
- [ ] Original script and text filtering verified per documentation.

## Tools

- Studio: Play with 2 clients, mobile simulator, `ProximityPrompt` test at real range.
- Studio MCP (if available): captures of box + bubble over the NPC at 3 resolutions.
- Rojo: scripts as data (nodes, lines, choices) editable by narrative.
- Selene: lint the node controller and the typewriter.

## Limitations

- The exact `Dialogue` model and `TextChatService` APIs evolve (verify at create.roblox.com/docs); don't assume signatures.
- Filtering and moderation depend on the platform; this UI doesn't replace them.
- Complex multiplayer conversations (votes, turns) are another system, not this 1:1 dialogue.
- Full accessibility (voice, reading) needs project-level adjustments (`roblox-settings-ui`).
