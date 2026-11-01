---
name: roblox-coop-systems
description: Diseña juego cooperativo con revivir, reparto de botín y objetivos. Úsala cuando necesites down-but-not-out, botín compartido, dificultad escalada o sync de objetivos de equipo.
---

# Sistemas cooperativos que unen en vez de frustrar

## Objetivo

Construir cooperación real: revivir compañeros, reparto de botín sin peleas,
dificultad que escala con el grupo, objetivos sincronizados y ayudas que
premien jugar juntos en vez de castigar al que se cae o llega tarde.

## Alcance y límites

**Diferenciación declarada:** las skills instaladas `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems` y
`roblox-security` cubren transporte, teleport, matchmaking, social y
validación fina. Esta skill NO repite el transporte: cubre diseño de sistemas
cooperativos (revivir, reparto de botín, dificultad escalada, sync de
objetivos).

Esta skill NO hace:

- Replicación momento a momento → lo cubre `roblox-state-replication`.
- Recovery tras desconexión → lo cubre `roblox-disconnect-recovery`.
- Servidores privados como producto → lo cubre `roblox-private-servers`.
- Competitivo y ranked → lo cubre `roblox-competitive-systems`.

## Casos de uso

1. Sistema down-but-not-out con revivir por compañero en 5 s.
2. Botín que se reparte sin que el más rápido se lo lleve todo.
3. Mazmorra que escala enemigos según 1, 2, 3 o 4 jugadores.
4. Objetivo de equipo ("activad 3 palancas a la vez") sincronizado.
5. Amigo que se une a mitad de misión sin romperla.
6. Grupo donde uno es nivel 50 y otro nivel 5, y ambos se divierten.

## Proceso paso a paso

1. **Define la fantasía cooperativa.** ¿Héroes que se rescatan, equipo
   táctico, o amigos de chill? El revivir dramatico encaja en la primera; el
   reparto estricto, en la segunda. Sin fantasía clara, los sistemas chocan.
2. **Diseña el ciclo de caída y revivir.** Estados: sano → caído (reanimable,
   tiempo límite) → fuera (espera o especta). Tiempos, distancia de revive y
   coste (vulnerabilidad del que revive) explícitos. Ejemplo ilustrativo:
   ```luau
   -- Ilustrativo: máquina de estados del caído (tiempos en segundos).
   local FASES = { Sano = 0, Caido = 1, Fuera = 2 }
   local TIEMPO_REANIMAR = 5
   local TIEMPO_SANGRADO = 30 -- caído sin ayuda -> fuera
   ```
3. **El servidor valida lo importante.** Caídas, revives, reparto y progreso
   de objetivos se resuelven en servidor con `RemoteEvent`; el cliente pide
   y anima, el servidor autoriza. Anti-exploit fino: `roblox-security`.
4. **Elige el modelo de botín.** Opciones: instanciado por jugador (cada uno
   ve el suyo, cero conflicto), reparto por turnos, o necesidad/codicia con
   votación. Para la mayoría de juegos, botín instanciado + comercio opcional
   da menos peleas que cualquier votación.
5. **Escala la dificultad con el grupo.** Fórmula explícita (p. ej. vida de
   enemigos ×(1 + 0.35 por jugador extra), sin pasar de N). Documenta la
   fórmula; la dificultad "a ojo" siempre queda rota en algún tamaño.
6. **Sincroniza objetivos en el servidor.** Progreso de equipo (palancas,
   llaves, jefes) como estado de servidor replicado a todos; el join tardío
   recibe snapshot del progreso (`roblox-state-replication`,
   `roblox-disconnect-recovery` para la vuelta).
7. **Trata niveles dispares.** Bandas de nivel por misión, escalado suave del
   débil hacia arriba (nunca capar al fuerte a la baja de forma humillante) y
   recompensas que sirvan a ambos. Sin esto, invitar a un amigo nuevo es un
   castigo.
8. **Diseña ayudas, no castigos.** Bonus por revive, combo de equipo, reanimar
   da puntos: premia cooperar en vez de penalizar no hacerlo. Los castigos
   por "no ayudar" generan toxicidad, no teamwork.
