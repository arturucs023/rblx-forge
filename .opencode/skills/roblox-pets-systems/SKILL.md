---
name: roblox-pets-systems
description: Mascotas con hatch, equipar, fusión y economía de pets. Úsala cuando necesites huevos, shinies, inventario de pets y boosts balanceados.
---

# Sistemas de Mascotas (Pets)

## Objetivo
Crear un sistema de pets rentable y justo: hatch con probabilidades transparentes, equipado con boosts apilados bajo control, fusión/evolución y showcase social sin pay-to-win abusivo.

## Alcance y límites
Cubre huevos, rarezas, equipar/desequipar, fusión dorada/arcoíris, boosts y trading básico.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino; esta skill es la versión profunda con pity, duplicados y economía de pets. NO cubre mascotas como NPCs con IA de combate avanzada (componer con `roblox-combat-systems` y `roblox-npcs` si aplica), ni precios globales/inflación (lo cubre `roblox-economy-balancing`), ni quests de colección (lo cubre `roblox-quest-progression-systems`). Intercambio social profundo lo cubre `roblox-social-systems`. `roblox-genre-patterns` no detalla pets.

## Casos de uso
- Huevos comprables con 5 rarezas + shiny.
- Equipar 3–8 pets con boost multiplicativo capado.
- Fusión: 5 iguales → dorada; 5 doradas → arcoíris.
- Pets de evento limitado con trade controlado.
- Showcase en plot + pedestal visitable.

## Bucle de juego o sistema (diseño)
1. Farmear moneda → comprar/abrir huevo (anticipación con reveal).
2. Evaluar (común → equipar, duplicado → fusionar/borrar).
3. Equipar mejores y subir poder de farmeo.
4. Perseguir shiny/legendario y completar índice.
5. Presumir/intercambiar (retención social).
Balance de ejemplo: común 60%, raro 25%, épico 10%, legendario 4%, mítico 1%; shiny 1/64 sobre base; pity legendario cada 80 aperturas sin legendario; boost por pet 5–25%, total equipado capado a ×8; fusión dorada = ×2.2 del base; ingreso con full equipo no debe superar ×4 del jugador sin pets para no romper progresión.

## Proceso paso a paso
1. Define `PetDefs`: `id`, `rareza`, `prob`, `boostTipo`, `boostValor`, `shinyMult`, `fusiónEn`.
2. Implementa tabla de pity por jugador y banner (`sinLegendario`, `aperturasTotales`); RNG en servidor.
3. `RemoteFunction HatchRequest(huevoId, cantidad)` con batch máx 10; servidor cobra, rolea, entrega y actualiza pity.
4. Inventario servidor: `pets[{uid, defId, shiny, dorada, bloqueada}]`; equipados como lista de `uid` con máx por pase/nivel.
5. Fusión vía `RemoteFunction FuseRequest(uids[])`: valida mismo `defId`+tier, 5 uds, no equipados bloqueados; destruye 5 y crea 1 superior.
6. Boosts calculados en servidor al farmear (nunca sumes en cliente); replica total con `Attributes` (`PetPower`).
7. Visual: pets siguen con `AlignPosition` simple o anclados a slots; limita a 3 visuales activos en móvil por rendimiento.
8. Índice/colección persistente + recompensas por completar sets.

## Conocimientos técnicos
### Qué valida el servidor
- Moneda suficiente y huevo existente; cantidad 1–10.
- Probabilidades aplicadas en servidor; cliente solo pide apertura.
- Equipados pertenecen al jugador, no duplicados, dentro del límite.
- Fusión con 5 `uid` reales, mismo tipo, no ya fusionados en otra petición concurrente (mutex).
### Persistencia
- Guarda inventario de pets, equipados, pity e índice con `DataStoreService` (`pets_v2`).
- Los `uid` son GUID servidor; al cargar revalida `defId` contra catálogo (si un pet fue eliminado del juego, convierte a moneda).
- Límite 200 pets; exceso va a "almacén" paginado o auto-convierte duplicados comunes a moneda con confirmación.
### Errores/desconexiones
- Desconexión mid-hatch: si se cobró, el roll ya se guardó; al rejoin aparece en inventario + notificación pendiente.
- Doble `HatchRequest` por lag: idempotencia con `requestId` cliente; duplicado devuelve mismo resultado.
- Trade a medias: usa intercambio de dos pasos con confirmación; si un lado se cae, revierte.
### Anti-exploit
- Jamás aceptes `defId` de pet obtenido desde cliente; el servidor genera el resultado.
- Rate-limit hatch 3/s; fusión 2/s; equipar 10/s.
- Detecta inventario imposible (ej. 10 míticos en 20 aperturas, p < 1e-9) y marca para revisión sin ban automático.
- Trading: valida ambas partes, cooldown 10 s entre trades, log de trades de rareza alta.

## Buenas prácticas
- Publica probabilidades in-game (exigido por política en loot pagado con Robux; verificar en create.roblox.com/docs).
- Reveal con skip; batch-open con resumen, no 10 animaciones seguidas.
- Duplicados útiles siempre (fusión/moneda/índice); nunca "basura sin uso".
- Cap de poder visible para evitar power-creep silencioso.
- Eventos limitados con aviso de fin y sin ventaja permanente rota.

## Errores frecuentes
1. Rollear en cliente → pets míticos infinitos; mover a servidor.
2. Boost sumado en cliente para mostrar daño → daño falso; calcular en servidor.
3. Sin pity → rabia y churn en mala racha; pity 60–100 según rareza top.
4. Seguidores con física por pet → lag con 8 pets × 20 jugadores; usar CFrame interpolado barato.
5. Sin límite de inventario → DataStore overflow; cap + almacén.

## Criterios de calidad y terminado
- [ ] 1000 aperturas simuladas convergen a ±1.5 pp de probabilidades nominales.
- [ ] Pity otorga legendario en apertura ≤80 tras sequía en 3/3 pruebas.
- [ ] Fusión concurrente doble no duplica resultado (mutex verificado).
- [ ] Poder total con full míticos ≤ cap ×8 y farmeo/hora ≤ ×4 del base.
- [ ] Rejoin tras hatch conserva pets y pity sin duplicar cobro.
- [ ] 20 jugadores con 3 visuales cada uno ≥45 FPS en dispositivo medio.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `DataStoreService`, `MarketplaceService` (huevos con Robux), `MemoryStoreService` (rankings de colección si aplica). Verificar en create.roblox.com/docs.

## Limitaciones
- No implementa IA de combate de pets; componer con `roblox-combat-systems`.
- No diseña economía global ni sinks; componer con `roblox-economy-balancing`.
- Trading avanzado con impuestos/antifraude requiere `roblox-social-systems`.

```luau
-- Ilustrativo: roll de rareza en servidor.
local Tabla = { {id="comun", p=60}, {id="raro", p=25}, {id="epico", p=10}, {id="legend", p=4}, {id="mitico", p=1} }
local function rolear(rng: Random): string
	local r = rng:NextNumber(0, 100)
	local acc = 0
	for _, e in Tabla do acc += e.p if r <= acc then return e.id end end
	return "comun"
end
```
