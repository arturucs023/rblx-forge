---
name: roblox-vehicle-systems
description: Vehículos como gameplay con garaje, combustible, daño y robo validado. Úsala cuando necesites coches, barcos o monturas con propiedad y persistencia.
---

# Sistemas de Vehículos (Gameplay)

## Objetivo
Implementar vehículos divertidos y estables: spawn/garaje, conducción arcade legible, combustible/daño/reparación y robo o préstamo entre jugadores con validación total en servidor.

## Alcance y límites
Cubre propiedad, spawn/despawn, daño/combustible, asientos, robo validado y garaje.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino; esta skill es la versión profunda con propiedad, persistencia y anti-robo por exploit. NO cubre tuning físico de constraints al detalle (usa `Constraints` estables y verifica en create.roblox.com/docs), ni combate vehicular con armas (lo cubre `roblox-combat-systems`), ni economía de precios de coches (lo cubre `roblox-economy-balancing`). `roblox-genre-patterns` no profundiza.

## Casos de uso
- Coche propio con garaje y spawn por botón.
- Barco compartido por equipo con asientos.
- Montura rápida con stamina propia.
- Robo PvP con ganzúa y alarma.
- Taxi/mecánico como rol con tarifa.

## Bucle de juego o sistema (diseño)
1. Comprar/desbloquear vehículo (garaje).
2. Spawnear en punto válido y conducir (objetivo: transporte, reparto, huida).
3. Gestionar combustible/daño (repostar/reparar como sink).
4. Riesgo PvP: aparcar, bloquear, robo con minijuego.
5. Mejorar (velocidad/blindaje) y presumir.
Balance de ejemplo: coche base 60 studs/s, deportivo 95, consumo 1%/8 s en marcha, tanque 100 = ~13 min; reparación 40% del precio cada destrucción total; robo tarda 8 s con `ProximityPrompt` + ruido a 60 m; si el vehículo reduce tiempos de viaje >60%, sube coste o añade zonas no-vehiculares.

## Proceso paso a paso
1. Define `VehicleDefs`: `id`, `velMax`, `acel`, `asientos`, `combustibleMax`, `consumo`, `hp`, `permiteRobo`, `precio`.
2. Garaje por jugador: lista poseída + equipado; `RemoteFunction SpawnVehicle(id)` valida propiedad.
3. Spawn en servidor en punto libre (chequeo `OverlapParams`); asigna `Attributes` (`OwnerId`, `Locked`, `Fuel`, `HP`).
4. Conducción: `VehicleSeat` o `Seat` + `Attributes` de control; cliente conduce por replicación física, servidor valida posición/velocidad.
5. Daño/combustible en servidor por tick (cada 1 s, no cada frame); a 0 HP → humo, a 0 fuel → apagado; reparación solo en taller o con kit.
6. Robo: `ProximityPrompt` con `HoldDuration` 8 s, requiere dueño ausente >15 m o vehículo desbloqueado; servidor transfiere `DriverRights` temporales, no propiedad.
7. Despawn: auto a los 120 s sin conductor + guarda fuel/HP; limpieza con `CollectionService` tag `Vehicle`.
8. Permisos: bloquear/desbloquear con `RemoteEvent ToggleLock`; solo dueño; pasajeros expulsables por dueño.

## Conocimientos técnicos
### Qué valida el servidor
- Propiedad real antes de spawn; límite 1 activo por jugador (2 con pase).
- Punto de spawn libre y dentro de zona permitida.
- Conducción: velocidad ≤ velMax + 15% tolerancia; teleports >120 studs/s se corrigen.
- Robo: distancia, tiempo de hold completo en servidor, dueño no conduciendo, vehículo robable.
### Persistencia
- Guarda con `DataStoreService` poseídos, mejoras y `fuel/HP` al despawn; nunca guardes posición exacta salvo garaje fijo.
- Versiona `vehicles_v1`; migraciones con valores por defecto.
### Errores/desconexiones
- Dueño se va: vehículo queda 120 s y despawnea; pasajeros reciben aviso y son expulsados seguros.
- Pasajero se cae del mundo: respawn a asiento o al lado con fade.
- Pérdida de `NetworkOwnership`: el servidor reasigna dueño de red al conductor válido; si dudas, verificar en create.roblox.com/docs.
### Anti-exploit
- Anti-fly con coche: clamp de Y y velocidad vertical; si sube >8 studs/s sin rampa, corrige y registra.
- Anti-noclip: colisiones servidor periódicas; ignora inputs imposibles.
- `ToggleLock` y `SpawnVehicle` con rate-limit 5/s; robo con cooldown 30 s por vehículo.
- Nunca dejes que el cliente fije `Fuel`/`HP`; solo el servidor escribe esos `Attributes`.

## Buenas prácticas
- Arcade antes que simulación: 3–5 parámetros (vel, giro, agarre) bien tuneados.
- Feedback: velocímetro, barra fuel/HP, sonido motor por pitch, cámara con FOV ligero.
- Zonas peatonales marcadas; atropello solo si el diseño lo pide y con reglas claras.
- Asientos con `Seat` + prompt de expulsar; evita atrapar jugadores.
- LOD y colisiones simples en carrocería para móvil.

## Errores frecuentes
1. Fiarse de física cliente sin checks → coches voladores; validar velocidad/posición.
2. Múltiples spawns por spam → lag y griefing; límite 1 activo + cooldown 5 s.
3. Robo instantáneo sin hold → frustración; hold 6–10 s + alarma.
4. Fuel por frame con floats → deriva; tick 1 s con enteros 0–100.
5. Vehículo persistente con posición → atascos al cargar; spawnear siempre en garaje/punto libre.

## Criterios de calidad y terminado
- [ ] 30 spawns/despawns sin duplicados ni huérfanos en lista de vehículos.
- [ ] Robo legítimo tarda 8±1 s y notifica al dueño; robo por exploit (lejos) falla 10/10.
- [ ] Coche a velMax durante 5 min consume 35–40% fuel (rango diseñado).
- [ ] Fly simulado (Y+50) corregido en <2 s sin expulsar al conductor legítimo en rampa.
- [ ] Rejoin conserva poseídos y fuel/HP del despawn.
- [ ] 10 vehículos activos mantienen ≥45 FPS en dispositivo medio.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `CollectionService`, `DataStoreService`, `ProximityPrompt`, `TweenService` (humo/luces). Física con `VehicleSeat`, `Seat`, `Constraints`; verificar en create.roblox.com/docs.

## Limitaciones
- No cubre armas vehiculares ni daño PvP fino; componer con `roblox-combat-systems`.
- No cubre precios/sinks globales; componer con `roblox-economy-balancing`.
- Física avanzada (suspensión realista, drift sim) queda fuera de este alcance.

```luau
-- Ilustrativo: tick de combustible en servidor (cada 1 s).
local function tickCombustible(veh): boolean
	local fuel = veh:GetAttribute("Fuel") or 100
	fuel = math.max(0, fuel - 1)
	veh:SetAttribute("Fuel", fuel)
	return fuel > 0
end
```
