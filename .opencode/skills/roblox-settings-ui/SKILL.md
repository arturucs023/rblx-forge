---
name: Ajustes Roblox
description: Panel de gráficos, audio, controles rebind y accesibilidad. Úsala cuando crees opciones, reasignación de teclas, sliders de volumen, presets o persistencia local de ajustes.
---

# Ajustes Roblox

## Objetivo

Permitir que cada jugador adapte el juego a su dispositivo y capacidades en menos de un minuto: gráficos que rinden, audio cómodo, controles a su mano y opciones de accesibilidad reales. Todo cambio se previsualiza al instante y persiste entre sesiones.

## Alcance y límites

Cubre: pestañas de Gráficos/Audio/Controles/Accesibilidad, sliders/toggles/dropdowns, rebind de teclas, presets (Rendimiento/Equilibrado/Calidad), persistencia local y botón Restablecer.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- Ajustes rápidos de la pausa: los cubre `roblox-pause-menu` (este panel es el completo).
- HUD o menús como tales: `roblox-hud`, `roblox-main-menu`.
- Optimización del rendimiento del juego en sí (eso es rendimiento; aquí solo la UI que lo expone).

## Casos de uso

- Pestaña Gráficos con preset + distancia de dibujado + sombras on/off.
- Sliders de volumen Maestro/Música/Efectos con prueba de sonido.
- Rebind de "Esquivar" de Q a E con detección de conflicto.
- Modo daltónico, tamaño de subtítulos y reducir sacudida de cámara.
- "Restablecer valores" con confirmación y efecto inmediato.

## Proceso paso a paso

1. **Inventaria los ajustes reales.** Solo expón lo que el juego respeta de verdad (si no hay calidad de sombras configurable, no la muestres). Agrupa en 4 pestañas máximo.
2. **Maqueta el panel.** `ScreenGui` → tarjeta centrada (640-760 px equivalentes máx., 92% en móvil) → barra de pestañas (`TextButton`s) + contenido (`ScrollingFrame` + `UIListLayout`) + pie (Restablecer/Cerrar). Cada fila: etiqueta + control + valor.
3. **Implementa controles con primitivas estables.** Toggle = `TextButton` con pill (`Frame` + `UICorner` redondo) que cambia de color/posición. Slider = `Frame` pista + `Frame` relleno a `Scale` + `TextButton` invisible amplio para arrastrar. Dropdown = `TextButton` + lista desplegable de `TextButton`s.
4. **Rebind de teclas.** Botón "Pulsa una tecla…" que escucha `UserInputService.InputBegan`, valida (no reservadas del sistema, sin duplicados; si hay conflicto pregunta "¿Intercambiar?"), guarda y muestra el nombre legible. Siempre ofrece "Restablecer controles".
5. **Presets de gráficos.** Tres `TextButton`s que fijan combinaciones conocidas y marcan la pestaña como "Personalizado" si el usuario toca algo. El preset se aplica sin reiniciar.
6. **Accesibilidad de verdad.** Tamaño de texto UI (Pequeño/Normal/Grande vía `UIScale`), reducir movimiento/sacudida (toggle que el juego respeta), modo daltónico (paleta alternativa + formas, nunca solo color), subtítulos de diálogos importantes.
7. **Persistencia local.** Guarda en almacenamiento local del jugador o atributos/configuración persistente del proyecto (verificar en create.roblox.com/docs); carga al iniciar antes de pintar la primera pantalla. Sin guardado, los ajustes son decoración.
8. **Feedback inmediato.** Cada cambio se aplica al mover el slider/soltar el toggle, con valor visible ("70%") y botón Probar donde aplique (audio). Nada de "Aplicar" global salvo Restablecer.
9. **Verifica en los extremos.** Pantalla pequeña + texto Grande + preset Rendimiento debe seguir usable; gamepad + táctil deben operar todo el panel sin ratón.

## Conocimientos técnicos

- Fila de ajuste (clases estables):

  ```luau
  -- Ejemplo ilustrativo: fila con toggle
  local row = Instance.new("Frame")
  row.Name = "Row_Shadows"
  row.Size = UDim2.fromScale(1, 0)
  row.AutomaticSize = Enum.AutomaticSize.Y
  row.Parent = content

  local toggle = Instance.new("TextButton")
  toggle.Name = "Toggle"
  toggle.Text = "Activado"
  toggle.Size = UDim2.fromScale(0.28, 0)
  toggle.Parent = row
  ```