9. **Resuelve el duelo final: ¿qué pasa si todos caen?** Wipe con reintento
   desde checkpoint, nunca desde cero salvo diseño roguelike declarado.
   Checkpoint generoso = amigos que siguen jugando.
10. **Organiza con `Teams` donde encaje.** Equipos, roles y fuego amigo
    (normalmente desactivado en coop) con `Teams` y `Players`; lo social
    persistente (grupos, amigos) es de `roblox-social-systems`.
11. **Prueba con grupos reales.** Solo, dúo, trío, lleno; un veterano + un
    novato; uno que se cae a mitad del jefe. Cada combinación revela un bug
    distinto de diseño.
12. **Mide cooperación.** Revives por sesión, botín disputado (cero es la
    meta con botín instanciado), abandono a mitad de misión. Si nadie revive,
    el revive está mal diseñado, no los jugadores.

## Conocimientos técnicos

- El servidor valida lo importante: estados de caída, elegibilidad de revive
  (distancia, tiempo, interrupciones), reparto y objetivos. Todo con
  autoridad de servidor.
- Persistencia: progreso cooperativo duradero (misiones completadas,
  recompensas) por jugador con escrituras limitadas; el estado de misión en
  curso es efímero y vive en servidor, con snapshot para join tardío.
- Errores: si falla el guardado de recompensa, reintenta con backoff y no
  dupliques (idempotencia como en `roblox-disconnect-recovery`); `pcall` en
  rutas de reparto y guardado.
- `Players` y `Teams` para organización; `RemoteEvent` para propuestas y
  `RemoteFunction` solo para consultas con respuesta inmediata.
- Coordinación entre servidores solo si el diseño la exige
  (`MemoryStoreService` / `MessagingService`, cuotas: verificar en
  create.roblox.com/docs).

## Buenas prácticas

- Botín instanciado por defecto; votaciones solo si el género lo exige.
- Fórmula de escalado escrita, con tope y probada en cada tamaño.
- Revivir rápido de ejecutar y claro de leer (anillo, barra, sonido).
- Premiar la ayuda visiblemente; no castigar su ausencia.
- Wipe con checkpoint generoso, nunca restart cruel por defecto.
- Bandas de nivel para que invitar novatos no castigue.

## Errores frecuentes

1. Botín único que se lleva el más rápido → fin de la amistad.
2. Dificultad fija: trivial en grupo, imposible solo.
3. Revive tan lento o arriesgado que nadie lo usa.
4. Objetivos con progreso solo en un cliente → desync de misión.
5. Capar al veterano para "igualar" → el veterano deja de venir.
6. Wipe desde cero sin avisar → abandono masivo.
7. Cliente que decide su propio revive o su botín → exploit directo.

## Criterios de calidad y terminado

- [ ] Ciclo sano→caído→fuera con tiempos y costes documentados.
- [ ] Modelo de botín elegido e implementado sin disputas en prueba.
- [ ] Fórmula de escalado escrita y probada en cada tamaño de grupo.
- [ ] Objetivos como estado de servidor con snapshot para tardíos.
- [ ] Niveles dispares tratados (bandas o escalado suave).
- [ ] Wipe con checkpoint y ayudas que premian cooperar.
- [ ] Todo lo crítico validado en servidor; métricas de coop sanas.

## Herramientas

- `Players`, `Teams` para organización de equipo y roles.
- `RemoteEvent` / `RemoteFunction` para acciones validadas en servidor.
- `SocialService` para invitar amigos (social fino:
  `roblox-social-systems`; miembros: verificar en
  create.roblox.com/docs).
- `TeleportService`, `TeleportOptions` si la misión mueve de lugar
  (detalle: `roblox-teleport`).

## Limitaciones

- No hace replicación fina ni recovery: deriva a
  `roblox-state-replication` y `roblox-disconnect-recovery`.
- No hace social persistente ni validación fina: deriva a
  `roblox-social-systems` y `roblox-security`.
- No diseña competitivo: deriva a `roblox-competitive-systems`.
- Verifica miembros y cuotas dudosos en create.roblox.com/docs.
