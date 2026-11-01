---
name: Lobby de Mapas y Salas Roblox
description: Selector de mapas/modos, salas, filtros y matchmaking visible. Úsala cuando crees lobby, lista de servidores, crear/unirse a sala, party o estados de cola.
---

# Lobby de Mapas y Salas Roblox

## Objetivo

Llevar al jugador del "quiero jugar" al "estoy jugando con gente" sin confusión: ver mapas y modos, filtrar salas, crear o unirse en pocos clics, gestionar party y entender siempre el estado del matchmaking (buscando, lleno, error).

## Alcance y límites

Cubre: selector de mapas/modos, listado de salas con filtros, crear/unirse, panel de party, estados de cola y temporizadores, y mensajes de error accionables.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- Menú principal de título y noticias: lo cubre `roblox-main-menu`.
- Selector de personaje/clase: lo cubre `roblox-character-selector`.
- HUD en partida: lo cubre `roblox-hud`.
- El matchmaking del servidor en sí (lógica de emparejar): la UI lo refleja; la lógica vive en el servidor (verificar en create.roblox.com/docs).

## Casos de uso

- Grid de mapas (Bosque, Desierto, Volcán) + modos (Casual, Ranked) con conteo.
- Lista de salas: nombre, mapa, jugadores 6/10, ping, botón Unirse.
- Crear sala con nombre, mapa, privacidad y máximo de jugadores.
- Party de 3 amigos con líder, invitaciones y "Buscar partida juntos".
- Cola con "Buscando… 0:23 · Cancelar" y error "Sala llena, prueba otra".

## Proceso paso a paso

1. **Define el flujo canónico.** Mapa → Modo → Sala (unirse/crear) → Party → Cola → Entrada. Dibuja los 5 estados y qué ve el jugador en cada uno; sin este mapa el lobby acumula pantallas muertas.
2. **Maqueta en dos zonas.** Izquierda: mapas/modos (`UIGridLayout` de cards). Derecha: salas (`ScrollingFrame` + `UIListLayout`) + filtros arriba + panel party abajo. Móvil: pestañas Mapas/Salas/Party con una visible a la vez.
3. **Construye cards de mapa/modo.** `Frame` + `ImageLabel` miniatura + `TextLabel` nombre + meta (jugadores, duración) + estado (Disponible/Lleno/Próximamente). Selección con `UIStroke`; solo una selección activa por eje (mapa + modo).
4. **Lista de salas con filtros.** Filtros: mapa, modo, "solo con hueco", "amigos primero", ordenar por jugadores/ping. Cada fila: nombre, 6/10 con barra a `Scale`, ping con color, botón Unirse. Vacío con mensaje útil ("Sin salas con hueco en Bosque. Crea una.").
5. **Crear sala.** Modal con nombre (límite visible), mapa, modo, privacidad (Pública/Amigos/Privada), máximo. Valida en cliente (nombre no vacío) y en servidor (verificar en create.roblox.com/docs). Al crear, el creador entra como líder.
6. **Party.** Panel con slots de miembros (`ImageLabel` avatar + `TextLabel` nombre + estado listo), botones Invitar/Expulsar (solo líder)/Abandonar, y "Listo" por miembro. La party viaja junta a la cola; si uno no está listo, la UI lo dice con nombre, no con error genérico.
7. **Cola y entrada.** Estado "Buscando…" con temporizador, posición si existe, y Cancelar siempre disponible. Al encontrar: cuenta atrás 5-4-3-2-1 con botón "¡Vamos!" y manejo de quien no acepta. Transición con fundido vía `TweenService`.
8. **Errores honestos.** Sala llena, sala cerrada, pérdida de conexión, expulsión: cada uno con causa + acción (Reintentar / Otra sala / Crear). Sin "Error desconocido" sin siguiente paso.
9. **Verifica con multicliente.** Prueba con 2-3 clientes Studio: llenar sala, echar al líder, cancelar cola, perder conexión. Y en las 3 resoluciones sin solapes.

## Conocimientos técnicos

- Fila de sala (clases estables):

  ```luau
  -- Ejemplo ilustrativo: pintar una fila de sala
  local row = Instance.new("Frame")
  row.Name = "RoomRow"
  row.Size = UDim2.fromScale(1, 0.12)
  row.Parent = roomList

  local joinButton = Instance.new("TextButton")
  joinButton.Name = "JoinButton"
  joinButton.Text = "Unirse · 6/10"
  joinButton.Size = UDim2.fromScale(0.26, 1)
  joinButton.Position = UDim2.fromScale(0.74, 0)
  joinButton.Parent = row
  ```

