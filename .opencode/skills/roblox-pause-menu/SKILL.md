---
name: Menú de Pausa Roblox
description: Pausa con reanudar, ajustes rápidos y salir con confirmación. Úsala cuando crees la pausa en partida, el panel ESC, opciones rápidas o el flujo de abandono seguro.
---

# Menú de Pausa Roblox

## Objetivo

Pausar la partida de forma legible y segura: el jugador entiende que el juego está detenido (o protegido), ajusta lo esencial sin salir, y abandona solo con confirmación. La pausa nunca debe regalar ventaja ni permitir acciones que el servidor no validaría en juego normal.

## Alcance y límites

Cubre: overlay de pausa, botones Reanudar/Ajustes rápidos/Ayuda/Abandonar, diálogo de confirmación de salida, comportamiento con el menú del sistema Roblox, y reglas anti-exploit específicas de la pausa.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- Panel completo de ajustes con rebind y perfiles: lo cubre `roblox-settings-ui` (aquí solo ajustes rápidos).
- HUD en partida: lo cubre `roblox-hud`.
- Notificaciones globales del juego: lo cubre `roblox-notifications-ui`.

## Casos de uso

- Pausa con ESC/botón que oscurece el juego y muestra 4 opciones.
- Ajuste rápido de volumen y calidad sin abrir el panel completo.
- "¿Abandonar partida? Perderás el progreso no guardado" con Confirmar/Cancelar.
- Pausa automática al perder foco en móvil con mensaje claro.
- Bloqueo de movimiento e interacciones mientras la pausa está abierta.

## Proceso paso a paso

1. **Define qué significa pausar en tu juego.** Un jugador: congela localmente. Multijugador: normalmente no se detiene el mundo; la pausa es overlay + bloqueo de input propio. Escríbelo en 1 frase y píntalo en la UI ("Partida en pausa" vs "Juego en segundo plano").
2. **Construye el overlay.** `ScreenGui` en `PlayerGui` → `Frame` a pantalla completa semitransparente + `Frame` tarjeta centrada (50% ancho PC, 88% móvil) con `UIListLayout` vertical: título, `TextButton` Reanudar, Ajustes rápidos, Ayuda, Abandonar.
3. **Gestiona apertura/cierre.** Abre con tecla ESC o `TextButton` en HUD (táctil). Cierra con Reanudar, ESC de nuevo o botón cerrar. Usa `UserInputService.InputBegan` para la tecla y debounce de 0.2 s para evitar parpadeo.
4. **Bloquea input de juego.** Mientras está abierta, ignora movimiento/ataque/interacción en tus controladores locales y muestra el cursor. Al cerrar, restaura el estado exacto. Nunca confíes solo en ocultar botones: desactiva la lógica.
5. **Añade ajustes rápidos.** Volumen (slider simple con `TextButton` - / + o barra), calidad (Baja/Media/Alta), silenciar. Cambios inmediatos y reversibles; el panel completo vive en `roblox-settings-ui` vía botón "Más ajustes".
6. **Implementa abandono con confirmación.** Abandonar abre modal secundario: explica consecuencia + `TextButton` Confirmar (destructivo, rojo) + Cancelar (foco por defecto). Confirmar ejecuta la salida (teleport/salida según proyecto; verificar en create.roblox.com/docs). Doble confirmación si hay progreso sin guardar.
7. **Aplica reglas anti-exploit.** La pausa no detiene temporizadores del servidor, no cancela daño ya validado, no permite curarse/equipar/comerciar desde el menú, y no oculta al jugador de otros. Toda acción sensible se revalida en servidor.
8. **Anima y prueba.** Entrada: oscurecido 0.2 s + tarjeta con subida leve vía `TweenService`. Salida inversa. Prueba: abrir en combate, abrir sin conexión, spamear ESC, rotar el móvil, abrir menú Roblox del sistema encima.
9. **Respeta el menú del sistema.** No intentes bloquear ni suplantar el menú de Roblox; tu pausa coexiste. Usa `GuiService` solo para lectura de estados si lo necesitas.

### Identidad visual de esta skill (original, no copiar)

