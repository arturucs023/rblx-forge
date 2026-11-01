---
name: roblox-private-servers
description: Diseña servidores privados/VIP con acceso, configuración y moderación. Úsala cuando necesites servidores solo para amigos, reglas personalizadas, persistencia por servidor o moderación delegada.
---

# Servidores privados y VIP bien diseñados

## Objetivo

Ofrecer servidores privados que funcionen como producto: acceso y coste
claros, configuración por propietario, persistencia separada de la pública,
moderación delegada con límites, y una experiencia que no se rompa por ser
"el servidor de alguien".

## Alcance y límites

**Diferenciación declarada:** las skills instaladas `roblox-networking`,
`roblox-teleport`, `roblox-teleport-matchmaking`, `roblox-social-systems` y
`roblox-security` cubren transporte, teleport, matchmaking, social y
validación fina. Esta skill NO repite el transporte: cubre diseño de sistemas
de servidores privados (acceso, configuración, persistencia por servidor,
moderación).

Esta skill NO hace:

- Matchmaking público o ranked → lo cubren `roblox-teleport-matchmaking` y
  `roblox-competitive-systems`.
- Replicación de estado en detalle → lo cubre `roblox-state-replication`.
- Recovery tras desconexión → lo cubre `roblox-disconnect-recovery`.
- Sistemas cooperativos de gameplay → lo cubre `roblox-coop-systems`.

## Casos de uso

1. Servidor solo para amigos con invitación sencilla.
2. Propietario que configura mapa, dificultad o duración de ronda.
3. Comunidad que quiere su liga interna en su propio servidor.
4. Persistencia del servidor (récords, construcciones) separada del público.
5. Moderación delegada: el dueño expulsa troles sin ser admin global.
6. Evento privado (cumpleaños, torneo) sin intrusos.

## Proceso paso a paso

1. **Define el modelo de acceso.** Opciones: solo invitación, lista de
   permitidos, código de acceso, o enlace privado. Elige uno y documéntalo;
   mezclar tres modelos a medias es peor que uno bien hecho.
2. **Separa configuración pública de privada.** Lista qué puede cambiar el
   propietario (mapa, duración, dificultad, slots) y qué NUNCA (economía con
   valor, rates que afecten a rankings globales). Lo segundo se queda fijo
   por diseño.
3. **Diseña la creación y el ciclo de vida.** Crear → configurar → invitar →
   jugar → cerrar o hibernar. Define qué pasa con un privado vacío (se
   apaga, se hiberna, persiste) y quién paga el coste si lo hay.
4. **Implementa invitaciones robustas.** Invitar por `Players`/`SocialService`
   (verificar miembros exactos en create.roblox.com/docs); la invitación
   lleva al servidor correcto con `TeleportService`/`TeleportOptions`. Prueba
   invitar a alguien ya jugando en otro servidor.
5. **Aísla la persistencia por servidor.** Datos del privado (configuración,
   récords locales, construcciones) con clave por servidor, nunca mezclados
   con el progreso público global. Un privado no debe poder inflar el ranking
   global.
6. **El servidor valida lo importante.** Permisos de propietario, lista de
   invitados y acciones de moderación se verifican en servidor en cada
   operación, no una vez al entrar. El detalle anti-exploit es de
   `roblox-security`.
7. **Delega moderación con límites.** El propietario puede silenciar o
   expulsar de SU servidor, con registro de acciones y sin poderes globales.
   Expulsión permanente global sigue siendo decisión del equipo, no del dueño.
8. **Trata abusos del propietario.** Límites: no puede otorgar moneda,
   objetos ni ventajas transferibles al público; la configuración válida está
   en lista cerrada. Todo lo demás lo rechaza el servidor.
9. **Diseña la experiencia de intruso y de lleno.** Mensajes claros ("servidor
   privado", "servidor lleno"), y redirección amable a público o a cola en
   vez de un error seco.
10. **Coordina entre servidores donde haga falta.** Lista de privados activos,
    invitaciones pendientes o vetos: usa `MemoryStoreService` /
    `MessagingService` con sus cuotas (verificar en
    create.roblox.com/docs). No reinventes un bus casero por `DataStore`.
11. **Prueba el ciclo completo.** Crear, invitar, llenar, expulsar a alguien,
    vaciar, cerrar, reabrir: cada transición con su mensaje y su estado
    persistido correcto.
12. **Documenta reglas para propietarios.** Qué pueden, qué no, y qué pasa si
    abusan. Un privado sin reglas escritas acaba en soporte con tickets.

## Conocimientos técnicos

- El servidor valida lo importante: propiedad del servidor, invitaciones y
  cada acción de moderación o configuración se verifican en servidor contra
  datos de autoridad.
- Persistencia: dos espacios separados, claves por servidor para lo privado
  y claves por jugador para lo público; escrituras con límites y reintentos,
  nunca en cada tick. Envuelve en `pcall` y degrada (modo sin guardado con
  aviso) ante fallo.
- Errores: si falla la resolución del servidor destino al teleportar, informa
  y ofrece alternativa (reintentar, ir a público); jamás dejes al jugador en
  limbo de carga.
- `TeleportService` y `TeleportOptions` para llevar jugadores al privado
  correcto; `Players`, `Teams` y `SocialService` para audiencia e
  invitaciones.
- `MemoryStoreService` y `MessagingService` para coordinación efímera entre
  servidores; el progreso duradero va a persistencia con claves separadas.

## Buenas prácticas

- Un modelo de acceso bien hecho mejor que tres a medias.
- Lista cerrada de opciones configurables; todo lo demás fijo.
- Privado y público con economías y rankings separados.
- Moderación delegada con registro y sin poderes globales.
- Mensajes claros para intruso, lleno y servidor cerrado.
- Reglas de propietario publicadas dentro del juego.

## Errores frecuentes

1. Mezclar datos del privado con el progreso público → inflación y exploits.
2. Verificar permiso solo al entrar → escalado de privilegios en sesión.
3. Propietario con poder de otorgar ventajas transferibles → economía rota.
4. Sin mensaje para servidor lleno → el jugador cree que es un bug.
5. Invitaciones que fallan si el invitado ya está jugando.
6. Privado vacío consumiendo recursos eternamente → coste sin control.
7. Sin registro de moderación delegada → abusos imposibles de auditar.

## Criterios de calidad y terminado

- [ ] Modelo de acceso definido, implementado y documentado.
- [ ] Lista cerrada de opciones configurables; resto fijo y verificado.
- [ ] Persistencia privada aislada por servidor, sin fugas a lo público.
- [ ] Permisos y moderación verificados en servidor en cada operación.
- [ ] Casos intruso, lleno y cerrado con mensajes y redirección correctos.
- [ ] Ciclo crear→invitar→jugar→cerrar→reabrir probado entero.
- [ ] Reglas de propietario visibles en el juego.

## Herramientas

- `TeleportService`, `TeleportOptions` para acceso al servidor correcto.
- `Players`, `Teams`, `SocialService` para audiencia e invitaciones.
- `MemoryStoreService`, `MessagingService` para coordinación entre
  servidores (cuotas: verificar en create.roblox.com/docs).
- `RemoteEvent` / `RemoteFunction` para configuración y moderación
  validadas en servidor.

## Limitaciones

- No hace matchmaking público ni ranked: deriva a
  `roblox-teleport-matchmaking` y `roblox-competitive-systems`.
- No detalla replicación ni validación fina: deriva a
  `roblox-state-replication` y `roblox-security`.
- No cubre recovery: deriva a `roblox-disconnect-recovery`.
- Verifica miembros y cuotas dudosos en create.roblox.com/docs.