- Listas con `ScrollingFrame` + `UIListLayout` + `UIPadding`; barras de ocupación a `Scale`; `UITextSizeConstraint` para nombres largos (trunca con "…" + tooltip completo).
- La UI nunca decide el emparejamiento: pide unirse/crear/buscar y pinta la respuesta del servidor (verificar en create.roblox.com/docs para APIs de teleport/salas del proyecto).
- `TweenService` para entrada de listas y cuenta atrás; temporizadores con cancelación limpia (si sale de la cola, el temporizador muere, sin callbacks huérfanos).
- `UserInputService` solo para atajos (Esc cierra modal, Enter confirma crear si el foco está en el nombre). Nada crítico solo por teclado.
- Refresco: intervalo moderado o empuje del servidor; evita pedir la lista cada frame. Define "última actualización hace X s" visible si los datos pueden caducar.

### Identidad visual de esta skill (original, no copiar)

- Dirección "tablero operativo": fondo azul petróleo (#0F1B2D), cards de mapa con foto grande y franja inferior, salas en filas claras sobre fondo oscuro, acento verde disponible (#3DDC84) / ámbar espera (#FFC53D) / rojo lleno (#FF5A5A).
- Tipografía: mapa 17 semibold, sala 14 regular, meta 12 gris tabular para 6/10 y ping. Temporizador de cola 28 semibold centrado.
- Composición: rejilla 2:3 (mapas:salas) en PC; pestañas en móvil. `UIPadding` 14, `UICorner` 10, `UIStroke` 1 px en card seleccionada.
- Espaciado: gap 10 en listas, 16 entre zonas. Filas de sala de 64-72 px equivalentes para táctil.
- Estados: disponible (borde verde tenue), lleno (atenuado + etiqueta), seleccionado (borde acento 2 px), buscando (spinner + tiempo), error (banda roja 1 línea + acción).
- Animación: aparición escalonada de salas, pulso lento en "Buscando", cuenta atrás con escala 1.1→1 por segundo. Sin parpadeos agresivos.

## Buenas prácticas

- Unirse en ≤3 clics desde que se elige mapa; Crear en 1 modal, no en 4 pantallas.
- Filtros persistentes entre visitas; botón "Limpiar filtros" visible cuando filtran a cero.
- Nombres de sala con límite y moderación: advierte de texto visible para todos (filtrado de texto del proyecto; verificar en create.roblox.com/docs).
- Party con líder claro y permisos visibles (quién puede invitar/expulsar).
- Coherencia con menú y selector de personaje: mismas cards, mismos botones, mismos estados.
- Sin cifras inventadas: conteos y pings solo desde datos reales o se ocultan.

## Errores frecuentes

- Dejar Unirse activo en sala llena y fallar en silencio o con error genérico.
- Cola sin Cancelar que atrapa al jugador 2 minutos.
- Party que se rompe al entrar y deja a un amigo fuera sin mensaje.
- Lista que se refresca cada segundo y hace scroll saltar o duplica filas.
- Filtros solo con `Offset` que se solapan en móvil.
- Confiar en la UI para aforo o privacidad: el servidor revalida cada unión.

## Criterios de calidad y terminado

- [ ] Unirse/crear/cancelar funcionan con 2-3 clientes simultáneos sin estados rotos.
- [ ] Estados buscando/lleno/error/cuenta-atrás definidos y probados.
- [ ] Filtros útiles: con 30 salas se encuentra hueco en <15 s.
- [ ] Legible en PC, tablet y móvil sin solapes; táctil ≥48 px por acción.
- [ ] Sin errores en consola ni callbacks huérfanos al cancelar.
- [ ] Textos originales y moderación de nombres documentada.

## Herramientas

- Studio: Play con varios clientes, simulador móvil, `Output` para uniones fallidas.
- MCP Studio (si disponible): capturas de mapas/salas/party en 3 resoluciones.
- Rojo: mapas, modos y textos del lobby como datos editables.
- Selene: lint de handlers de unirse/crear/cancelar y de temporizadores.

## Limitaciones

- El emparejamiento, aforo y privacidad reales los impone el servidor (verificar en create.roblox.com/docs); la UI solo los refleja.
- Pings y conteos dependen del backend del proyecto; sin backend solo hay datos de ejemplo.
- Nombres y chat de sala sujetos a filtrado de texto (verificar en create.roblox.com/docs).
- El rendimiento con cientos de salas exige paginación; esta skill la prevé pero el backend debe soportarla.
