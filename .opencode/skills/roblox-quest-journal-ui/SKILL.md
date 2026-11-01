---
name: Diario de Misiones Roblox
description: Lista de misiones, detalle, tracking y recompensas. Úsala cuando crees quest log, seguimiento de objetivos, barras de progreso o entrega de recompensas.
---

# Diario de Misiones Roblox

## Objetivo

Convertir la lista de misiones en un plan claro: qué hago ahora, cuánto me falta y qué gano. Cubre el diario completo (lista + detalle + recompensas) y su reflejo mínimo en el HUD, con progreso siempre visible y honesto.

## Alcance y límites

Cubre: lista de misiones (activas/disponibles/completadas), panel de detalle con pasos y recompensas, tracking en HUD, barras de progreso y estados de entrega.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo de quests: lo cubre `roblox-game-ux`; esta skill implementa.
- Micro-chip de objetivo en HUD aislado: lo cubre `roblox-hud` (aquí se conecta con él).
- Tienda: lo cubre `roblox-shop-ui`.
- Diálogos con NPC: lo cubre `roblox-dialogue-ui` (aquí solo cómo la misión entra/sale del diario).

## Casos de uso

- Diario con Activas (3), Disponibles (2) y Completadas con scroll.
- Detalle "Recoge 8 cristales · 5/8" con barra y recompensa "200 oro + espada".
- Tracking en HUD "Cristales 5/8" con botón "Dejar de seguir".
- Entrega con celebración y "Recompensa reclamada".
- Misión diaria con temporizador "Se renueva en 04:12:33".

## Proceso paso a paso

1. **Define el ciclo de cada misión.** Disponible → Activa → Pasos → Entrega → Recompensa. Cada misión tiene 1-4 pasos visibles y 1 recompensa explícita. Si no cabe en 1 pantalla de detalle, divídela.
2. **Maqueta dos columnas.** Izquierda: lista con pestañas Activas/Disponibles/Completadas (`ScrollingFrame` + `UIListLayout`). Derecha: detalle (título, descripción 2 líneas, pasos con checks, barra, recompensas, botones Seguir/Abandonar/Entregar). Móvil: lista a pantalla completa, detalle como hoja con botón Atrás.
3. **Construye la lista.** Cada fila = `Frame` + `ImageLabel` icono + `TextLabel` título + `TextLabel` progreso ("5/8") + mini-barra a `Scale` + insignia de tipo (Principal/Secundaria/Diaria). La misión trackeada lleva marca visible.
4. **Detalle con pasos.** Pasos como lista de checks (`TextLabel` + "✓/·"), barra de progreso principal, recompensas con iconos y cantidades, y lore en 1-2 líneas máximo. Botones contextuales: Aceptar / Seguir / Dejar de seguir / Abandonar (con confirmación) / Entregar.
5. **Tracking en HUD.** Solo 1 misión trackeada a la vez (o 2 máximo documentadas): chip con título + progreso + distancia opcional. Cambio de trackeada con 1 clic desde el diario. El chip nunca muestra spoilers de pasos futuros.
6. **Progreso y entrega.** Barras a `Scale` con número ("5/8", "73%"), animadas con `TweenService` al avanzar. Entrega disponible con botón destacado + celebración (check + recompensas listadas). Recompensa pendiente de reclamar con punto visible hasta reclamarla.
7. **Temporizadas y diarias.** Temporizador legible ("Se renueva en 04:12") y estado expirado con mensaje claro. Nunca borres progreso sin avisar con 1 línea de consecuencia.
8. **Persistencia visible.** Aceptar/avanzar/entregar pide al servidor (verificar en create.roblox.com/docs); la UI muestra "Guardando…" si aplica y revierte ante fallo. Reentrar conserva aceptadas y progreso validado.
9. **Verifica el ciclo entero.** Acepta, trackea, avanza 3 pasos, abandona una, entrega otra, reentra. En PC y móvil, sin truncados ni solapes, con 20+ misiones en lista.

## Conocimientos técnicos

- Fila + barra (clases estables):

  ```luau
  -- Ejemplo ilustrativo: actualizar progreso de misión
  local fill = questRow:WaitForChild("ProgressFill") :: Frame
  local label = questRow:WaitForChild("ProgressLabel") :: TextLabel

  local function setProgress(current: number, goal: number)
    local t = math.clamp(current / math.max(1, goal), 0, 1)
    fill.Size = UDim2.fromScale(t, 1)
    label.Text = string.format("%d/%d", current, goal)
  end
  ```

