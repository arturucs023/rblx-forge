---
name: roblox-competitive-systems
description: Diseña juego competitivo justo con ranked simple y finales limpios. Úsala cuando necesites matchmaking equilibrado, ELO sencillo, anti-smurf básico o desempates.
---

# Sistemas competitivos justos y creíbles

## Objetivo

Montar competición que se sienta justa: emparejamiento equilibrado, ranking
simple y transparente, defensas básicas contra smurfs y abandonos, y finales
(desempates, overtime) que coronan al mejor sin polémicas.

## Alcance y límites

**Diferenciación declarada:** las skills instaladas `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems` y
`roblox-security` cubren transporte, teleport, matchmaking técnico, social y
validación fina. Esta skill NO repite el transporte: cubre diseño de sistemas
competitivos (matchmaking justo, ranked/ELO simple, anti-smurf básico,
finales).

Esta skill NO hace:

- Implementación técnica del teleport o colas base → lo cubren
  `roblox-teleport` y `roblox-teleport-matchmaking`.
- Anti-cheat de bajo nivel → lo cubre `roblox-security`.
- Cooperativo contra el entorno → lo cubre `roblox-coop-systems`.
- Servidores privados como producto → lo cubre `roblox-private-servers`.

## Casos de uso

1. 1v1 o 5v5 con emparejamiento por nivel visible.
2. Liga con puntos ELO simples que el jugador entiende.
3. Smurfs que destrozan partidas de novatos: frenarlos sin CAPTCHAs.
4. Partida que queda 4 contra 5 por abandono: resolverla con justicia.
5. Final empatado que necesita desempate limpio y rápido.
6. Temporada con reset que no expulsa a los casuales.

## Proceso paso a paso

1. **Define qué mide la habilidad.** Una métrica principal (ELO o MMR
   interno) y, como mucho, dos secundarias (racha, nivel de cuenta). Diez
   métricas = ninguna métrica.
2. **Implementa ELO simple y transparente.** Fórmula clásica con K visible
   (p. ej. K=32), puntos ganados/perdidos mostrados tras cada partida.
   Ejemplo ilustrativo (simplificado):
   ```luau
   -- Ilustrativo: actualización ELO simple (K fija, 1 = victoria).
   local K = 32
   local esperada = 1 / (1 + 10 ^ ((eloRival - eloPropio) / 400))
   eloPropio = math.round(eloPropio + K * (resultado - esperada))
   ```
3. **Diseña el matchmaking justo.** Rango de búsqueda que se amplía con el
   tiempo (empieza ±100, crece cada 30 s), tope de espera declarado y
   prioridad a partidas equilibradas sobre partidas rápidas cuando el
   modo es ranked.
4. **El servidor valida lo importante.** Resultados, ELO y recompensas se
   resuelven en servidor con `RemoteEvent`; el cliente muestra, nunca dicta
   el marcador. Anti-cheat fino: `roblox-security`.
5. **Añade anti-smurf básico.** Cuentas nuevas: incertidumbre alta (K mayor,
   calibración de 5–10 partidas) + restricción suave (sin ranked hasta N
   partidas normales o nivel mínimo). No intentes detectar al smurf perfecto;
   haz que smurfear sea aburrido (sube rápido donde debe estar).
6. **Trata el abandono con justicia.** Abandono en ranked: derrota registrada
   + penalización de cola temporal creciente; equipo abandonado: derrota
   atenuada (pierde menos ELO) y partida marcada. Sin piedad con el que se
   va, sin castigo pleno al que se queda.
7. **Diseña finales y desempates.** Reglas escritas antes de la primera
   queja: overtime, rondas extra, criterios (rondas ganadas, daño, tiempo).
   El desempate se anuncia en UI antes de empezar, no se improvisa empatados.
8. **Separa ranked de casual.** Colas distintas, reglas distintas (abandono
   casual = sin drama, reemplazo con bot si encaja). Mezclarlas contamina
   ambas.
9. **Diseña la temporada y el reset.** Reset suave (compresión hacia la media,
   no a cero), recompensas por máximo alcanzado (no por posición final
   farmeable) y calendario visible. Reset a cero expulsa casuales; sin reset
   estanca la escalera.