- Tamaños de fila con `AutomaticSize.Y` + `UIListLayout` (verificar en create.roblox.com/docs para el enum exacto) o alturas fijas a `Scale`; texto con `UITextSizeConstraint`; `UIPadding` generoso para táctil.
- `UserInputService` para captura de rebind; filtra `gameProcessedEvent` para no capturar teclas del sistema/chat.
- `UIScale` en la raíz para el ajuste de tamaño de texto/UI sin reescribir cada fuente.
- Calidad gráfica real del motor (verificar en create.roblox.com/docs); la UI solo expone lo que el proyecto soporta y documenta el rango de cada slider.
- Volumen: la UI guarda 0-100 y el juego lo mapea a su mezcla; incluye botón de prueba por familia.

### Identidad visual de esta skill (original, no copiar)

- Dirección "laboratorio clínico": fondo claro-ordenado sobre tarjeta blanca-humo (#F2F4F8) con texto grafito (#1A2133) en panel claro, o tarjeta grafito sobre fondo oscuro según el juego; acento índigo (#5B6CFF) para activos.
- Tipografía: etiquetas 15 semibold, valores 14 tabular a la derecha, descripciones 12 gris. Alineación estricta etiqueta-izquierda / control-derecha.
- Composición: 4 pestañas con iconos textuales simples, 6-9 filas visibles sin scroll en PC, scroll suave en móvil. `UIPadding` 16, gap 8, `UICorner` 10.
- Espaciado: filas de 52-60 px equivalentes (táctil cómodo), sliders con área de toque 3x la pista visible.
- Estados: toggle on índigo con píldora a la derecha / off gris, hover +brillo, pressed 0.97, disabled 50%, slider con valor en vivo, rebind en "escuchando" con borde pulsante lento.
- Animación: transiciones de pestaña con fundido 0.15 s; toggles con deslizamiento 0.15 s vía `TweenService`. Nada más: es herramienta, no espectáculo.

## Buenas prácticas

- Cada ajuste muestra su valor actual ("Alta", "70%", "E"). Sin valores ciegos.
- Restablecer pide confirmación y anuncia qué se restablece.
- Los presets nombran el compromiso ("Rendimiento: menos detalle, más FPS").
- Rebind con nombres legibles ("Espacio", no "Enum.KeyCode.Space").
- Coherencia con la pausa: los ajustes rápidos y este panel comparten nombres y rangos.
- Textos cortos; la ayuda larga va a tooltip o a una línea secundaria, no al título.

## Errores frecuentes

- Mostrar ajustes que el juego ignora (sombras que no cambian nada).
- Rebind que permite pisar teclas del sistema o del chat y rompe el juego.
- Guardar solo en memoria y perder todo al reentrar.
- Sliders con área de toque de 4 px imposibles en móvil.
- Panel solo con `Offset` que se sale en pantallas pequeñas.
- "Aplicar" global que el jugador olvida pulsar y cree que cambió algo.

## Criterios de calidad y terminado

- [ ] Cada ajuste se aplica al instante y persiste tras cerrar y reentrar.
- [ ] Rebind completo sin conflictos silenciosos y con restablecer funcional.
- [ ] Operable con ratón, táctil y mando en las 3 resoluciones de referencia.
- [ ] Sin errores en consola; presets verificados en dispositivo bajo y alto.
- [ ] Accesibilidad mínima: tamaño de texto, reducir movimiento y alternativa a color.
- [ ] Coherente en nombres y rangos con los ajustes rápidos de pausa.

## Herramientas

- Studio: simulador de dispositivos, prueba con gamepad, `Output` para conflictos de teclas.
- MCP Studio (si disponible): capturas del panel en claro/oscuro y en texto Grande.
- Rojo: valores por defecto y rangos como datos editables por diseño.
- Selene: lint de la captura de input y de la persistencia local.

## Limitaciones

- Los ajustes del sistema Roblox (menú oficial) no se controlan desde aquí.
- La calidad gráfica disponible depende del dispositivo y del motor (verificar en create.roblox.com/docs).
- La persistencia local tiene límites por plataforma; documenta qué se guarda y dónde.
- Esta skill no optimiza el juego; solo expone controles honestos sobre lo que existe.
