---
name: roblox-building-placement
description: Colocación con grid, fantasma, validez y guardado de plots. Úsala cuando necesites construir bases, tycoons, decorar casas o muros.
---

# Construcción y Colocación (Building & Placement)

## Objetivo
Permitir construir con fantasma previsual, snapping a grid, validación de colisiones y propiedad, y persistencia de plots que carga rápido.

## Alcance y límites
Cubre fantasma cliente, validación servidor, rotación, demolición, límites de plot y guardado.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino; esta skill es la versión profunda con colisiones, pertenencia y persistencia masiva. NO cubre economía de compra de piezas (lo cubre `roblox-economy-balancing`), ni quests de construcción (lo cubre `roblox-quest-progression-systems`), ni física de vehículos (lo cubre `roblox-vehicle-systems`). `roblox-genre-patterns` no profundiza en colocación.

## Casos de uso
- Plot de tycoon con slots y muros comprables.
- Casa decorable con muebles rotables.
- Defensas de tower defense colocadas en rejilla.
- Trampas PvP con radio de exclusión.
- Base de clan con permisos por rango.

## Bucle de juego o sistema (diseño)
1. Seleccionar pieza (coste visible).
2. Previsualizar fantasma (verde/rojo + motivo).
3. Rotar/ajustar a grid (1 stud fino, 4 studs grueso).
4. Confirmar → validación servidor → cobro + spawn.
5. Mover/vender/demoler con reembolso parcial.
Balance de ejemplo: grid 4, reembolso 70%, límite 150 piezas/plot, piezas defensivas máx 20; coste medio pieza = 3–5 min de farmeo; si el tiempo de carga de plot supera 4 s en móvil, reduce piezas o usa LOD.

## Proceso paso a paso
1. Define `BuildDefs`: `id`, `tamaño`, `coste`, `grid`, `puedeRotar`, `requiereSuelo`, `radioExclusion`, `limitePorPlot`.
2. Cliente muestra fantasma con `Model` semitransparente; raycast desde cámara con `Raycast` a `Workspace` ignorando personaje.
3. Snapping: `pos = round(pos/Grid)*Grid`; rotación en pasos de 15°/45°/90° según pieza.
4. Chequeo cliente (orientativo): dentro de plot, sin solape (`GetPartBoundsInBox`/`OverlapParams`), sobre suelo válido.
5. Confirmación vía `RemoteFunction PlaceRequest(defId, cframeCuantizado)`; servidor repite TODOS los chequeos.
6. Servidor cobra, crea pieza con `Attributes` (`OwnerId`, `DefId`), parent a carpeta `Plots_<UserId>`, y aplica `CollectionService` tag `Placed`.
7. Demolición/venta con `RemoteEvent Demolish(instanceId)` validando dueño y calculando reembolso.
8. Guardado: serializa `[{def, x,y,z, ry}]` comprimido por plot; carga por lotes con `task.defer` para no congelar.

## Conocimientos técnicos
### Qué valida el servidor
- Dueño del plot y permisos (solo dueño o rango permitido).
- Posición dentro de bounds del plot + margen; rotación cuantizada válida.
- Sin solape real con `OverlapParams` en servidor y coste pagable.
- Límites: conteo por tipo y total; rate 4 colocaciones/s máx.
### Persistencia
- `DataStoreService` por plot con clave `plot_<UserId>_v2`; guarda tabla compacta, no instancias.
- Límite de tamaño: si supera 4 MB por entrada, particiona por secciones o reduce precisión a 0.5 studs.
- Autosave cada 120 s + al salir; `BindToClose` con cola.
### Errores/desconexiones
- Colocación en vuelo al cerrar: si el cobro ocurrió pero no el guardado, la pieza se reconstruye desde log de sesión al rejoin.
- Plot corrupto: carga piezas válidas e ignora el resto + avisa "3 piezas no cargaron".
- Conflicto de dos colocaciones simultáneas: mutex por plot; segunda espera 1 s o falla con reintento.
### Anti-exploit
- Nunca aceptes `CFrame` libre: recuantiza en servidor y clamp a plot.
- Rechaza piezas fuera de catálogo o con tamaño alterado.
- Anti-spam de piezas para crashear: límite total + coste mínimo + detección de rejilla densa anómala.
- Valida `OwnerId` en demolición; un cliente no puede borrar piezas ajenas.

## Buenas prácticas
- Fantasma con código de color + texto de motivo (`FUERA DE PLOT`, `SOLAPADO`, `SIN FONDOS`).
- `Attributes` para dueño/tipo; `CollectionService` para limpieza por plot.
- Streaming: plots lejanos con `StreamOut` natural; no forzar `Persistent` salvo base activa.
- Controles táctiles: rotar con botones, confirmar con doble tap configurable.
- Tutorial de 3 piezas guiadas antes de modo libre.

## Errores frecuentes
1. Solo validar en cliente → piezas flotando en spawn; duplicar chequeo en servidor.
2. Guardar instancias completas → DataStore overflow; serializar defs + transform.
3. `PivotTo` sin colisión → piezas interpenetradas; usar `OverlapParams` servidor.
4. Sin límite por plot → 2000 piezas crashean móvil; imponer 100–200 y medir.
5. Demolición sin reembolso claro → abandono; fijar 50–70% y mostrarlo antes.

## Criterios de calidad y terminado
- [ ] Fantasma y resultado servidor coinciden en 50 colocaciones (error ≤0.5 studs).
- [ ] Intento fuera de plot o solapado rechazado en 100% de 30 pruebas adversas.
- [ ] Plot de 150 piezas guarda y carga en <4 s en dispositivo medio.
- [ ] Spam de 20 req/s no crea piezas extra ni cobra de más.
- [ ] Reembolso exacto 70% en 10 demoliciones auditadas.
- [ ] Limpieza de plot libera memoria y tags sin huérfanos.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `Players`, `CollectionService`, `Attributes`, `DataStoreService`, `TweenService` (fantasma). Verificar en create.roblox.com/docs si hay duda.

## Limitaciones
- No simula física estructural real ni destrucción por explosión detallada.
- No gestiona economía global; componer con `roblox-economy-balancing`.
- Multiselección y blueprint masivo quedan fuera; requiere extensión dedicada.

```luau
-- Ilustrativo: snapping a grid.
local function snap(pos: Vector3, grid: number): Vector3
	return Vector3.new(
		math.round(pos.X / grid) * grid,
		math.round(pos.Y / grid) * grid,
		math.round(pos.Z / grid) * grid
	)
end
```
