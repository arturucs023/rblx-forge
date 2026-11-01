# Guía de seguridad

Procedimiento ejecutable: skill `roblox-security-audit`. Resumen operativo:

1. **Superficie**: `grep_scripts` de `OnServerEvent`, `OnServerInvoke`,
   `require(`, `loadstring`, `HttpService`, `SetAsync`. Nada sin revisar.
2. **Handlers**: tipo + longitud + rango + ownership + distancia + cooldown por
   usuario; el servidor calcula precios, daño y recompensas (nunca el cliente).
3. **Instancias del cliente**: validar clase Y contenedor esperado; jamás operar
   sobre una instancia arbitraria que envíe el cliente.
4. **DataStores**: `pcall` siempre; `UpdateAsync` puro en valores disputados;
   validar esquema al cargar; longitud y UTF-8 acotados.
5. **Secretos**: fuera de scripts (Secrets Store + `GetSecret`); jamás pedir ni
   almacenar `.ROBLEXSECURITY`, cookies o tokens.
6. **Terceros**: `preview_asset` antes de `insert_asset`; si trae scripts, se
   revisan o se descartan (el insert los elimina; solo se re-añade código propio).
7. **Game code**: prohibido `loadstring`, `require(assetId)`, código por HTTP.
   (Las herramientas MCP `execute_luau`/`eval_*` son del agente, no del juego.)
8. **Economía**: importes atómicos, anti-dupe (idempotencia + `ProcessReceipt`
   bien cerrado), re-verificación en `PlayerAdded`.

Toda excepción a estas reglas es un hallazgo crítico hasta que se corrija y
re-pruebe con la misma sonda que la detectó.
