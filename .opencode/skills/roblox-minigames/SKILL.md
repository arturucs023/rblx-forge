---
name: roblox-minigames
description: Rondas cortas con salas, matchmaking, puntuación y rotación. Úsala cuando necesites party games, micro-juegos o lobbies rotativos.
---

# Minijuegos (Rondas Cortas y Salas)

## Objetivo
Crear minijuegos de 1–4 minutos con ciclo completo: lobby, matchmaking de sala, ronda, puntuación, podio y rotación sin tiempos muertos.

## Alcance y límites
Cubre máquina de estados de sala, equipos, puntuación, rotación de mapas/modos y recompensas por ronda.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino con un loop de ronda simple; esta skill es la versión profunda con salas concurrentes, matchmaking y anti-AFK. NO cubre combate detallado (lo cubre `roblox-combat-systems`), ni progresión persistente de niveles (lo cubre `roblox-quest-progression-systems`), ni economía global (lo cubre `roblox-economy-balancing`). Social persistente (clanes/fiestas) lo cubre `roblox-social-systems`. `roblox-genre-patterns` solo cataloga.

## Casos de uso
- Party pack con 8 micro-juegos rotativos.
- 1v1 arenas con cola rápida.
- Coop de 4 contra reloj con ranking.
- Todos contra todos con respawn infinito 3 min.
- Torneos de sala privada con código.

## Bucle de juego o sistema (diseño)
1. Entrar a lobby y votar mapa/modo (15–20 s).
2. Intermisión con reglas (10 s) y teleport a arena.
3. Ronda 90–180 s con objetivo claro y comeback posible.
4. Podio + puntos + MVP (15 s).
5. Vuelta a lobby con rotación anti-repetición.
Balance de ejemplo: 6–12 jugadores/sala, ronda 120 s, puntos 1.º=100/2.º=70/3.º=50/resto 20 por participar; AFK = 0; matchmaking por MMR simple ±150; si un modo gana >45% de votos 3 días seguidos, nerfea su peso o rotalo fuera 24 h.

## Proceso paso a paso
1. Diseña 3–5 minijuegos con la misma interfaz: `Setup(arena)`, `Start(players)`, `ScoreTick()`, `Finish() → resultados`.
2. Implementa `RoomManager` en servidor: `Lobby → Voting → Intermission → Live → Results → Lobby`, con timeout por estado.
3. Salas concurrentes: lista de salas con cap (ej. 12 jugadores), autobalanceo y backfill hasta 15 s de ronda.
4. Matchmaking: cola global con `MemoryStoreService` o tabla servidor; agrupa por tamaño de party y MMR; sala privada con código de 6 chars.
5. Puntuación servidor con `Attributes` por jugador; eventos solo vía `RemoteEvent RoundScore` validado.
6. Anti-AFK:检测 movimiento/inputs cada 20 s; 2 avisos → espectador sin puntos.
7. Rotación: evita repetir modo/mapa 2 veces seguidas; voto con peso anti-spam (1 voto/jugador).
8. Recompensas: XP/moneda por posición + bonus MVP + racha diaria; guarda con DataStores.

## Conocimientos técnicos
### Qué valida el servidor
- Elegibilidad: jugador en sala, vivo/en juego, ronda `Live`.
- Puntos: solo desde lógica servidor (zona, kill validado, entrega); cliente nunca envía "+100".
- Votos: 1 por jugador por fase; sala y opción existen.
- Teleports a arena solo por servidor (`PivotTo`); rechaza posiciones cliente.
### Persistencia
- `DataStoreService` para puntos totales, victorias, MMR y rachas; `MemoryStoreService` para colas/rankings efímeros.
- Guarda al terminar ronda, no cada punto; pcall + reintento.
### Errores/desconexiones
- Jugador se va mid-ronda: sus puntos quedan, equipos se rebalancean si <4/sala; backfill si <15 s.
- Servidor cierra: `BindToClose` persiste tabla de la ronda.
- Empate: desempate por tiempo de último punto, luego aleatorio con semilla servidor.
### Anti-exploit
- Anti-speed/teleport a objetivo: valida velocidad y proximidad antes de contar punto.
- Anti-farm con alt: detecta mismo IP/dispositivo en podio repetido (heurística) + puntos reducidos en sala privada.
- Rate-limit de eventos de puntuación 10/s; exceso ignorado.
- Votos y colas con cooldown para evitar bots.

## Buenas prácticas
- Reglas en 2 líneas + icono; tutorial de 10 s jugable, no texto largo.
- Tiempos muertos <20 s; botón "jugar otra" visible siempre.
- UIs grandes y daltónicas; MVP con celebración corta no skippable de 3 s máx.
- Mapas pequeños y legibles; respawn <3 s.
- Telemetría por modo: duración media, abandono %, diversión (votos/repick).

## Errores frecuentes
1. Una sola sala global → espera eterna; usar salas concurrentes + backfill.
2. Puntos desde cliente → farming infinito; mover a servidor.
3. Sin timeout en voting → lobby colgado; timeout 20 s con default aleatorio.
4. Rotación pura aleatoria → repite 3 veces; historial de 3 + veto.
5. Recompensar solo al 1.º → 70% abandona; paga hasta el último con curva suave.

## Criterios de calidad y terminado
- [ ] Lobby → podio → lobby en <4 min con 8 jugadores simulados.
- [ ] Backfill rellena bajas en <15 s sin romper equipos.
- [ ] Exploit de puntos desde cliente entrega 0 puntos en 20 intentos.
- [ ] Abandono mid-ronda <15% en 50 rondas de prueba.
- [ ] Ningún modo/mapa se repite 2 veces seguidas en 30 rotaciones.
- [ ] Rejoin conserva totales; ronda en curso no duplica recompensa.

## Herramientas
Servicios/clases: `RemoteEvent`, `RemoteFunction`, `Players`, `Teams`, `MemoryStoreService`, `DataStoreService`, `TeleportService` (solo entre lugares, no entre salas), `Attributes`. Verificar en create.roblox.com/docs.

## Limitaciones
- No cubre matchmaking cross-server complejo ni ELO avanzado con seasons; diseño base aquí.
- No cubre combate fino; componer con `roblox-combat-systems`.
- No cubre fiestas/clanes persistentes; componer con `roblox-social-systems`.

```luau
-- Ilustrativo: máquina de estados de sala.
local Estado = "Lobby"
local ORDEN = { Lobby = "Voting", Voting = "Intermission", Intermission = "Live", Live = "Results", Results = "Lobby" }
local function avanzar()
	Estado = ORDEN[Estado]
	print("Sala -> " .. Estado)
end
```
