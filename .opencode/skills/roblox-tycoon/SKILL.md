---
name: roblox-tycoon
description: Tycoons con droppers, conveyors, rebirths y plots guardados. Úsala cuando necesites diseñar producción, upgrades, PvP opcional y guardado de base.
---

# Tycoons (Droppers, Conveyors, Plots)

## Objetivo
Diseñar un tycoon completo: comprar droppers, ver fluir la producción, ampliar plot, prestigiar y guardar todo sin rupturas ni lag.

## Alcance y límites
Versión profunda de género con bucles, progresión, mecánicas, UX, rendimiento y pitfalls.
Diferenciación declarada: `roblox-genre-patterns` es catálogo de 1 línea; esta skill es la versión profunda de tycoon. `roblox-game-systems` es recetario fino; aquí se compone a escala. NO repite: construcción/colocación fina se compone con `roblox-building-placement`, economía con `roblox-economy-balancing`, quests/tutorial con `roblox-quest-progression-systems`, robo/PvP validado con `roblox-combat-systems` y social con `roblox-social-systems`.

## Casos de uso
- Tycoon clásico de fábrica con conveyors.
- Tycoon de restaurante con mesas y cocineros.
- Tycoon militar con muros y PvP opcional.
- Tycoon cooperativo por equipos.
- Tycoon de evento con 10 plots y final.

## Bucle de juego o sistema (diseño)
- Bucle 60 s: comprar dropper/upgrader → ver +$/s subir → comprar siguiente botón.
- Bucle sesión: completar piso/zona, desbloquear conveyor 2, comprar defensas.
- Bucle largo: rebirth (todo resetea, +15% producción, skin exclusiva) cada 3–6 h.
Producción: dropper T1 1 cubo/2 s × $5, T2 1/s × $12, upgrader ×2–×3 en serie (cap ×20); ingreso objetivo $2k/min a 20 min, $50k/min a 2 h; rebirth requiere $1M + 15 droppers; si el tiempo a siguiente compra supera 8 min sin AFK útil, abarata 20%.

## Proceso paso a paso
1. Modela plot fijo con slots numerados y botones comprables (`ProximityPrompt` o pad táctil).
2. Droppers spawnean cubos en servidor a tasa fija; upgraders multiplican `Attributes Valor`; collector suma al comprar contacto.
3. Compra vía `RemoteFunction BuyButton(plotId, buttonId)`: valida dueño, fondos, prerrequisito y orden.
4. Desbloqueo por fases: fase 1 visible, fase 2 tras comprar X, muros PvP opcionales con toggle.
5. Rebirth: valida requisitos, resetea plot a plantilla, otorga token + mult, guarda en slot separado.
6. Amigos: permiso de construir/recoger con 3 roles (visitante/ayudante/co-dueño) y log.
7. Tutorial guiado de 5 compras (flecha + highlight) antes de modo libre.
8. Limpieza: cubos con vida 20 s, pool fijo (ej. 60 cubos/plot), sin colisión compleja.

## Conocimientos técnicos
### Qué valida el servidor
- Dueño/permiso del plot y botón existente no comprado.
- Fondos suficientes; precio desde catálogo servidor.
- Rebirth con requisitos exactos; cooldown 60 s anti-doble.
- Recogida de dinero solo por dueño/rol permitido en zona collector.
### Persistencia
- Guarda `botonesComprados[]`, dinero, rebirths, skin con `DataStoreService` (`tycoon_v2`); no guardes cubos sueltos.
- Carga reconstruye por lotes (10 botones/frame) para evitar freeze de 150 piezas.
- Autosave 120 s + `BindToClose`; migración de layout con mapa `oldId→newId`.
### Errores/desconexiones
- Compra en vuelo al irse: si se cobró, el botón queda comprado al rejoin.
- Plot corrupto: carga botones válidos, reembolsa 50% de los inválidos + aviso.
- Duplicación por doble clic: idempotencia con `buttonId` + mutex por plot.
### Anti-exploit
- Cubos con valor solo en servidor; tocar cubo no da dinero desde cliente.
- Anti-teleport a collector ajeno: valida dueño antes de acreditar.
- Rate-limit compras 6/s; robo de caja con hold validado si hay PvP.
- Detecta $/min ×5 sobre curva y congela cobros para revisión.

## Buenas prácticas
- Botones con precio, efecto (+$/s) y prerrequisito visibles; sin sorpresas.
- Conveyors cortos y rectos; evita curvas que atascan cubos.
- Sonido de compra + salto de $/s visible; cada compra debe sentirse.
- Plots idénticos en tamaño/forma para fairness; decoración libre aparte.
- PvP opt-in por toggle, nunca por defecto en tycoon chill.

## Errores frecuentes
1. Cubos con `Touched` cliente que acredita → dinero infinito; acreditar solo en servidor.
2. 200 cubos con física → lag; pool + `CanCollide=false` + vida corta.
3. Guardar cada compra → throttling; batch 120 s + eventos clave.
4. Rebirth sin aviso → rage; confirmación con lo que se pierde y lo que se gana.
5. Plots gratis sin límite → griefing; 1 plot/jugador + timeout AFK 20 min.

## Criterios de calidad y terminado
- [ ] Plot completo (40 botones) carga en <3.5 s en dispositivo medio.
- [ ] Doble compra del mismo botón cobra 1 vez.
- [ ] $/min medido coincide ±10% con diseño en 3 puntos (20 min, 1 h, 2 h).
- [ ] Exploit de collector ajeno entrega $0 en 10 intentos.
- [ ] Rebirth resetea y otorga mult exacto con auditoría.
- [ ] 12 plots activos ≥45 FPS.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `CollectionService`, `ProximityPrompt`, `DataStoreService`, `Teams` (tycoon por equipos). Componer con `roblox-building-placement` y `roblox-economy-balancing`. Verificar en create.roblox.com/docs.

## Limitaciones
- No cubre conveyors físicos complejos con atascos realistas al detalle.
- No balancea economía cross-tycoon; componer con economía.
- Editor libre de base queda fuera; aquí plots con slots.

```luau
-- Ilustrativo: compra idempotente de botón.
local comprados = {}
local function comprar(plotId: string, buttonId: string, precio: number, fondos: number)
	if comprados[plotId .. "/" .. buttonId] then return false, "ya comprado" end
	if fondos < precio then return false, "sin fondos" end
	comprados[plotId .. "/" .. buttonId] = true
	return true, "ok"
end
```
