---
name: roblox-disconnect-recovery
description: Diseña reconexión y recuperación de estado tras caídas. Úsala cuando necesites reconnect a la partida, guardar estado a salvo o rejoin sin perder progreso.
---

# Desconexiones y recuperación sin dramas

## Objetivo

Que una caída no sea una condena: detectar la desconexión, proteger el estado
del jugador (guardado a salvo), permitir el rejoin a la misma partida cuando
tenga sentido y dejar al resto de la partida en un estado coherente mientras
tanto.

## Alcance y límites

**Diferenciación declarada:** las skills instaladas `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems` y
`roblox-security` cubren transporte, teleport, matchmaking, social y
validación fina. Esta skill NO repite el transporte: cubre diseño de sistemas
de recovery (reconnect, estado a salvo, rejoin a partida).

Esta skill NO hace:

- Replicación momento a momento → lo cubre `roblox-state-replication`.
- Teleport base entre lugares → lo cubre `roblox-teleport`.
- Servidores privados como producto → lo cubre `roblox-private-servers`.
- Balance de reingreso en competitivo (penalizaciones, ELO) → lo cubre
  `roblox-competitive-systems`.

## Casos de uso

1. Jugador que pierde wifi 30 s y vuelve a la misma partida.
2. Caída del cliente en mitad de una mazmorra sin perder el botín ganado.
3. Rage-quit disfrazado de "desconexión": distinguirlo con honestidad.
4. Partida cooperativa que queda 3 contra 5 por dos caídos.
5. Guardado a salvo que no duplique objetos al reentrar.
6. Móvil que cambia de red y la sesión parpadea.

## Proceso paso a paso

1. **Distingue tipos de salida.** Salida limpia, timeout de red y expulsión
   son casos distintos: el primero libera recursos ya; el segundo abre
   ventana de gracia; el tercero no merece rejoin. Tratarlos igual rompe los
   tres.
2. **Define la ventana de gracia.** Tiempo durante el cual se reserva la plaza
   y el estado (p. ej. 2–5 min según modo). Sin ventana, no hay rejoin; con
   ventana infinita, las plazas se pudren.
3. **Guarda estado a salvo en el servidor.** Ante caída, el servidor
   persiste lo ganado (progreso, botín, puntuación) con escritura única
   idempotente: reejecutar el guardado no duplica nada. Ejemplo ilustrativo
   (simplificado):
   ```luau
   -- Ilustrativo: guardado idempotente con llave de sesión.
   local llave = "save:" .. userId .. ":" .. sessionId
   if not yaGuardado[llave] then
     yaGuardado[llave] = true
     guardarProgreso(userId, snapshot) -- con pcall y reintento
   end
   ```
4. **Reserva la plaza, no el universo.** Durante la gracia, la plaza queda
   marcada como "reservada para X"; pasado el plazo, se libera y el estado
   pasa a abandonado. Documenta el plazo visiblemente.
5. **Implementa el rejoin a la misma partida.** Reentrada con
   `TeleportService`/`TeleportOptions` al servidor de origen cuando siga
   vivo; si murió, rejoin al modo equivalente con el progreso a salvo
   restaurado. Prueba el caso "el servidor ya no existe".
6. **El servidor valida lo importante.** Toda restauración se verifica en
   servidor (identidad, llave de sesión, snapshot firmado por el servidor,
   nunca por el cliente). El cliente pide; el servidor autoriza o deniega.
7. **Protege al resto de la partida.** Jugador caído: su personaje se
   congela, se cede a un bot simple o se retira según el modo; jamás queda
   como saco de puntos gratis ni como pared invisible eterna.
8. **Evita el dupe del rejoin.** Inventario y moneda se reconcilian por
   snapshot de servidor con idempotencia; el cliente nunca "trae" objetos de
   vuelta. Prueba el doble rejoin rápido: es el caso que crea duplicados.
