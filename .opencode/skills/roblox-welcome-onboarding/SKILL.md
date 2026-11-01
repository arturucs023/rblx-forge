---
name: Bienvenida y Onboarding Roblox
description: Pantallas de bienvenida, onboarding y tutorial inicial. Úsala cuando crees la primera sesión, tutoriales interactivos, pantallas de descubrimiento o flujo de skip.
---

# Bienvenida y Onboarding Roblox

## Objetivo

Construir la primera sesión del jugador: pantalla de bienvenida, secuencia de descubrimiento de controles y objetivos, y transición suave a la partida. El objetivo es que un jugador nuevo entienda qué hacer en menos de 90 segundos sin leer manuales, y que un jugador recurrente pueda saltar todo en un clic.

## Alcance y límites

Cubre: portada de bienvenida, pasos de onboarding (2-5 pasos), tutorial interactivo inicial (mover, interactuar, objetivo), botón de skip, persistencia de "ya vio el onboarding" y telemetría de abandono por paso.

NO hace:

- Mecánica genérica responsiva (layouts, constraints, stylesheets): lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo o investigación de retención: lo cubre `roblox-game-ux`; esta skill implementa.
- Menú principal completo con modos y noticias: lo cubre `roblox-main-menu`.
- HUD persistente en partida: lo cubre `roblox-hud`.
- Ajustes de accesibilidad editables: lo cubre `roblox-settings-ui`.

## Casos de uso

- Portada "¡Bienvenido!" con botón Jugar y botón "Cómo jugar".
- Secuencia de 3 tarjetas: moverse, interactuar, objetivo del juego.
- Tutorial interactivo: "pulsa W para moverte hasta la zona marcada" con validación.
- Jugador recurrente que entra y ve solo un banner resumido con opción de replay.
- Medición de en qué paso abandonan los nuevos para iterar.

## Proceso paso a paso

1. **Define el resultado de aprendizaje.** Escribe 3 frases máximo que el jugador debe saber al terminar (ej. "me muevo", "interactúo", "gano haciendo X"). Si necesitas más de 3, recorta el juego, no el onboarding.
2. **Estructura la secuencia.** Portada (1 pantalla) + 2-4 pasos + confirmación final. Cada paso = 1 idea, 1 ilustración o zona demo, 1 acción. Dibuja el flujo en papel antes de tocar Studio.
3. **Construye la portada.** `ScreenGui` en `PlayerGui` con `Frame` contenedor a `Scale`, título `TextLabel`, subtítulo, `TextButton` principal "Jugar" y secundario "Cómo jugar" + `TextButton` discreto "Saltar". Fondo `ImageLabel` o `Frame` con degradado propio.
4. **Construye el paso a paso.** Un `Frame` carrusel con indicador de progreso (ej. "1/3" + barra `Frame`). Botones Atrás/Siguiente/Saltar. Cada paso muestra `ImageLabel` ilustrativa + `TextLabel` de 1-2 líneas + demostración (ej. resalta la tecla).
5. **Añade el tutorial interactivo (opcional pero recomendado).** En vez de solo leer, pide una acción real: "camina hasta el círculo" o "pulsa E". Escucha el input con `UserInputService` o la zona con validación del lado servidor (verificar en create.roblox.com/docs). Avanza solo cuando se completa o tras timeout con opción de skip.
6. **Implementa skip y persistencia.** El botón Saltar cierra todo y marca `LocalPlayer` como atendido en almacenamiento local o atributo; al reentrar, muestra versión compacta. El skip nunca debe penalizar ni bloquear recompensas base.
7. **Añade transiciones.** Entrada/salida con `TweenService` (desvanecido `CanvasGroup` o `GroupTransparency`, desplazamiento leve). Duración 0.25-0.4 s. Sin transiciones no hay sensación de pulido.
8. **Instrumenta abandono.** Registra evento por paso visto/completado/abandonado (sistema de analítica del proyecto; verificar en create.roblox.com/docs). Revisa semanalmente qué paso pierde más gente y simplifícalo primero.
9. **Verifica en PC y móvil.** Mismo flujo con tamaños `Scale`, botones de mínimo 44 px equivalentes, texto legible a 1 m de distancia simulada. Prueba con cuenta nueva y con cuenta que ya lo completó.

## Conocimientos técnicos

- Jerarquía recomendada (solo clases estables):

  ```luau
  -- Ejemplo ilustrativo: estructura de pantallas de onboarding
  local Players = game:GetService("Players")
  local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")

  local gui = Instance.new("ScreenGui")
  gui.Name = "OnboardingGui"
  gui.ResetOnSpawn = false
  gui.Parent = playerGui

  local root = Instance.new("Frame")
  root.Name = "Root"
  root.Size = UDim2.fromScale(1, 1)
  root.BackgroundTransparency = 1
  root.Parent = gui
  ```

