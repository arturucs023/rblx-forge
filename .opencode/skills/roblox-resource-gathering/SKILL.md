---
name: roblox-resource-gathering
description: Nodos recolectables con respawn, herramientas y validación de proximidad. Úsala cuando necesites minas, árboles, pesca o loot con anti-farmer y anti-teleport.
---

# Recolección de Recursos (Gathering)

## Objetivo
Crear un sistema de recolección justo y escalable: nodos visibles, herramientas con tiers, respawn controlado y servidor que valida proximidad, cantidad y ritmo.

## Alcance y límites
Cubre nodos estáticos y rotativos, herramientas, yields, respawn e inventario de materias primas.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino con un ejemplo de moneda; esta skill es la versión profunda con economía de nodos, respawn y validación anti-teleport. NO cubre transformación de materias en objetos (lo cubre `roblox-crafting`), ni precios de tienda o inflación (lo cubre `roblox-economy-balancing`), ni quests de "recolecta X" (lo cubre `roblox-quest-progression-systems`). `roblox-genre-patterns` solo lista géneros sin profundizar.

## Casos de uso
- Menas de hierro/cristal con picos por tier.
- Árboles talables con tocones y rebrote.
- Pesca por zonas con rareza por hora del juego.
- Hierbas instanciadas por jugador vs. compartidas por servidor.
- Energía/gas en mapa PvP con riesgo-recompensa.

## Bucle de juego o sistema (diseño)
1. Explorar y localizar nodo (señal visual/sonora).
2. Acercarse y usar herramienta (hold o golpes con `ProximityPrompt`/`ClickDetector`).
3. Validación servidor y entrega de yield con varianza.
4. Nodo se agota → estado agotado → respawn temporizado.
5. Transportar/vender/usar material (componer con economía o crafteo).
Balance de ejemplo: nodo común 3–5 golpes, yield 2–4 uds, respawn 60–90 s; nodo raro 8 golpes, yield 1 + 15% bonus, respawn 5 min, máx 4 activos; ingreso objetivo 120–180 uds/hora/jugador activo; si un jugador supera 300 uds/h, revisar exploit o ruta rota.

## Proceso paso a paso
1. Clasifica nodos: común/raro/épico; define `hitsParaAgotar`, `yieldBase`, `varianza`, `respawnS`, `maxActivos`, `compartido vs. personal`.
2. Coloca nodos con `CollectionService` tag `GatherNode` y `Attributes` (`NodeId`, `Tier`, `HitsRestantes`).
3. Define herramientas en `ModuleScript GatherDefs`: tier, multiplicador de daño a nodo, alcance, CD de golpe (ej. 0.8 s).
4. Interacción: `ProximityPrompt` con `HoldDuration` por tier (común 0.4 s, raro 1.2 s) o herramienta que dispara `RemoteEvent GatherHit(NodeId)`.
5. Servidor valida: existe nodo, no agotado, distancia ≤ 12 studs + tolerancia, CD entre golpes, herramienta equipada real.
6. Aplica daño a nodo en servidor, entrega yield a inventario servidor, replica agotamiento a todos.
7. Programa respawn con cola central (no un `while` por nodo): prioridad por escasez y distancia a jugadores.
8. Añade anti-camping: si un jugador golpea el mismo respawn >6 ciclos seguidos, reduce yield 25% temporal (diminishing returns).

## Conocimientos técnicos
### Qué valida el servidor
- Distancia jugador–nodo con posición servidor de `HumanoidRootPart`; rechaza >14 studs.
- Ritmo: `os.clock()` entre golpes ≥ CD herramienta − 0.05 s tolerancia.
- Integridad: `NodeId` existe, no agotado, herramienta poseída (tabla servidor, no `Backpack` cliente).
- Cantidad: yield calculado en servidor con RNG servidor; cliente nunca envía cantidad.
### Persistencia
- Guarda inventario de materias y nivel de herramienta con `DataStoreService`; nunca guardes estado de nodo compartido.
- Nodos personales (instanciados) pueden guardar semilla y `respawnEn`; al rejoin recalcula agotado/disponible.
- Guardado cada 60 s y en `BindToClose`; pcall + reintento con backoff.
### Errores/desconexiones
- Golpe en vuelo al agotarse: se devuelve "nodo agotado" sin coste de durabilidad.
- Desconexión mid-hold: cancela `ProximityPrompt` sin entregar yield parcial salvo regla explícita (ej. pesca entrega si >80%).
- Duplicación por doble prompt: el servidor marca nodo `reclamadoPor` con timestamp; segundo intento pierde.
### Anti-exploit
- Anti-teleport: si el jugador recorre >60 studs entre dos golpes válidos en <1 s, ignora y marca strike.
- Anti-noclip a zona rica: valida región y nivel requerido en servidor antes de entregar rareza alta.
- Rate-limit `GatherHit`: 6/s máx; autoclickers con 0.05 s se bloquean por CD.
- Logs de yields/hora por jugador para detectar outliers.

## Buenas prácticas
- Nodos compartidos para socializar, personales para onboarding sin frustración; mezcla 70/30.
- Feedback: shake + número flotante + sonido por tier; nodo raro con beacon visible a 80 m.
- Usa `Attributes` para `HitsRestantes` y replica barato sin `RemoteEvent` por tick.
- Herramientas con durabilidad solo si hay reparación accesible; si no, evita frustración.
- Rotación diaria de hotspots para romper rutas óptimas permanentes.

## Errores frecuentes
1. Yield decidido por cliente → duplicación infinita; mover RNG a servidor.
2. Un hilo por nodo con `wait()` → 500 hilos colgados; usar scheduler central.
3. `ClickDetector` sin `MaxActivationDistance` → recolección a través del mapa; fijar 12–14.
4. Respawn fijo predecible → camping; añadir jitter ±30% y límite por zona.
5. Guardar `HitsRestantes` de cada nodo en DataStore → throttling; no persistir nodos compartidos.

## Criterios de calidad y terminado
- [ ] 200 golpes legítimos con ping variable sin falsos rechazos >2%.
- [ ] Teleport entre nodos (exploit simulado) entrega 0 uds y genera alerta.
- [ ] Ingreso medido 120–180 uds/h en ruta óptima común; raro ≤12 uds/h.
- [ ] 100 nodos activos con <2 ms de coste servidor por tick de scheduler.
- [ ] Rejoin conserva inventario y herramienta; nodos recalculan sin duplicar.
- [ ] Diminishing returns activa tras 6 ciclos y se muestra en UI.

## Herramientas
Servicios/clases: `RemoteEvent`, `Players`, `CollectionService`, `Attributes`, `ProximityPrompt`, `ClickDetector`, `DataStoreService`, `TweenService` (feedback). Si dudas de un miembro, verificar en create.roblox.com/docs.

## Limitaciones
- No balancea tiendas ni inflación; componer con `roblox-economy-balancing`.
- No genera recetas ni estaciones; componer con `roblox-crafting`.
- No cubre pathfinding de NPCs recolectores; eso es `roblox-npcs` (verificar en create.roblox.com/docs).

```luau
-- Ilustrativo: validación de golpe en servidor.
local ULTIMO_GOLPE = {}
local CD = 0.8
local function golpeValido(player, nodoPos: Vector3, rootPos: Vector3): boolean
	local ahora = os.clock()
	if ahora - (ULTIMO_GOLPE[player.UserId] or 0) < CD - 0.05 then return false end
	if (nodoPos - rootPos).Magnitude > 14 then return false end
	ULTIMO_GOLPE[player.UserId] = ahora
	return true
end
```