- Dirección "cabina sobria": overlay negro 60% + tarjeta grafito (#1C2233) con borde fino claro; acento verde reanudar (#3DDC84) y rojo abandono (#FF5A5A).
- Tipografía: título 24 semibold, opciones 17 regular, notas 13 gris. Botones de altura 48 (PC) / 56 (táctil) con `UITextSizeConstraint`.
- Composición: tarjeta centrada, 1 columna, icono + texto por fila, separadores de 1 px. Abandonar separado visualmente al final con espacio extra.
- Espaciado: `UIPadding` 20, gap 10 entre botones, `UICorner` 12, `UIStroke` 1 px en la tarjeta.
- Estados: hover aclara 6%, pressed escala 0.98, disabled gris, loading solo en Abandonar-confirmar (spinner breve), foco visible en Cancelar por defecto en el modal.
- Animación: solo fundido + subida 8 px, 0.2-0.25 s. En pausa la moderación es obligatoria: nada que distraiga.

## Conocimientos técnicos

- Estructura mínima (clases estables):

  ```luau
  -- Ejemplo ilustrativo: alternar la pausa
  local Players = game:GetService("Players")
  local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
  local pauseGui = playerGui:WaitForChild("PauseGui")

  local function setPaused(open: boolean)
    pauseGui.Enabled = open
    -- Aquí además se bloquean los controladores de juego locales.
  end
  ```

- `ScreenGui.Enabled` para mostrar/ocultar todo el bloque; `DisplayOrder` alto pero por debajo de modales críticos y del chat del sistema.
- `UserInputService` para ESC/tecla dedicada; en móvil un `TextButton` de pausa en el HUD (mínimo 48x48) que abre este menú.
- `TweenService` solo para el overlay y la tarjeta; congela tweens de juego si tu diseño los detiene en pausa.
- Teclas y gamepad: la navegación debe funcionar sin ratón; prueba el orden de foco antes de publicar (verificar en create.roblox.com/docs para detalles de selección).
- Ninguna decisión de inventario, daño o economía se toma en este menú; si aparece un botón así, es un error de diseño.

## Buenas prácticas

- Reanudar es la acción primaria y la más grande; Abandonar siempre la última y en estilo destructivo.
- Explica la consecuencia de abandonar en 1 línea honesta, sin chantaje emocional.
- Ajustes rápidos con efecto inmediato y sin botón Guardar.
- Coherencia total con menú principal y ajustes: mismos botones, mismos iconos, mismos radios.
- En multijugador deja claro que el mundo sigue: "Los demás jugadores continúan".
- Registra aperturas de pausa y abandonos para detectar puntos de frustración (analítica del proyecto).

## Errores frecuentes

- Pausa que solo oculta la UI pero deja al personaje moviéndose o recibiendo input.
- Abandonar sin confirmación y pérdida de progreso con queja posterior.
- Intentar pausar el servidor desde el cliente o congelar a otros jugadores.
- Permitir equipar/curar/comerciar desde la pausa saltándose validaciones.
- Overlay que tapa el menú del sistema Roblox o lo imita para engañar.
- Textos ambiguos ("Salir" sin decir si es al menú o fuera del juego).

## Criterios de calidad y terminado

- [ ] Abrir/cerrar 20 veces seguidas (spam ESC) sin estados rotos ni duplicados.
- [ ] Sin ventaja: temporizadores, daño y economía se comportan igual con la pausa abierta.
- [ ] Abandonar exige confirmación y explica la consecuencia.
- [ ] Legible en PC, móvil y tablet con tamaños `Scale` y botones táctiles suficientes.
- [ ] Sin errores en consola y sin input fantasma al reanudar.
- [ ] Coherente visualmente con el resto de menús del juego.

## Herramientas

- Studio: Play solo y con servidor, simulador móvil, `Output` para inputs duplicados.
- MCP Studio (si disponible): captura del overlay sobre gameplay real, verificación de orden de capas.
- Rojo: textos del menú como datos para revisión y traducción futura.
- Selene: lint del controlador de apertura/cierre y del debounce.

## Limitaciones

- En multijugador no existe "pausa real del mundo" desde el cliente; es overlay + bloqueo local.
- No sustituye el panel de ajustes completo (`roblox-settings-ui`) ni el HUD (`roblox-hud`).
- Comportamientos del menú del sistema Roblox pueden variar por plataforma (verificar en create.roblox.com/docs).
- La protección anti-exploit real vive en el servidor; esta UI solo no la bloquea.
