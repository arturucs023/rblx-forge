---
name: HUD en Partida Roblox
description: HUD de salud, recursos, objetivos y elementos contextuales. Úsala cuando crees la interfaz en partida, barras de vida, objetivos, minimapa o priorización de información sin tapar el juego.
---

# HUD en Partida Roblox

## Objetivo

Mostrar solo la información necesaria para jugar bien, en el lugar correcto y sin tapar la acción. Un buen HUD se lee de un vistazo, jerarquiza (supervivencia > recursos > objetivos > adorno) y desaparece o se atenúa cuando no aporta.

## Alcance y límites

Cubre: salud/vida, recursos (moneda, energía, munición), objetivos y tracking, elementos contextuales (minimapa/HUD de zona, prompts cercanos), prioridad de información y reglas de no-oclusión.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- Inventario y equipamiento detallado: lo cubre `roblox-inventory-ui`.
- Diario de misiones completo: lo cubre `roblox-quest-journal-ui`; aquí solo el micro-tracking.
- Notificaciones y toasts globales: lo cubre `roblox-notifications-ui`.
- HUD de conducción o mascotas: lo cubren `roblox-vehicle-ui` y `roblox-pets-ui`.

## Casos de uso

- Barra de salud + escudo con daño reciente destacado.
- Contador de monedas/energía que parpadea al cambiar.
- Objetivo actual "Captura la zona B · 0:42" siempre visible.
- Minimapa circular en esquina con puntos de interés.
- Prompt contextual "Mantén E para abrir" que aparece solo cerca del objeto.

## Proceso paso a paso

1. **Prioriza la información.** Lista todo lo que quieres mostrar y ordénalo: 1) supervivencia, 2) recurso crítico, 3) objetivo, 4) resto. Lo que no entre en 4 bloques va a subpantallas, no al HUD.
2. **Zonifica la pantalla.** Salud abajo-izquierda o abajo-centro, recursos arriba-derecha o junto a salud, objetivo arriba-centro compacto, minimapa arriba-derecha (o arriba-izquierda en móvil si el pulgar lo tapa). Reserva el centro para el juego.
3. **Construye la base.** `ScreenGui` en `PlayerGui` → `Frame`s anclados por esquinas con `Scale`: `HealthBar` (`Frame` fondo + `Frame` relleno), `ResourceRow` (`TextLabel` + `ImageLabel` icono), `ObjectiveChip` (`TextLabel` 1 línea), minimapa como `Frame` circular con `UICorner` 1,0.
4. **Implementa barras con cambio legible.** Relleno a `Scale` según valor, cambio de color por umbral (verde >50%, ámbar 25-50%, rojo <25%), animación corta con `TweenService` al recibir daño/curar. Número opcional pequeño al lado.
5. **Añade el objetivo persistente.** Un chip de 1-2 líneas máximo con verbo + destino + tiempo/distancia. Al completarse, animación de check de 1 s y reemplazo por el siguiente. El detalle vive en el diario (`roblox-quest-journal-ui`).
6. **Contextualiza.** Prompts de `ProximityPrompt` y avisos de zona aparecen/desaparecen por distancia o estado; nunca fijos. Usa fundidos de 0.2 s, no apariciones bruscas.
7. **Minimapa sobrio (si aporta).** Solo si el juego es espacial: marco circular, norte o rotación fija documentada, puntos con 3 formas/colores máximo + leyenda mínima. Si el mapa es lineal, sustitúyelo por brújula o flecha de objetivo.
8. **Adapta a móvil.** Elementos 20-30% más grandes, anclas que evitan pulgares (abajo-esquinas libres para joystick/botones), `UISizeConstraint` mínimos. El HUD nunca tapa los botones táctiles (ver `roblox-mobile-touch-ui`).
9. **Prueba en acción real.** Juega 5 minutos por plataforma: ¿lees la salud sin mirar fijo? ¿el objetivo se entiende? ¿algo tapa enemigos o trampas? Ajusta opacidad y escala hasta que la respuesta sea sí.

## Conocimientos técnicos

- Patrón de barra (clases estables):

  ```luau
  -- Ejemplo ilustrativo: actualizar barra de salud
  local bar = script.Parent:WaitForChild("HealthFill") :: Frame

  local function setHealth(current: number, max: number)
    local t = math.clamp(current / math.max(1, max), 0, 1)
    bar.Size = UDim2.fromScale(t, 1)
    -- El color por umbral y el tween se aplican aquí.
  end
  ```

