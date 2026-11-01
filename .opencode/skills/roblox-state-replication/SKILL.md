---
name: roblox-state-replication
description: Diseña sincronización de estado multijugador con interpolación y anti-desync. Úsala cuando necesites decidir qué se replica, con qué frecuencia y cómo evitar teletransportes y divergencias.
---

# Sincronización de estado multijugador

## Objetivo

Definir qué estado se replica, a quién, con qué frecuencia y con qué
tratamiento en recepción (interpolación, predicción, reconciliación) para que
el juego se vea fluido y coherente sin saturar la red ni abrir puertas a
trampas.

## Alcance y límites

**Diferenciación declarada:** las skills instaladas `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems` y
`roblox-security` cubren transporte, teleport, matchmaking, social y
validación fina. Esta skill NO repite el transporte: cubre diseño de sistemas
de replicación (qué se replica, interpolación, ownership, anti-desync).

Esta skill NO hace:

- Validación anti-exploit detallada → lo cubre `roblox-security`.
- Teleport entre lugares o matchmaking → lo cubren `roblox-teleport` y
  `roblox-teleport-matchmaking`.
- Sistemas sociales o de equipo → lo cubren `roblox-social-systems` y `Teams`.
- Recuperación tras desconexión → lo cubre `roblox-disconnect-recovery`.

## Casos de uso

1. Decidir qué del personaje, enemigos y objetos se replica y qué no.
2. Movimiento fluido de otros jugadores sin teletransportes visibles.
3. Puertas, puentes y plataformas móviles iguales para todos.
4. Proyectiles rápidos que no atraviesan paredes en unas pantallas sí y en
   otras no.
5. Partida de 20 jugadores que satura la red: recortar con criterio.
6. Dos clientes que ven la puerta en distinto estado (desync clásico).

## Proceso paso a paso

1. **Clasifica el estado en tres cubos.** Crítico validado (salud, inventario,
   puntuación: solo el servidor lo escribe), visual replicado (posición,
   animación: se replica con tolerancia) y local puro (efectos, cámara: nunca
   sale del cliente). Lo que no clasifiques acabará replicándose mal.
2. **Asigna autoridad por entidad.** Jugadores: su propio movimiento con
   validación de servidor; NPCs y objetivos: servidor; objetos decorativos:
   nadie (cada cliente los simula). Sin autoridad clara hay dos escritores y
   un desync.
3. **Fija frecuencia por tipo.** Movimiento de jugadores 10–20 Hz, enemigos
   5–10 Hz, estado discreto (puerta abierta/cerrada) solo al cambiar,
   puntuación solo al cambiar. Replicar todo a 60 Hz es el error fundacional.
4. **Interpolea posiciones remotas.** Nunca apliques la posición recibida en
   crudo: interpola hacia ella con retardo de 100–200 ms. Ejemplo ilustrativo
   (simplificado):
   ```luau
   -- Ilustrativo: suavizado de posición remota en el cliente.
   local alpha = math.clamp(dt * 10, 0, 1)
   parte.CFrame = parte.CFrame:Lerp(cframeRecibido, alpha)
   ```
5. **Define ownership con criterio.** El ownership (físico o lógico) lo tiene
   quien mejor lo simula, y el servidor puede retomarlo ante abuso. Cambios
   de ownership frecuentes producen saltos: minimízalos.
6. **Los eventos discretos van por `RemoteEvent`, no por polling.** Puerta
   abierta, ronda iniciada, gol marcado: un evento fiable, no "preguntar cada
   segundo". Los `RemoteFunction` solo para preguntas con respuesta inmediata
   (p. ej. "¿puedo comprar esto?").
7. **Diseña anti-desync desde el día 1.** Número de versión o tick por
   entidad; el cliente descarta paquetes viejos; reconciliación periódica del
   servidor (snapshot cada 1–2 s para estado crítico). Sin esto, las
   divergencias crecen en silencio.
8. **El servidor valida lo importante.** Posiciones imposibles (teleport,
   velocidad absurda), acciones fuera de rango, secuencias imposibles: el
   servidor las rechaza y corrige. El detalle de validación es de
   `roblox-security`; aquí defines QUÉ se valida.
