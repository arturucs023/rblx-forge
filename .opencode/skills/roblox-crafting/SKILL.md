---
name: roblox-crafting
description: Recetas, estaciones, colas y crafteo atómico validado en servidor. Úsala cuando necesites forja, cocina, workbench o crafteo con materiales y tiempos.
---

# Crafteo (Crafting)

## Objetivo
Implementar crafteo robusto: recetas descubribles, estaciones con colas, consumo y entrega atómicos, y protección total contra duplicación.

## Alcance y límites
Cubre recetas, estaciones, colas, batch-craft, descubrimientos y fallos críticos.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino; esta skill es la versión profunda con atomicidad, concurrencia y estaciones. NO cubre obtención de materias (lo cubre `roblox-resource-gathering`), ni precios/inflación de objetos crafteados (lo cubre `roblox-economy-balancing`), ni misiones de crafteo (lo cubre `roblox-quest-progression-systems`). `roblox-genre-patterns` no detalla sistemas.

## Casos de uso
- Forja de espadas con tiers y crítico de calidad.
- Cocina con recetas que dan buffs temporales.
- Workbench de tycoon que produce en cola offline parcial.
- Encantamientos con riesgo de fallo y protección.
- Crafteo móvil con estaciones portátiles de un uso.

## Bucle de juego o sistema (diseño)
1. Descubrir receta (loot, quest, experimentación).
2. Reunir materiales y acudir a estación correcta.
3. Encolar crafteo (tiempo real o instantáneo con coste).
4. Esperar/reclamar (decisión: acelerar con Robux/moneda).
5. Usar/vender/equipar resultado.
Balance de ejemplo: receta tier 2 = 8 hierro + 4 madera, 60 s, éxito 100%, calidad épica 12%; coste de aceleración = 1.5× valor vendor/60 s; sink objetivo 20% de materiales/día; si el backlog medio supera 5 ítems por jugador, subir tiempos o estaciones.

## Proceso paso a paso
1. Define `RecipeDefs` en `ModuleScript`: `id`, `estacion`, `materiales {id=cant}`, `tiempoS`, `resultado`, `tasaCritica`, `nivelRequerido`, `descubiertaPorDefecto`.
2. Estaciones como `Model` con tag `CraftStation` y `Attributes` (`StationType`, `QueueMax`, `OcupadaPor`).
3. Cliente envía `RemoteFunction CraftRequest(recetaId, estacionId)`; jamás envía materiales ni resultado.
4. Servidor ejecuta transacción atómica: bloquea inventario → verifica materiales + nivel + estación libre → descuenta → encola → programa finalización.
5. Cola por estación (ej. máx 3, FIFO) con timestamps servidor; soporta `ClaimResult` separado de `StartCraft`.
6. Resultado con RNG servidor: normal/épico/legendario; entrega a inventario servidor y notifica.
7. Descubrimiento: combina "experimentación" validada (el servidor comprueba combinación, no el cliente).
8. UI: lista filtrable, botón crafteable/no con motivo, barra de progreso por cola, notificación de listo.

## Conocimientos técnicos
### Qué valida el servidor
- Receta existe y está descubierta para ese jugador.
- Materiales suficientes en inventario servidor y estación correcta a ≤12 studs.
- Nivel/herramienta requeridos y cola con hueco.
- `Claim` solo si `os.clock() ≥ terminaEn` y reclamante = dueño de la cola.
### Persistencia
- Guarda inventario, recetas descubiertas y colas activas (`recetaId`, `terminaEnUnix`, `estacionId`) con `DataStoreService`.
- Al cargar, recalcula colas: si `terminaEn` ya pasó durante offline, entrega a "buzón" con límite 10; resto se marca listo para reclamar.
- Transacciones con `UpdateAsync` para inventario cuando haya comercio paralelo (verificar en create.roblox.com/docs).
### Errores/desconexiones
- Desconexión mid-craft: materiales ya descontados no se devuelven; resultado queda reclamable 7 días.
- Cierre de servidor: `BindToClose` persiste colas; al reabrir nueva instancia recalcula sin duplicar.
- Doble clic: idempotencia con `jobId` por solicitud; segundo `Claim` del mismo job devuelve ya-entregado.
### Anti-exploit
- Nunca aceptes `resultadoId` del cliente; recalcula desde receta.
- Rate-limit `CraftRequest` 5/s; más = ignorar.
- Valida que la estación no fue movida por exploiter: compara posición con plantilla ±4 studs.
- Anti-dupe: bloquea inventario por jugador durante transacción (mutex simple por `UserId`).

## Buenas prácticas
- Separa `CraftDefs` (datos) de `CraftServer` (lógica) y `CraftUI` (vista).
- Tiempos cortos (<60 s) gratis, largos acelerables; nunca pay-to-craft obligatorio.
- Muestra probabilidad exacta de crítico; evita "sensación de timo".
- Permite encolar desde móvil con botones ≥48 px y confirmación de materiales caros.
- Log de crafteos épicos para economía y detección de abuso.

## Errores frecuentes
1. Descontar y entregar en dos remotos separados → dupe por doble claim; unificar en transacción.
2. Temporizador con `wait(tiempo)` por trabajo → deriva y fugas; usar timestamps y scheduler.
3. Estación global sin dueño → dos jugadores reclaman lo mismo; asignar dueño + timeout 120 s.
4. Receta secreta validada en cliente → filtrada en exploit; validar combinación en servidor.
5. No versionar recetas → cambio de balance rompe inventarios; versiona `recipes_v2` y migra.

## Criterios de calidad y terminado
- [ ] 50 crafteos concurrentes en una estación sin duplicar ni perder materiales.
- [ ] Doble `Claim` del mismo job entrega 1 solo resultado.
- [ ] Desconexión a mitad de cola conserva materiales descontados y resultado reclamable.
- [ ] Tasa épica medida 10–14% en 500 muestras para receta 12% nominal.
- [ ] UI indica motivo exacto cuando no se puede craftear en 6 casos probados.
- [ ] Carga de DataStore corrupto cae a inventario vacío + log, sin romper sesión.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `DataStoreService`, `Players`, `CollectionService`, `Attributes`, `ProximityPrompt`, `MarketplaceService` (solo si aceleración con Robux). Verificar miembros en create.roblox.com/docs si hay duda.

## Limitaciones
- No diseña economía global ni sinks; componer con `roblox-economy-balancing`.
- No genera misiones de crafteo; componer con `roblox-quest-progression-systems`.
- No cubre intercambio entre jugadores; componer con `roblox-social-systems`.

```luau
-- Ilustrativo: consumo atómico simplificado.
local function tieneMateriales(inv, receta): boolean
	for id, cant in pairs(receta.materiales) do
		if (inv[id] or 0) < cant then return false end
	end
	return true
end
-- Uso real: bloquear por UserId, verificar, descontar y encolar sin yields intermedios.
```
