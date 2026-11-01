---
name: Auditoría de Seguridad Roblox
description: Audita handlers, remotes, DataStores y assets de terceros buscando exploits. Úsala en revisiones pre-release o ante sospecha de trampas, dupeos o pérdida de datos.
---

# roblox-security-audit

Revisión sistemática de exploits. Trabaja en solo lectura hasta completar la
lista de hallazgos; corrige solo después de triar por severidad.
Complementarias: `roblox-security`, `roblox-security-economy`,
`roblox-creator-store-security-audit`, `roblox-networking`, `roblox-datastores`.

## Objetivo

Encontrar: remotes sin validar, valores confiados del cliente, cooldowns
ausentes, instancias falsificables, escrituras DataStore inseguras, secretos
filtrados y modelos maliciosos de la Toolbox.

## Alcance y límites

- Cubre: superficie de ataque, revisión de handlers, DataStores, secretos y
  assets de terceros.
- NO implementa sistemas (eso es `roblox-game-systems`, `roblox-networking`).
- NO sustituye el testeo funcional (`roblox-testing`, `roblox-multiplayer-testing`).

## Casos de uso

- Revisión pre-release antes de publicar.
- Sospecha de cheating, dupeo o pérdida de datos.
- Auditoría tras añadir un sistema que toque moneda, inventario o guardado.

## Proceso paso a paso

1. **Enumera la superficie de ataque.** `grep_scripts` de `OnServerEvent`,
   `OnServerInvoke`, `PromptPurchase`, `LoadString`, `require(`, `HttpService`,
   `SetAsync`. Lista cada punto disparable por el cliente con `fichero:línea`.
2. **Revisa cada handler** con esta checklist:
   - [ ] ¿Tipos/longitudes de argumentos comprobados (`typeof`, topes de
     longitud, números finitos, UTF-8 válido, sin claves NaN/nil)?
   - [ ] ¿Instancias verificadas por clase Y contenedor esperado (nunca una
     instancia cualquiera que pase el cliente)?
   - [ ] ¿Ownership/proximidad validados (distancia, `player.Character`, vivo)?
   - [ ] ¿Cooldown / rate limit por usuario (estilo `RateLimiter`, tabla `os.clock`)?
   - [ ] ¿Resultado calculado en servidor (precios, daño, recompensas de tablas
     del servidor)?
   - [ ] ¿Ningún remote borra/mueve instancias arbitrarias ni carga assets por ID de cliente?
3. **DataStores.** `pcall` en cada llamada; `UpdateAsync` con transform pura
   para valores disputados; validación de esquema al cargar; sin Instances ni
   strings sobredimensionados.
4. **Secretos.** Nada de `.ROBLEXSECURITY`, tokens ni API keys en scripts;
   claves de Open Cloud en Secrets Store + `HttpService:GetSecret`.
5. **Assets de terceros.** Todo modelo de Toolbox/Creator Store con scripts
   pasa por `preview_asset`: sin `require(assetId)`, sin exfiltración HTTP,
   sin ofuscación. `insert_asset` elimina scripts: re-añade solo código propio.

## Conocimientos técnicos

- El cliente es totalmente hostil: valida tipo, rango, ownership y contexto.
- Los cooldowns globales los rompe un explotador rotando cuentas: siempre por usuario.
- `InvokeClient` no sirve para decisiones de seguridad (el cliente puede mentir).

## Buenas prácticas

- Trabaja en solo lectura hasta tener la tabla de hallazgos completa.
- Triaje por severidad antes de corregir: críticos primero.
- Re-test con las mismas sondas maliciosas tras cada fix.

## Errores frecuentes

- Validar solo el tipo pero no el rango/ownership (cuelan instancias falsificadas).
- Un cooldown global en vez de por usuario (un explotador bloquea a todos, o
  rota cuentas para saltarlo).
- Usar `InvokeClient` para decisiones de seguridad.

## Criterios de calidad y terminado

- [ ] Tabla de hallazgos: severidad (crítica/alta/media), `fichero:línea`,
  escenario de exploit y fix concreto.
- [ ] Cada crítico re-testeado con sonda maliciosa `FireServer` sin efecto.
- [ ] Sin `loadstring`, `require(assetId)` ni código cargado por HTTP en el juego.
- Verificación: repite las sondas tras los fixes (mismas entradas, no-ops
  observados) y relee `get_runtime_logs`.

## Herramientas

- MCP: `grep_scripts`, `get_script_source`, `get_runtime_logs`, `preview_asset`,
  `execute_luau`/`eval_server_runtime` para sondas.

## Limitaciones

- No detecta exploits de motor ni de Studio; solo lógica del juego y assets.
- Un audit limpio no garantiza ausencia de bugs: combina con testing y QA.

## Ejemplo: vulnerable vs corregido

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
