---
name: roblox-tower-defense
description: Tower defense con oleadas, pathing, economía de torres y coop. Úsala cuando necesites mapas con camino, sinergias, bosses y balance de oleadas.
---

# Tower Defense (Oleadas, Pathing, Economía)

## Objetivo
Diseñar un TD completo: camino legible, torres con roles, economía de interés (matar→oro→más torres), oleadas con contra-play y coop sin caos.

## Alcance y límites
Versión profunda de género: bucles, progresión, mecánicas, UX, rendimiento y pitfalls.
Diferenciación declarada: `roblox-genre-patterns` es catálogo de 1 línea; esta skill es la versión profunda de TD. `roblox-game-systems` es recetario fino. NO repite: colocación en grid se compone con `roblox-building-placement`, daño/habilidades con `roblox-combat-systems`, progresión/meta con `roblox-quest-progression-systems`, economía global con `roblox-economy-balancing`, coop/matchmaking con `roblox-social-systems`.

## Casos de uso
- TD clásico 20 oleadas con 6 torres.
- Endless con bosses cada 10 y leaderboard.
- Coop 4 con roles (slow/DPS/economía).
- TD PvP con envío de漏s al rival.
- Evento TD con modificadores semanales.

## Bucle de juego o sistema (diseño)
- Bucle 30 s: colocar/mejorar → ver oleada → ajustar posición.
- Bucle partida (15–25 min): 15–25 oleadas, 2–3 bosses, 1–2 "oleadas trampa" (rápidos/aéreos/blindados).
- Bucle meta: desbloquear torre, subirla, probar en endless.
Economía: inicio 300 oro, kill 6–12, oleada bonus 50+10×n; torre base 100–300, mejora ×1.6, venta 70%; DPS/100 oro debe converger: cañón 8, arquera 6 + rango, hielo 0 + slow 40%; boss HP = 12× DPS medio esperado; si la win-rate en normal sale de 45–65% en 200 partidas, retoca HP/oro ±10%.

## Proceso paso a paso
1. Camino con `PathfindingService` o waypoints fijos; muestra línea y preview de rango al colocar (componer grid con `roblox-building-placement`).
2. 5–7 torres con rol único: single, AoE, slow, sniper, economía, buff; sin duplicados.
3. Oleadas en tabla `WaveDefs`: `comp`, `hpMult`, `velMult`, `inmunidad`, `boss`; anuncia contra-play ("¡aéreos! usa arquera").
4. Colocación validada en servidor: celda libre, dentro de zona, fondos, límite 30 torres/jugador.
5. Combate en servidor a tick 0.15–0.2 s (no cada frame por torre); proyectiles visuales en cliente, daño en servidor.
6. Interés: oro por kill + bonus oleada perfecta (sin漏s) +5%; derrota = vidas −漏s (20 vidas).
7. Coop: oro compartido o por jugador con donación; roles con ping de "necesito slow aquí".
8. Endless: HP ×1.18^n tras oleada 25, leaderboard `OrderedDataStore` por oleada/tiempo.

## Conocimientos técnicos
### Qué valida el servidor
- Compra/mejora: fondos, torre existe, nivel máx 4, celda válida.
- Daño: calculado en servidor por tick; cliente no reporta kills.
- Oro: solo servidor acredita; venta con 70% exacto.
- Oleada skip (llamar antes): valida que todos los vivos votaron o modo solo.
### Persistencia
- Guarda torres desbloqueadas, niveles, mejor oleada y loadouts con `DataStoreService`.
- Partida en curso no se persiste a mitad salvo checkpoint cada 5 oleadas (reanudable en solo).
### Errores/desconexiones
- Jugador coop se va: sus torres quedan como "neutrales" 2 min, luego se venden 50% al equipo.
- Desincronía visual de HP: el servidor manda snapshot cada 1 s; cliente interpola.
- Boss atascado: timeout 60 s → teleport al siguiente waypoint con log.
### Anti-exploit
- Anti-colocación fuera de zona o sobre camino: recalcula en servidor.
- Anti-speed de oleada: el tiempo lo marca el servidor, no el botón cliente.
- Rate-limit compras 8/s; oro imposible (ej. +10k en 10 s) congela y audita.
- Nunca aceptes `daño` o `oro` desde cliente.

## Buenas prácticas
- Preview de rango + camino de enemigos siempre visibles al colocar.
- Torres con sonido/visual distintos; slow con color claro para daltónicos.
- Derrota suave: muestra oleada récord y "una mejora más y lo pasas".
- Pools de enemigos (máx 60 vivos) y LOD; sin colisiones complejas.
- Tutorial de 3 oleadas con pausa activa y sugerencias.

## Errores frecuentes
1. Daño por frame por torre → O(n×m) y lag; tick 0.2 s + spatial hash.
2. Camino generado sin validar → enemigos atascados; waypoints fijos + test.
3. Una torre domina → resto inútiles; DPS/oro auditado por torre.
4. Sin contra-play anunciado → oleada aérea barre; avisa 1 oleada antes.
5. Coop sin donación → un jugador acapara; oro por kill al que colocó + fondo común 20%.

## Criterios de calidad y terminado
- [ ] Win-rate normal 45–65% en 200 partidas simuladas/reales.
- [ ] 60 enemigos vivos sin bajar de 45 FPS en dispositivo medio.
- [ ] Colocación ilegal (sobre camino/fuera) rechazada 20/20.
- [ ] Boss 10 cae en ventana diseñada ±20% con estrategia correcta.
- [ ] Desconexión coop no rompe partida en 3 pruebas.
- [ ] Endless 30+ guarda récord sin duplicar.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `Players`, `Attributes`, `CollectionService`, `PathfindingService`, `DataStoreService`, `OrderedDataStore`, `Teams` (coop). Componer con `roblox-building-placement` y `roblox-combat-systems`. Verificar en create.roblox.com/docs.

## Limitaciones
- No cubre PvP de envío de oleadas al detalle; extensión dedicada.
- No cubre editor de mapas; camino fijo o generador aparte.
- Balance fino exige simulación + playtest; números iniciales orientativos.

```luau
-- Ilustrativo: DPS por oro para auditar torres.
local function dpsPorOro(dps: number, coste: number): number
	return (dps / coste) * 100
end
-- Compara cañón 8 vs. arquera 6; si una duplica a otra, rebalancea.
```
