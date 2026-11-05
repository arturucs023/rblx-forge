---
name: Roblox Security Audit
description: Audit handlers, remotes, DataStores, and third-party assets for exploits. Use it in pre-release reviews or when you suspect cheating, duping, or data loss.
---

# roblox-security-audit

Systematic exploit review. Work read-only until the findings list is complete; fix only after triaging by severity.
Related: `roblox-security`, `roblox-security-economy`, `roblox-creator-store-security-audit`, `roblox-networking`, `roblox-datastores`.

## Objective

Find: unvalidated remotes, trusted client values, missing cooldowns, spoofable instances, unsafe DataStore writes, leaked secrets, and malicious Toolbox models.

## Scope and limits

- Covers: attack surface, handler review, DataStores, secrets, and third-party assets.
- Does NOT implement systems (that is `roblox-game-systems`, `roblox-networking`).
- Does NOT replace functional testing (`roblox-testing`, `roblox-multiplayer-testing`).

## Use cases

- Pre-release review before publishing.
- Suspected cheating, duping, or data loss.
- Audit after adding a system that touches currency, inventory, or saving.

## Step-by-step process

1. **List the attack surface.** `grep_scripts` for `OnServerEvent`, `OnServerInvoke`, `PromptPurchase`, `LoadString`, `require(`, `HttpService`, `SetAsync`. List each client-fireable point with `file:line`.
2. **Review each handler** with this checklist:
   - [ ] Argument types/lengths checked (`typeof`, length caps, finite numbers, valid UTF-8, no NaN/nil keys)?
   - [ ] Instances verified by class AND expected container (never any instance the client passes)?
   - [ ] Ownership/proximity validated (distance, `player.Character`, alive)?
   - [ ] Cooldown / rate limit per user (`RateLimiter` style, `os.clock` table)?
   - [ ] Result computed on server (prices, damage, rewards from server tables)?
   - [ ] No remote deletes/moves arbitrary instances or loads assets by client ID?
3. **DataStores.** `pcall` on every call; `UpdateAsync` with pure transform for contested values; schema validation on load; no Instances or oversized strings.
4. **Secrets.** No `.ROBLEXSECURITY`, tokens, or API keys in scripts; Open Cloud keys in Secrets Store + `HttpService:GetSecret`.
5. **Third-party assets.** Every Toolbox/Creator Store model with scripts goes through `preview_asset`: no `require(assetId)`, no HTTP exfiltration, no obfuscation. `insert_asset` removes scripts: re-add only your own code.

## Technical knowledge

- The client is fully hostile: validate type, range, ownership, and context.
- Global cooldowns are broken by an exploiter rotating accounts: always per-user.
- `InvokeClient` is useless for security decisions (the client can lie).

## Best practices

- Work read-only until the full findings table is done.
- Triage by severity before fixing: criticals first.
- Re-test with the same malicious probes after each fix.

## Common mistakes

- Validating only type but not range/ownership (spoofed instances get through).
- One global cooldown instead of per-user (one exploiter blocks everyone, or rotates accounts to bypass it).
- Using `InvokeClient` for security decisions.

## Quality and done criteria

- [ ] Findings table: severity (critical/high/medium), `file:line`, exploit scenario, and concrete fix.
- [ ] Each critical re-tested with a malicious `FireServer` probe with no effect.
- [ ] No `loadstring`, `require(assetId)`, or HTTP-loaded code in the game.
- Verification: repeat the probes after fixes (same inputs, observed no-ops) and re-read `get_runtime_logs`.

## Tools

- MCP: `grep_scripts`, `get_script_source`, `get_runtime_logs`, `preview_asset`, `execute_luau`/`eval_server_runtime` for probes.

## Limitations

- Does not detect engine or Studio exploits; only game logic and assets.
- A clean audit does not guarantee zero bugs: combine with testing and QA.

## Example: vulnerable vs fixed

```lua
-- VULNERABLE: confía en la cantidad del cliente
BuyEvent.OnServerEvent:Connect(function(player, itemId, amount)
	giveItem(player, itemId, amount) -- el explotador pasa amount = 99999
end)

-- CORREGIDO: el servidor decide cantidad y precio
local MAX_PER_BUY, PRICES = 10, { BloxyCola = 50 }
BuyEvent.OnServerEvent:Connect(function(player, itemId, amount)
	task.spawn(function()
		if typeof(itemId) ~= "string" or #itemId > 64 then return end
		if typeof(amount) ~= "number" or amount < 1 or amount > MAX_PER_BUY then return end
		local price = PRICES[itemId]
		if not price then return end
		-- chequeo de fondos, cooldown y grant atómico aquí
	end)
end)
```
