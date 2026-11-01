# Arquitectura del entorno

## Mapa del proyecto

| Ruta | Contenido | Origen |
|---|---|---|
| `.agents/skills/` (38) | Skills de terceros instaladas vía `npx skills` | nonlooped, luumenlabs, el4cteo, ashexplained, gamedev-skills |
| `.opencode/skills/` (8) | Skills propias del proyecto (precedencia mayor) | autoría local |
| `.opencode/opencode.json` | MCP `Roblox_Studio` (oficial, stdio) | local |
| `tools/bin/` | rojo, stylua, selene, wally (ejecutables Windows) | releases oficiales GitHub |
| `Packages/` + `wally.toml` | TestEZ 0.4.1 (dependencia de código) | wally-index |
| `default.project.json` | Proyecto Rojo (mapeo disco→DataModel) | local |
| `references/` (16) | Biblioteca visual con licencia verificada | Wikimedia Commons |
| `docs/` | Esta documentación | local |

## Principios (ver `roblox-project-architect`)

1. El servidor decide: autoridad en `ServerScriptService`, validación en cada
   handler, el cliente solo envía intención.
2. Un módulo, un trabajo; sin `require` circulares; `--!strict` donde aclare.
3. UI en `StarterGui` como plantilla **deshabilitada en Edit**; se habilita en
   runtime por controlador del jugador.
4. Ningún código de juego antes del brief: requisitos, mapa de módulos,
   contratos de remotes (nombre, dirección, tipos, validación, cooldown),
   esquema de datos, plan QA.
5. Lo portable vive en el proyecto; lo global no se toca.

## Flujo de datos del prototipo CoinGame (referencia viva)

`CoinClient (Touched)` → `CollectCoin:FireServer(coinId)` →
`CoinServer` valida (tipo, existencia, contenedor, distancia, cooldown) →
destruye moneda, suma, `leaderstats` + `CoinsChanged:FireClient` →
`CoinHudController` renderiza. Patrón a reutilizar en cada sistema nuevo.
