---
name: roblox-dynamic-events
description: Eventos temporales con jefes, clima de gameplay y anuncios. Úsala cuando necesites invasiones, drops, jefes de mundo o modificadores rotativos.
---

# Eventos Dinámicos y Temporales

## Objetivo
Mantener el juego vivo con eventos programados y emergentes: spawns especiales, jefes de mundo, climas que cambian reglas y anuncios que movilizan sin saturar.

## Alcance y límites
Cubre calendario, spawneo, escalado por jugadores, anuncios y recompensas de evento.
Diferenciación declarada: `roblox-game-systems` (instalada) es recetario fino; esta skill es la versión profunda con scheduling, escalado y anti-camp. NO cubre IA de jefes al detalle (componer con `roblox-combat-systems`), ni quests ligadas a eventos (lo cubre `roblox-quest-progression-systems`), ni economía de drops raros (lo cubre `roblox-economy-balancing`). `roblox-genre-patterns` no profundiza en eventos.

## Casos de uso
- Jefe de mundo cada hora con loot compartido.
- Lluvia de meteoros que altera rutas 5 min.
- Invasión nocturna con oleadas en base.
- Drop aéreo disputado en PvP.
- Fin de semana doble XP con tope.

## Bucle de juego o sistema (diseño)
1. Pre-aviso (5 min + 1 min) con lugar y reglas.
2. Viaje/preparación (decisión de riesgo).
3. Participación (daño, defensa, recolección según evento).
4. Cierre con ranking y reparto (participación > daño puro).
5. Cooldown y rotación para evitar fatiga.
Balance de ejemplo: jefe 12k HP base + 2k por jugador extra (cap 40k), ventana 10 min, loot top 5% + participación 60% del valor; frecuencia: menor cada 15 min, mayor cada 60–120 min; si asistencia cae <20% del pico en 2 semanas, rota tipo/horario.

## Proceso paso a paso
1. Define catálogo `EventDefs`: `id`, `duración`, `avisoPrevio`, `minJugadores`, `escalado`, `recompensa`, `cooldownGlobal`.
2. Scheduler central en servidor: cola con `os.time()`, evita solapes (máx 1 mayor + 1 menor), respeta horario pico.
3. Anuncios en 3 niveles: banner + sonido + marcador de mapa; incluye cuenta atrás y reglas en 2 líneas.
4. Spawneo validado: puntos libres, fuera de zonas seguras si es PvP, con `Attributes` (`EventId`, `ExpiraEn`).
5. Escalado: HP/daño/nodos según participantes reales a T+60 s, no según servidor lleno.
6. Participación: tabla `daño/heal/tiempoEnZona` por jugador; recompensa por umbrales, no solo top-1.
7. Cierre limpio: despawn, reparto, log y cooldown; anuncio de próximos 2 eventos.
8. Telemetría: asistencia, duración real, quejas/fatiga (ignorar avisos), ajusta frecuencia.

## Conocimientos técnicos
### Qué valida el servidor
- Elegibilidad de recompensa: daño/tiempo mínimo, presente al cierre o muerto en ventana (gracia 30 s).
- Daño a jefe solo dentro de arena y ventana activa; fuera = 0.
- Recogida de drops de evento con proximidad ≤12 studs y dueño/ventana de loot.
- Un jugador = una recompensa por evento (idempotencia por `eventUid+UserId`).
### Persistencia
- Guarda participaciones y pity de legendario de evento con `DataStoreService`; no guardes estado del evento vivo.
- Calendario persistente ligero (último mayor, racha asistida) para bonus de fidelidad.
### Errores/desconexiones
- Caída mid-evento: si vuelve en <5 min conserva participación parcial.
- Jefe atascado (sin daño 90 s): re-posiciona o resetea con HP conservado; si 2 resets, cierra con recompensa parcial.
- Cierre de servidor: evento se cancela y se devuelve coste de entrada si lo hubo.
### Anti-exploit
- Anti-AFK en zona: requiere daño/movimiento, no solo presencia.
- Anti-teleport al drop: valida llegada a pie/distancia razonable.
- Anti-multicaja: reduce loot 50% desde 2.ª cuenta en mismo evento (heurística + log).
- Rate-limit de daño reportado si usas remotos de hit: 15/s.

## Buenas prácticas
- Un evento a la vez en pantalla; colas visibles, no 3 banners a la vez.
- Reglas justas anunciadas antes: "top 5 + todos con >500 daño cobran".
- Accesible: teleport gratuito al evento, nivel mínimo claro, modo espectador.
- Usa `CollectionService` para limpiar restos y `Attributes` para temporizadores visibles.
- Ritmo: 70% eventos menores, 25% medianos, 5% épicos.

## Errores frecuentes
1. Jefe con HP fijo → trivial con 30 o imposible con 3; escalar por asistencia real.
2. Solo premia top-1 → 90% no vuelve; pagar por umbrales amplios.
3. Avisos sin ubicación → nadie llega; marcador + teleport.
4. Eventos solapados → lag y confusión; scheduler con mutex.
5. Loot sin ventana → ninja-loot y toxicidad; loot personal o por contribución.

## Criterios de calidad y terminado
- [ ] 3 eventos seguidos (menor/mayor/menor) sin solape ni restos en mapa.
- [ ] Jefe escala 12k→20k al pasar de 4 a 8 participantes (±15%).
- [ ] AFK 5 min en zona recibe 0 recompensa; participante mínimo sí cobra.
- [ ] Desconexión y rejoin en 3 min conserva participación.
- [ ] Asistencia medida y log de reparto auditable en 2 eventos.
- [ ] Avisos ignorados <30% (fatiga controlada).

## Herramientas
Servicios/clases: `RemoteEvent`, `Players`, `Teams`, `CollectionService`, `Attributes`, `DataStoreService`, `MessagingService` (coordinar eventos cross-server si aplica), `BadgeService` (medallas de evento). Verificar en create.roblox.com/docs.

## Limitaciones
- No diseña jefes con fases complejas; componer con `roblox-combat-systems`.
- No balancea economía de drops únicos; componer con `roblox-economy-balancing`.
- Coordinación cross-server avanzada requiere diseño adicional de `MessagingService`.

```luau
-- Ilustrativo: escalado de HP por participantes.
local function hpEscalado(base: number, extra: number, n: number, cap: number): number
	return math.min(cap, base + extra * math.max(0, n - 1))
end
```
