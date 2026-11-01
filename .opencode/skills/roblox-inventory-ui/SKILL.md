---
name: Inventario y Equipamiento Roblox
description: Grids de inventario, categorías, equipar y tooltips. Úsala cuando crees mochila, equipamiento, drag/click para equipar o sincronización visible con guardado.
---

# Inventario y Equipamiento Roblox

## Objetivo

Dar al jugador control total sobre sus objetos: ver qué tiene, comparar, equipar/usar/tirar sin errores y entender qué está equipado de un vistazo. El inventario debe ser rápido (equipar en 2 clics), legible con 100+ objetos y honesto sobre lo que está guardado en servidor.

## Alcance y límites

Cubre: grid de slots, categorías/filtros, equipar por clic o arrastre, tooltips de detalle, estados (equipado, nuevo, bloqueado), y reflejo en UI del guardado con datastore.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- Tienda y compra de objetos: lo cubre `roblox-shop-ui`.
- Diario de misiones y recompensas: lo cubre `roblox-quest-journal-ui`.
- Mascotas y vehículos como sistemas: lo cubren `roblox-pets-ui` y `roblox-vehicle-ui` (aquí solo el patrón grid si se reutiliza).

## Casos de uso

- Mochila con pestañas Armas/Armadura/Consumibles y grid con scroll.
- Equipar espada con clic o arrastrándola al slot de mano.
- Tooltip con stats, rareza y botones Usar/Equipar/Soltar.
- Indicador "Guardando… / Guardado" tras equipar o mover.
- Límite de capacidad con barra "23/40" y aviso al llenarse.

## Proceso paso a paso

1. **Define el modelo de datos en papel.** Tipos de objeto, slots de equipo (mano, cabeza, etc.), apilables vs únicos, capacidad máxima. Sin este contrato, la UI acumula parches.
2. **Maqueta el layout.** Izquierda: categorías + grid (`ScrollingFrame` + `UIGridLayout`); derecha: panel de equipo + detalle. En móvil: pestañas arriba, grid a pantalla completa y detalle como hoja inferior.
3. **Construye el grid.** `ScrollingFrame` con `UIGridLayout` (celda a `Scale` relativo, p. ej. 64 px equivalentes mínimos), cada slot = `Frame` + `ImageLabel` icono + `TextLabel` cantidad + marca de rareza (`UIStroke` o banda). Slots vacíos con placeholder tenue.
4. **Implementa categorías y búsqueda.** `TextButton`s de filtro + caja de búsqueda opcional; filtrar nunca destruye datos, solo oculta slots. Contador visible por categoría.
5. **Equipar por clic y por arrastre.** Clic = seleccionar + botón Equipar; doble clic o botón = equipar directo. Arrastre = mover entre slots con clon visual que sigue al cursor/dedo. Ambas rutas llaman a la misma función `requestEquip(id)`.
6. **Tooltips con acciones.** Al seleccionar o hover: `Frame` con nombre, rareza, stats comparadas (+12 vs equipado), descripción de 1-2 líneas y botones Usar/Equipar/Soltar. En táctil el tooltip es panel fijo, no hover.
7. **Sincronización visible.** La UI es optimista pero honesta: aplica el cambio al instante y muestra "Guardando…" hasta confirmación del servidor (verificar en create.roblox.com/docs para remotos y datastore); si falla, revierte y avisa. Nunca muestres "Guardado" antes de la confirmación.
8. **Capacidad y bordes.** Barra de capacidad, aviso al 90% y bloqueo de recoger con mensaje claro. Objetos nuevos con insignia "¡Nuevo!" que se limpia al verlos.
9. **Verifica con 150 objetos.** Llena el inventario de prueba, mide scroll a 60 fps, comprueba que equipar/desequipar no duplica y que reentrar conserva el equipo.

## Conocimientos técnicos

- Celda de grid (clases estables):

  ```luau
  -- Ejemplo ilustrativo: crear un slot de inventario
  local slot = Instance.new("Frame")
  slot.Name = "Slot_001"
  slot.Size = UDim2.fromScale(0.18, 0.18)
  slot.Parent = gridFrame

  local corner = Instance.new("UICorner")
  corner.CornerRadius = UDim.new(0, 8)
  corner.Parent = slot
  -- Icono (ImageLabel), cantidad (TextLabel) y rareza (UIStroke) cuelgan del slot.
  ```