10. **Coordina partidas entre servidores.** Salas, resultados y vetos con
    `MemoryStoreService` / `MessagingService` según cuotas (verificar en
    create.roblox.com/docs); traslados con `TeleportService` /
    `TeleportOptions` (detalle: `roblox-teleport-matchmaking`).
11. **Prueba con poblaciones simuladas.** Pocos jugadores (rangos amplios),
    muchos (emparejamiento fino), oleada de smurfs, cascada de abandonos.
    El matchmaking se rompe en los extremos, no en la media.
12. **Publica las reglas.** Cómo se gana ELO, qué pasa al abandonar, cómo se
    desempata. Reglas visibles = disputas cortas; reglas ocultas = "el juego
    me roba".

## Conocimientos técnicos

- El servidor valida lo importante: emparejamientos, resultados, ELO y
  penalizaciones. Ningún número competitivo nace en el cliente.
- Persistencia: ELO, historial y vetos por jugador con escrituras limitadas
  (al cerrar la partida, no por tick); `pcall` + reintento en cada escritura
  porque perder un resultado es perder confianza.
- Errores: si falla el guardado del resultado, consérvalo en memoria del
  servidor y reintenta; muestra "resultado pendiente" en vez de inventar un
  empate.
- `Players` y `Teams` para bandos y salas; `TeleportService` /
  `TeleportOptions` para llevar a la sala; `MemoryStoreService` /
  `MessagingService` para coordinación (cuotas: verificar en
  create.roblox.com/docs).
- Tablas de clasificación: persiste y recalcula en servidor con ventanas
  (diaria/semanal/temporada) para no recalcular el universo en cada partida.

## Buenas prácticas

- ELO simple explicado en una pantalla; si necesita manual, es muy complejo.
- Rango de matchmaking que crece con la espera, con tope honesto.
- Calibración para nuevos + ranked bloqueado hasta fogueo mínimo.
- Abandono: duro con quien se va, piadoso con quien se queda.
- Desempates escritos y visibles antes del primer empate.
- Reset suave por temporada, nunca a cero.

## Errores frecuentes

1. Cliente que reporta el resultado → ELO farmeable en una tarde.
2. Sin calibración: el smurf pasea 30 partidas de novatos.
3. Reset a cero → la base casual no vuelve la temporada 2.
4. Desempate improvisado → polémica y clips virales malos.
5. Mezclar ranked y casual en la misma cola → nadie contento.
6. Penalizar al equipo abandonado como si hubiera perdido 5v5.
7. Recalcular rankings globales en cada partida → colapso de escritura.

## Criterios de calidad y terminado

- [ ] Métrica principal + ELO simple con K y fórmula publicados.
- [ ] Matchmaking con rango expansivo y tope de espera declarados.
- [ ] Calibración y restricción de ranked para cuentas nuevas.
- [ ] Abandono tratado (penalización + atenuación al equipo) y probado.
- [ ] Finales y desempates escritos, visibles y probados empatados.
- [ ] Colas ranked/casual separadas; temporada con reset suave.
- [ ] Resultados y ELO resueltos y persistidos solo en servidor.

## Herramientas

- `Players`, `Teams` para bandos, salas y reparto.
- `TeleportService`, `TeleportOptions` para salas de partida
  (detalle: `roblox-teleport`, `roblox-teleport-matchmaking`).
- `MemoryStoreService`, `MessagingService` para coordinación entre
  servidores (cuotas: verificar en create.roblox.com/docs).
- `RemoteEvent` para resultados y marcadores validados en servidor.

## Limitaciones

- No implementa colas base ni teleport técnico: deriva a
  `roblox-teleport-matchmaking` y `roblox-teleport`.
- No hace anti-cheat de bajo nivel: deriva a `roblox-security`.
- No diseña coop ni privados: deriva a `roblox-coop-systems` y
  `roblox-private-servers`.
- Verifica fórmulas, miembros y cuotas dudosos en create.roblox.com/docs.