9. **Informa con honestidad.** "Conexión perdida, reintentando (plaza
   reservada 3:00)" es bueno; un spinner eterno es malo. Si la partida
   terminó, dilo y muestra el resultado guardado.
10. **Trata el parpadeo de red móvil.** Reconexiones de segundos no deben
    disparar todo el protocolo: umbral (p. ej. 10–15 s) por debajo del cual
    solo se re-sincroniza estado ligero (`roblox-state-replication`).
11. **Prueba los cinco escenarios.** Caída limpia, timeout con vuelta a
    tiempo, timeout con vuelta tarde, servidor muerto, doble rejoin rápido.
    Los cinco, no solo el feliz.
12. **Registra y mide.** Tasa de rejoin con éxito, tiempo medio de vuelta,
    dupes detectados (cero es el único número aceptable). Sin métricas, el
    recovery se pudre en silencio.

## Conocimientos técnicos

- El servidor valida lo importante: identidad, ventana de gracia vigente y
  snapshot de autoridad propia antes de restaurar nada.
- Persistencia: guardado a salvo idempotente con llave de sesión; escrituras
  limitadas y con reintento; `pcall` obligatorio en toda ruta de guardado
  porque la caída y el fallo de guardado suelen llegar juntos.
- Errores: si el guardado falla, reintenta con backoff y avisa; si el
  servidor destino murió, degrada a restaurar progreso en modo equivalente.
- `TeleportService` y `TeleportOptions` para el rejoin; `Players` para
  detectar salidas; `MemoryStoreService` / `MessagingService` para plazas
  reservadas y coordinación entre servidores (cuotas: verificar en
  create.roblox.com/docs).
- Estado ligero de re-sincronización: contrato con
  `roblox-state-replication` (snapshot al volver).

## Buenas prácticas

- Ventana de gracia explícita y visible, distinta por modo de juego.
- Idempotencia en todo guardado y restauración: el doble rejoin no duplica.
- Personaje caído con tratamiento digno (congelar, bot o retirada).
- Mensajes honestos con cuenta atrás y plan B.
- Umbral anti-parpadeo antes del protocolo completo.
- Métricas de recovery desde el día 1.

## Errores frecuentes

1. Tratar igual salida limpia, timeout y expulsión.
2. Guardado no idempotente → doble rejoin duplica objetos.
3. Restaurar estado que trae el cliente → regalo a tramposos.
4. Plaza reservada eterna → partidas que nunca se llenan.
5. Personaje caído como saco de puntos o pared eterna.
6. Sin plan B si el servidor de origen murió → jugador en limbo.
7. Parpadeo móvil que dispara el protocolo completo cada vez.

## Criterios de calidad y terminado

- [ ] Ventana de gracia definida por modo y comunicada al jugador.
- [ ] Guardado a salvo idempotente probado con doble rejoin rápido.
- [ ] Rejoin a origen funcionando y plan B si el servidor murió.
- [ ] Restauración validada en servidor; cliente sin autoridad.
- [ ] Partida coherente durante la ausencia (bot/congelar/retirar).
- [ ] Cinco escenarios de prueba superados.
- [ ] Métricas de rejoin y cero dupes verificados.

## Herramientas

- `TeleportService`, `TeleportOptions` para rejoin al servidor de origen.
- `Players` para detección de salidas y reservas de plaza.
- `MemoryStoreService`, `MessagingService` para coordinación efímera
  (cuotas: verificar en create.roblox.com/docs).
- `RemoteEvent` para mensajes de estado de recovery al cliente.

## Limitaciones

- No hace replicación fina: deriva a `roblox-state-replication`.
- No hace teleport base ni matchmaking: deriva a `roblox-teleport` y
  `roblox-teleport-matchmaking`.
- No balancea penalizaciones competitivas: deriva a
  `roblox-competitive-systems`.
- Verifica miembros y cuotas dudosos en create.roblox.com/docs.