- `UIGridLayout` con `CellSize` relativo + `CellPadding`; `ScrollingFrame` con `ScrollBarThickness` discreto y `CanvasSize` automática (verificar en create.roblox.com/docs para propiedades exactas).
- Selección: un solo slot seleccionado, marcado con `UIStroke` de acento; el panel de equipo refleja el estado con iconos en cada slot corporal.
- Drag: clon del icono con `ZIndex` alto que sigue a `UserInputService.InputChanged` (ratón/táctil); al soltar, resuelve slot destino o cancela con tween de retorno.
- Datos: el cliente pide, el servidor valida y guarda (datastore y remotos; verificar en create.roblox.com/docs). El cliente nunca inventa objetos ni cantidades.
- `UIScale` para modo compacto en pantallas pequeñas sin reescribir el layout.

### Identidad visual de esta skill (original, no copiar)

- Dirección "armería técnica": fondo pizarra (#171D2E), slots grafito (#232B45) con banda de rareza (común gris, raro azul #4DA3FF, épico morado #B45CFF, legendario ámbar #FFC53D). Acento cian selección (#38E1FF).
- Tipografía: nombres 14 semibold, cantidades 13 negrita en esquina, stats 13 monoespaciada o tabular, descripciones 13 gris claro.
- Composición: grid 5-6 columnas PC / 4 móvil, panel derecho de equipo con silueta de slots (cabeza, torso, manos, pies). `UIPadding` 12, `UICorner` 8, `UIStroke` 1 px por rareza.
- Espaciado: gap 8 entre slots, 16 entre secciones. Slots mínimo 56 px equivalentes en táctil.
- Estados: hover eleva + borde, pressed 0.96, equipado con check + borde acento, nuevo con punto ámbar, bloqueado/límite en gris con candado textual, guardando con spinner en la cabecera.
- Animación: equipar con pulso de 0.25 s vía `TweenService`; mover con fundido del clon; sin rebotes exagerados.

## Buenas prácticas

- Equipar siempre en ≤2 clics; lo frecuente (usar consumible) en 1.
- Comparativa visible: "+12 daño vs equipado" vale más que 6 stats sueltas.
- Confirmación solo para destructivo (tirar/vender legendario); lo reversible sin modal.
- Orden estable: por rareza/reciente con criterio visible y persistente entre sesiones.
- Coherencia con tienda y diario: mismos iconos, mismas rarezas, mismos botones.
- Textos de error accionables: "Mochila llena (40/40). Suelta o vende algo." no "Error 7".

## Errores frecuentes

- Permitir equipar dos objetos en el mismo slot por doble clic rápido (falta debounce + validación servidor).
- Mostrar objetos que el servidor no confirma y duplicar tras reentrar.
- Grid solo con `Offset` que desborda en móvil o deja 2 columnas gigantes en PC.
- Tooltip hover-only que en táctil es inaccesible.
- Tirar objetos sin confirmación ni recuperación.
- Iconos de raridad solo por color, ilegibles para daltónicos (añade texto o forma).

## Criterios de calidad y terminado

- [ ] Equipar/desequipar/mover/usar funcionan con ratón y con táctil.
- [ ] Con 150 objetos el scroll sigue fluido y la búsqueda filtra <200 ms.
- [ ] El estado tras reentrar coincide con el guardado del servidor.
- [ ] Sin duplicados ni pérdidas bajo spam de clics o latencia alta simulada.
- [ ] Legible en PC, tablet y móvil vertical sin solapes.
- [ ] Acciones destructivas piden confirmación; el resto no interrumpe.

## Herramientas

- Studio: Play con servidor para validar guardado, simulador táctil para drag.
- MCP Studio (si disponible): capturas del grid lleno en 3 resoluciones, `Output` ante fallos de sync.
- Rojo: definiciones de objetos (nombre, rareza, icono) como datos versionados.
- Selene: lint de los handlers de equipar/mover y del debounce.

## Limitaciones

- La persistencia real (datastore) y la validación viven en el servidor (verificar en create.roblox.com/docs); esta UI solo la refleja.
- No incluye comercio entre jugadores ni subastas; solo gestión propia.
- El drag táctil con listas largas puede requerir ajustes por plataforma; prueba en dispositivo real.
- Iconos e imágenes deben respetar presupuesto de memoria del proyecto; sin assets externos nuevos.