- Todo posicionado con `UDim2.fromScale` + `AnchorPoint`; `UIAspectRatioConstraint` para el minimapa circular; `UITextSizeConstraint` para que los números no rompan.
- Actualizaciones: la UI pinta valores que le pasa el juego; no calcula daño ni economía. Frecuencia moderada (eventos, no cada frame salvo barras con tween).
- `TweenService` para daño (flash rojo breve), curación (subida suave) y cambios de recurso (pulso). Duraciones 0.15-0.3 s.
- `ProximityPrompt` para interacción cercana: configura su texto y distancia en el objeto 3D; el HUD solo refleja el estado, no lo sustituye.
- `StarterGui`/`PlayerGui`: el HUD vive en `PlayerGui` con `ResetOnSpawn` según respawn del proyecto; tras morir debe reconstruirse sin duplicarse.

### Identidad visual de esta skill (original, no copiar)

- Dirección "táctica ligera": sin paneles pesados; pastillas semitransparentes (#0E1420 a 35-55%) con texto blanco puro y acento verde salud (#3DDC84) / rojo daño (#FF5A5A) / ámbar recurso (#FFC53D).
- Tipografía: números 18-22 semibold monoespaciados o tabulares si hay; etiquetas 12-13 mayúsculas con tracking amplio. Nada decorativo.
- Composición: esquinas ocupadas, centro libre; salud como barra horizontal 220-280 px equivalentes; objetivo como chip centrado de 1 línea; minimapa 140-180 circular con `UIStroke` fino.
- Espaciado: margen seguro 3-4% desde bordes, `UIPadding` 8-10 en chips, `UICorner` 8-10 (pastillas) y circular en minimapa.
- Estados: normal atenuado, alerta (salud baja) con borde rojo + pulso lento, cambio con flash de 0.2 s, oculto con fundido cuando no aplica (ej. sin objetivo).
- Animación: solo micro-feedback (daño, pickups, check de objetivo). Prohibidos loops llamativos durante combate.

## Buenas prácticas

- Menos es más: si un dato no cambia decisiones en 10 segundos, fuera del HUD.
- Contraste mínimo AA sobre fondos variables: sombra o pastilla detrás de cada texto.
- Un solo estilo de barra y un solo estilo de chip en todo el juego.
- El HUD informa, no decora: sin ilustraciones grandes ni marcos ornamentales.
- Coherencia con menús: misma familia tipográfica y mismos iconos que el resto.
- Accesibilidad: no comuniques solo con color (añade icono o texto al estado crítico).

## Errores frecuentes

- HUD que tapa el centro y esconde enemigos, trampas o salidas.
- 8 contadores a la vez que nadie mira y todos consumen rendimiento.
- Barras con `Offset` fijo que se salen en móvil o se hacen minúsculas en 4K.
- Actualizar textos cada frame y provocar GC spikes o flicker.
- Minimapa que rota sin avisar y desorienta, o con 10 iconos indistinguibles.
- Confiar en el HUD para validar: el cliente pinta, el servidor decide.

## Criterios de calidad y terminado

- [ ] La información crítica se lee en <1 s a distancia normal de juego.
- [ ] Nada tapa la acción central en las 3 resoluciones de referencia.
- [ ] Estados normal/alerta/cambio/oculto definidos y probados.
- [ ] 60 fps estables con el HUD activo en PC y sin caídas atribuibles en móvil.
- [ ] Tras muerte/respawn el HUD se reconstruye sin duplicados ni valores viejos.
- [ ] Jugadores daltónicos o con poca visión distinguen el estado crítico sin depender solo del color.

## Herramientas

- Studio: Play real de 5 minutos por plataforma, Profiler para coste de actualización.
- MCP Studio (si disponible): capturas sobre gameplay con enemies/obstáculos para comprobar oclusión.
- Rojo: configuración de umbrales y textos como datos editables.
- Selene: lint de los scripts de actualización de barras y chips.

## Limitaciones

- No incluye menús completos (pausa, ajustes, inventario, diario): cada uno tiene su skill.
- Minimapa aquí es representación simplificada; un mapa grande interactivo es otra pantalla (verificar en create.roblox.com/docs si usas `ViewportFrame` avanzado).
- No hace balance de juego: si el jugador necesita 10 datos para decidir, el problema es del diseño, no del HUD.
- El HUD nunca es autoridad anti-exploit; solo refleja el estado validado por el servidor.