9. **Optimiza el peor caso.** 20 jugadores × 20 Hz × N entidades: calcula el
   ancho aproximado y recorta (menos frecuencia, radio de interés, compresión
   de precisión) antes de que producción te lo pida de rodillas.
10. **Trata el join tardío.** Quien entra a mitad de partida recibe snapshot
    completo del estado visible; sin snapshot, ve un mundo a medias durante
    segundos.
11. **Prueba con lag artificial.** 200 ms y 5 % de pérdida: el juego debe
    degradarse (movimiento suave pero retrasado), no romperse (teletransportes,
    estados imposibles).
12. **Documenta el contrato de replicación.** Tabla entidad → qué se replica →
    frecuencia → autoridad → tratamiento en recepción. Sin contrato, cada
    programador replica a su manera.

## Conocimientos técnicos

- El servidor valida lo importante: toda escritura de estado crítico pasa por
  el servidor; el cliente propone, el servidor dispone. Usa `RemoteEvent` para
  propuestas y eventos, `RemoteFunction` solo para consultas con respuesta.
- Persistencia: el estado de sesión viva NO se persiste en caliente salvo
  diseño explícito (ver `roblox-disconnect-recovery`); el progreso duradero
  (inventario, nivel) se guarda con límites de escritura, no en cada tick.
- Errores: envuelve en `pcall` la serialización y el envío de snapshots; un
  snapshot corrupto no debe expulsar al jugador, se reintenta o se pide
  completo de nuevo.
- `Players` y `Teams` como base de a quién replicar; `MemoryStoreService` y
  `MessagingService` para coordinación entre servidores (verificar cuotas y
  límites exactos en create.roblox.com/docs).
- `TeleportService` y `TeleportOptions` solo para mover jugadores entre
  lugares; el detalle es de `roblox-teleport`.

## Buenas prácticas

- Replica cambios, no estados completos, salvo snapshot inicial o
  reconciliación.
- Radio de interés: lo lejano se actualiza menos o no se actualiza.
- Descarta paquetes viejos por tick; nunca apliques historia.
- Un solo escritor por dato crítico; el resto son lectores.
- Frecuencias distintas por tipo de dato, revisadas con medición real.
- Contrato de replicación escrito y versionado.

## Errores frecuentes

1. Replicar todo a la misma frecuencia alta → saturación.
2. Aplicar posiciones en crudo → teletransportes y tembleque.
3. Dos escritores para el mismo dato → desync permanente.
4. Sin snapshot de join tardío → mundo a medias al entrar.
5. Confiar posiciones o acciones del cliente sin validación → trampas.
6. `RemoteFunction` para todo → bloqueos y timeouts en cascada.
7. No probar con lag → el primer jugador con mala conexión rompe la partida.

## Criterios de calidad y terminado

- [ ] Estado clasificado (crítico / visual / local) y documentado.
- [ ] Autoridad asignada por entidad sin escritores dobles.
- [ ] Frecuencias por tipo definidas y medidas en el peor caso.
- [ ] Interpolación de remotos sin teletransportes visibles.
- [ ] Eventos discretos por `RemoteEvent`, snapshot para join tardío.
- [ ] Validaciones de servidor para posiciones y acciones imposibles.
- [ ] Prueba con lag artificial superada sin roturas.

## Herramientas

- `RemoteEvent` y `RemoteFunction` como transporte de diseño.
- `Players`, `Teams` para audiencia y organización.
- `MemoryStoreService`, `MessagingService` para coordinación entre
  servidores (cuotas: verificar en create.roblox.com/docs).
- `TeleportService`, `TeleportOptions` para cambios de lugar
  (detalle: `roblox-teleport`).

## Limitaciones

- No implementa validación anti-exploit fina: deriva a `roblox-security`.
- No hace teleport, matchmaking ni social: deriva a `roblox-teleport`,
  `roblox-teleport-matchmaking` y `roblox-social-systems`.
- No cubre recovery tras caída: deriva a `roblox-disconnect-recovery`.
- Verifica cuotas y miembros dudosos en create.roblox.com/docs.