- `ScrollingFrame` con `UIListLayout` para lista y pasos; `UIPadding`, `UICorner` 8-10, `UIStroke` por tipo (principal ámbar, secundaria gris, diaria cian).
- Tracking: la selección vive en un atributo/estado local y el HUD la lee; cambiarla es instantáneo y local (el progreso real sigue viniendo del servidor).
- `TweenService` para avance de barras y celebración de entrega (check 0.4 s + fundido de recompensas).
- Abandonar exige confirmación si hay progreso; Aceptar/Entregar con debounce para evitar doble petición.
- Textos con `UITextSizeConstraint`; descripciones con `TextWrapped` y límite de 2-3 líneas con "…" (verificar en create.roblox.com/docs para truncado exacto).

### Identidad visual de esta skill (original, no copiar)

- Dirección "cuaderno de expedición": fondo pergamino oscuro (#1B2036) con tarjetas papel (#F5EFD8) para el detalle o esquema oscuro coherente; acento brújula ámbar (#FFB84D) + verde completado (#3DDC84).
- Tipografía: título misión 18 semibold, pasos 14 regular con check, recompensas 14 negrita con icono, lore 13 itálica breve. Números de progreso tabulares.
- Composición: lista 35% / detalle 65% en PC; barras de 8-10 px con fondo tenue y relleno ámbar; recompensas en fila de chips con icono. `UIPadding` 14, gap 10.
- Espaciado: pasos con 8 px entre sí, secciones separadas 16. Botones de 48+ px en móvil.
- Estados: activa (borde ámbar), trackeada (marca + borde cian), completada (check verde + atenuada), disponible (normal), bloqueada por nivel (gris + requisito), expirada (roja tenue + mensaje).
- Animación: barra que barre al avanzar, check que aparece con escala 0.6→1, entrega con pulso único. Sin fanfarrias de 3 segundos que bloqueen.

## Buenas prácticas

- 1 misión trackeada por defecto (la principal activa); cambiar en 1 clic.
- Progreso siempre con número, no solo barra ("5/8" obligatoria).
- Recompensas visibles antes de aceptar; sin letra pequeña.
- Abandonar explica qué se pierde en 1 línea; Entregar celebra en 1 pantalla, no en 3.
- Coherencia con HUD e inventario: mismos iconos de objetos y monedas.
- Diarias/semanales agrupadas y con temporizador, no mezcladas sin etiqueta.

## Errores frecuentes

- Diario con 40 misiones sin pestañas ni tracking que nadie usa.
- Barras sin número que no dicen cuánto falta realmente.
- Spoilers del paso 5 visibles en el HUD desde el paso 1.
- Entregar sin confirmación del servidor y perder la recompensa al reentrar.
- Abandonar sin confirmación y borrar 2 horas de progreso.
- Detalle solo con `Offset` que corta la recompensa en móvil.

## Criterios de calidad y terminado

- [ ] Ciclo aceptar→trackear→avanzar→entregar probado con datos reales, incluido reentrar.
- [ ] Progreso numérico + barra en lista, detalle y HUD, coherentes entre sí.
- [ ] Trackeo único claro, cambiable en 1 clic, sin spoilers.
- [ ] Legible con 20+ misiones en PC, tablet y móvil.
- [ ] Sin duplicados ni pérdidas bajo doble clic o latencia alta.
- [ ] Celebración de entrega breve y recompensas listadas explícitamente.

## Herramientas

- Studio: Play con servidor para aceptar/entregar, simulador móvil para hoja de detalle.
- MCP Studio (si disponible): capturas lista+detalle+HUD en 3 resoluciones.
- Rojo: misiones (títulos, pasos, recompensas) como datos editables.
- Selene: lint de handlers de aceptar/trackear/entregar y debounces.

## Limitaciones

- La lógica de quests y recompensas vive en el servidor (verificar en create.roblox.com/docs); la UI solo la presenta.
- No incluye diálogos con NPC (`roblox-dialogue-ui`) ni cinemáticas.
- Temporizadores diarios/semanales dependen del reloj del servidor, no del cliente.
- Con cientos de misiones se exige paginación/búsqueda; el backend debe soportarla.