- Tamaños siempre con `UDim2.fromScale` y `UIAspectRatioConstraint` / `UISizeConstraint` para mínimos y máximos. Nunca posiciones fijas solo con `Offset`.
- Progreso con `UIListLayout` horizontal para los puntos y `Frame` barra; texto de paso con `UITextSizeConstraint` para no romper en pantallas pequeñas.
- Tutorial interactivo: combina UI local (`UserInputService.InputBegan`) con validación de autoridad en servidor (verificar en create.roblox.com/docs). La UI nunca decide sola que el jugador "ganó".
- `GuiService` para peeking de estados de menú del sistema si necesitas evitar solapamientos (solo lectura).
- Persistencia de "onboarding visto": atributo del jugador o almacenamiento local/persistente según el proyecto (verificar en create.roblox.com/docs). No uses `DataStore` directamente desde el cliente.

### Identidad visual de esta skill (original, no copiar)

- Dirección de arte "amanecer de aventura": fondo azul noche profundo (#141B33) con acento cálido ámbar (#FFB84D) y secundario turquesa (#4DE3C2). Contraste alto.
- Tipografía: título grande en negrita (32-44 pt equivalentes con `UITextSizeConstraint`), cuerpo 16-18, interlineado generoso. Sin serifas decorativas.
- Composición: portada centrada con ilustración arriba (40% alto), título, 1 línea de promesa, botón primario grande abajo. Pasos en tarjeta centrada del 60% ancho en PC, 90% en móvil.
- Espaciado: `UIPadding` de 16-24 px equivalentes, `UICorner` de 12-16, `UIStroke` sutil de 1 px en tarjetas.
- Estados: primario ámbar con hover +8% brillo, pressed escala 0.97, disabled gris 50% transparencia, loading con puntos animados, feedback con check turquesa + `TweenService`.
- Animación: fundido + subida de 12 px al entrar cada paso; celebración final con pulso único. Nada que parpadee más de 1 vez/segundo.

## Buenas prácticas

- Una idea por paso. Si un paso necesita scroll, divídelo.
- Botón Saltar siempre visible y con la misma jerarquía secundaria en todos los pasos.
- Texto de 1-2 líneas por paso, verbo de acción al inicio ("Camina", "Pulsa", "Recoge").
- Ilustra con la estética real del juego, no con iconos genéricos que luego no se reconocen.
- La recompensa por completar el onboarding (si existe) se anuncia al final, no al inicio, para no condicionar el skip.
- Coherencia con el menú y el HUD: mismos radios de esquina, misma familia tipográfica, mismo tono de botones.

## Errores frecuentes

- Muro de texto de 5 párrafos que nadie lee en móvil.
- Tutorial no skipeable o que castiga con pérdida de recompensa por saltar.
- Posiciones solo con `Offset` que se rompen en tablet y teléfono.
- Validar el tutorial solo en cliente: el explotador lo salta y reclama recompensa (toda recompensa se valida en servidor).
- 7+ pasos que miden abandono del 60% en el paso 4 y nadie los recorta.
- Tapar los controles táctiles con la tarjeta del tutorial en móvil.

## Criterios de calidad y terminado

- [ ] Jugador nuevo entiende el objetivo sin ayuda externa en prueba con 3 usuarios.
- [ ] Skip funciona desde cualquier paso y deja al jugador en estado jugable.
- [ ] Sin errores en consola, transiciones a 60 fps en PC y sin tirones visibles en móvil gama media.
- [ ] Texto legible en 1366x768, 1920x1080 y teléfono vertical 390x844 (simulador Studio).
- [ ] Telemetría registra visto/completado/abandono por paso.
- [ ] Reentrar con onboarding completado muestra versión compacta, no repite la larga.

## Herramientas

- Studio: ScreenGui editor, simulador de dispositivos, modo Play solo + Play con servidor para validar persistencia.
- MCP Studio (si disponible): captura de las 3 resoluciones, lectura de `Output`, localización de la `ScreenGui`.
- Rojo: la UI vive en módulos compartidos versionados; el flujo de pasos como tabla de datos editable.
- Selene/luau-lsp: chequeo de scripts locales del carrusel y del listener de `UserInputService`.

## Limitaciones

- No sustituye el balance del juego: si el juego es confuso, el onboarding no lo salva.
- La telemetría aquí es conteo de pasos, no analítica avanzada de retención (eso es `roblox-analytics-liveops`, verificar en create.roblox.com/docs).
- No gestiona localización multi-idioma completa; deja `TextLabel` con claves y espacio extra del 30% para traducciones largas.
- En consola la navegación por mando requiere orden de selección explícito; prueba con gamepad real antes de publicar.
