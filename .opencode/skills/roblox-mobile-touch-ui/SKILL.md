---
name: Interfaces Táctiles Roblox
description: Controles touch, thumb zones, safe-area y orientación. Úsala cuando adaptes HUD, botones, joystick o menús a móvil y tablet sin tapar el juego.
---

# Interfaces Táctiles Roblox

## Objetivo

Que el juego se controle igual de bien con pulgares que con teclado: zonas de pulgar respetadas, botones alcanzables y grandes, safe-area sin recortes, y convivencia limpia entre táctil, mando y teclado. El táctil no es "la versión pequeña del PC": es su propio layout.

## Alcance y límites

Cubre: thumb zones, tamaños mínimos táctiles, safe-area y notch, joystick/botones virtuales, orientación vertical/horizontal, y convivencia touch/gamepad/teclado.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces` (aquí la especialización táctil).
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- HUD de información como tal: lo cubre `roblox-hud` (aquí dónde ponerlo para no taparlo con los dedos).
- Menús completos: cada uno tiene su skill; aquí las reglas táctiles que todos obedecen.

## Casos de uso

- Joystick izquierdo + 3 botones derechos (Saltar, Interactuar, Habilidad) sin tapar el centro.
- Botón de pausa 56x56 en esquina segura fuera del pulgar.
- Menú que en PC es 2 columnas y en móvil es 1 columna con pestañas.
- Banner que en móvil va arriba-centro y nunca sobre los botones.
- Rotación a horizontal que reubica la barra de objetivo sin cortarla el notch.

## Proceso paso a paso

1. **Mapea las thumb zones.** Dibuja pulgar izquierdo (movimiento, abajo-izquierda), pulgar derecho (acciones, abajo-derecha), zona muerta central (juego, no tocar) y esquinas superiores (info/pausa). Todo control táctil vive en su zona; el centro queda libre.
2. **Define tamaños mínimos.** Acción primaria 64-72 px equivalentes, secundaria 52-56, iconos 24+ con área de toque 48+. Separación mínima 12 entre botones. Nada de 32 px "que ya se apañan".
3. **Aplica safe-area.** Margen 4-6% desde cada borde + respeto a notch/barras del sistema; prueba con simulador en iPhone y Android con notch distinto. La UI crítica nunca vive en los 24 px del borde.
4. **Construye controles virtuales con primitivas estables.** Joystick = `Frame` base + `ImageLabel`/`Frame` stick que sigue al dedo dentro del radio; botones = `TextButton`/`ImageButton` redondos con `UICorner` 1,0. Usa `UserInputService.TouchStarted/TouchMoved/TouchEnded` solo a través de los controles del proyecto.
5. **Adapta cada pantalla.** Regla: PC 2 columnas → móvil 1 columna + pestañas; grids 4→2; hojas inferiores en vez de modales centrados pequeños; fuentes +2-4 pt equivalentes. Documenta la tabla de equivalencias del proyecto.
6. **Orientación.** Soporta la orientación oficial del juego; si es horizontal, el modo vertical muestra mensaje + layout mínimo, no un juego roto. Al rotar, re-ancla (no reconstruyas toda la UI) y conserva el estado.
7. **Convive con mando y teclado.** Detecta el último input y muestra la ayuda correspondiente ("Pulsa E" vs "Toca ⬤" vs "Pulsa ⓧ"); nunca muestres las tres a la vez. En tablet con teclado, el táctil sigue disponible.
8. **Prueba con pulgares reales.** Juega 10 minutos en dispositivo: ¿alcanzas todo sin estirar? ¿ves al enemigo entre los dedos? ¿el sudor/deslizamiento rompe el joystick? Ajusta radio y sensibilidad antes de dar por hecho.
9. **Verifica rendimiento táctil.** Controles a 60 fps, sin retardo dedo→acción >80 ms percibido, y sin que el HUD informativo se solape con los controles en ninguna resolución móvil.

## Conocimientos técnicos

- Botón táctil (clases estables):

  ```luau
  -- Ejemplo ilustrativo: botón de acción táctil bien anclado
  local actionButton = Instance.new("TextButton")
  actionButton.Name = "JumpButton"
  actionButton.Text = "Saltar"
  actionButton.AnchorPoint = Vector2.new(1, 1)
  actionButton.Position = UDim2.fromScale(0.96, 0.94)
  actionButton.Size = UDim2.fromScale(0.16, 0.16)
  actionButton.Parent = touchRoot
  -- UICorner circular + UISizeConstraint mínimo + UIAspectRatioConstraint 1:1.
  ```

- Todo a `Scale` con `AnchorPoint` por esquina; `UIAspectRatioConstraint` 1:1 en botones redondos; `UISizeConstraint` con mínimo físico y máximo para no cubrir tablets.
- `UserInputService` para saber si hay táctil (`TouchEnabled`, verificar en create.roblox.com/docs) y para gestos; el joystick del proyecto emite movimiento, esta UI solo lo presenta.
- `GuiService` como lectura para no solapar menús del sistema; la safe-area propia se define por proyecto con 4-6% + pruebas en notch reales.
- `ScrollingFrame` en móvil con `ScrollBarThickness` fino, inercia natural y áreas de toque que no compiten con el scroll (botones fuera de la zona de arrastre).
- `UIScale` global opcional para modo "botones grandes" de accesibilidad.

### Identidad visual de esta skill (original, no copiar)

- Dirección "control de neón sobrio": botones semitransparentes (#0E1420 a 45%) con borde claro 2 px y glifo blanco grueso; joystick con base anillo + stick sólido; nada que oculte el juego.
- Tipografía: glifos y etiquetas 14-16 negrita dentro/fuera del botón, ayudas contextuales 13 sobre pastilla. Sin texto largo dentro de botones redondos.
- Composición: joystick abajo-izquierda (radio 90-110), acciones en arco abajo-derecha (primaria más grande y más baja), pausa arriba-derecha pequeña, objetivo arriba-centro. `UIPadding` generoso.
- Espaciado: 12-16 entre botones, 4-6% de margen seguro. Primaria 20% mayor que secundarias para jerarquía táctil.
- Estados: normal 45% opaco, pressed 80% + escala 0.93, disabled 25% + sin borde, cooldown con barrido radial o numérico, feedback con vibración visual (pulso 0.12 s vía `TweenService`).
- Animación: solo feedback de pulsación y aparición inicial. Prohibidos botones flotantes o que se desplazan solos.

## Buenas prácticas

- El centro de la pantalla es sagrado: 0 controles táctiles en el tercio central.
- Cada acción frecuente a ≤1 pulgar de distancia sin estirar; lo raro va a menús.
- Ayuda contextual por input real, no triple leyenda permanente.
- Botones con etiqueta o glifo universal + tooltip en pausa; sin iconos ambiguos.
- Coherencia con PC: misma jerarquía (primaria/secundaria), mismos colores, mismos nombres.
- Modo zurdo o espejo si el juego lo promete; si no, no lo anuncies.

## Errores frecuentes

- Botones de 32 px que fallan el 30% de pulsaciones con prisa.
- HUD crítico bajo el pulgar derecho que nadie vuelve a leer.
- Caja de diálogo que tapa el joystick y obliga a soltar el movimiento para avanzar.
- Layout PC encogido a móvil sin reordenar: todo legible y nada usable.
- Ignorar el notch y perder la pausa y el objetivo en iPhone.
- Retardo dedo→acción por animar el botón 0.3 s antes de ejecutar.

## Criterios de calidad y terminado

- [ ] 10 minutos jugables en móvil sin errores de alcance ni oclusión del centro.
- [ ] Botones ≥48 px equivalentes, primaria ≥64, verificados en 2 tamaños de teléfono + tablet.
- [ ] Safe-area y notch probados en 2 dispositivos simulados distintos.
- [ ] Ayuda por input correcto (táctil/mando/teclado) sin triples leyendas.
- [ ] Sin solape entre controles, HUD crítico y notificaciones.
- [ ] Rotación soportada sin pérdida de estado ni pantallas rotas.

## Herramientas

- Studio: simulador de dispositivos, emulación táctil, prueba de rotación.
- MCP Studio (si disponible): capturas con overlay táctil en 3 tamaños, `Output` para inputs perdidos.
- Dispositivo real siempre que sea posible para radio de joystick y latencia.
- Selene: lint de handlers táctiles y de la detección de input.

## Limitaciones

- El joystick y la cámara táctil base los pone el proyecto/motor; aquí su presentación y layout.
- Comportamientos por SO (gestos del sistema, notch, barras) varían (verificar en create.roblox.com/docs).
- La latencia dedo→acción depende también del juego y la red, no solo de la UI.
- Accesibilidad total (botones gigantes, control por interruptor) puede exigir un modo dedicado.
