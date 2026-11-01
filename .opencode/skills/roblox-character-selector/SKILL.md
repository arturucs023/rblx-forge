---
name: Selector de Personajes Roblox
description: Cards de clases, stats comparadas y preview 3D. Úsala cuando crees selección de personaje/clase, desbloqueos por nivel o pago, o confirmación antes de jugar.
---

# Selector de Personajes Roblox

## Objetivo

Ayudar a elegir personaje o clase con criterio en 30 segundos: ver opciones, comparar stats, previsualizar el aspecto y entender qué está bloqueado y cómo se desbloquea. Termina siempre con confirmación explícita antes de entrar al juego.

## Alcance y límites

Cubre: galería de cards, stats comparadas con barras, preview en `ViewportFrame`, bloqueo por nivel/pago con ruta de desbloqueo, y confirmación de selección.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo de clases: lo cubre `roblox-game-ux`; esta skill implementa la pantalla.
- Tienda y cobro real: lo cubre `roblox-shop-ui` (aquí solo la etiqueta de requisito).
- Lobby y matchmaking: lo cubre `roblox-lobby-ui`.
- Habilidades en partida y cooldowns: sistema de juego, no de esta pantalla (la UI de habilidades en HUD va en `roblox-hud`).

## Casos de uso

- 4 clases (Tanque, Exploradora, Médico, Ingeniero) con cards y stats.
- Preview 3D que rota al seleccionar, con nombre y rol.
- Personaje bloqueado "Nivel 8" con barra de progreso hacia el desbloqueo.
- Comparativa "Velocidad 8/10 vs 5/10" al pasar de una card a otra.
- Confirmar con "Jugar como Ingeniera" y volver sin perder la selección.

## Proceso paso a paso

1. **Define la fantasía de cada opción.** 1 rol + 1 frase + 3 stats (0-10) + dificultad (Fácil/Media/Difícil). Si dos opciones se describen igual, rediséñalas antes de maquetar.
2. **Maqueta la galería.** PC: carril de cards a la izquierda, preview grande + detalle a la derecha, Confirmar abajo-derecha. Móvil: preview arriba (40%), carril horizontal de cards en medio, detalle compacto + Confirmar fijo abajo.
3. **Construye las cards.** Cada card = `Frame` + `ImageLabel` retrato o mini `ViewportFrame` + `TextLabel` nombre + `TextLabel` rol + mini-barras de 2-3 stats + etiqueta de estado (Disponible/Nivel X/Pago). Selección con `UIStroke` de acento.
4. **Stats comparadas honestas.** Barras (`Frame` fondo + `Frame` relleno a `Scale`) de 0-10 con número. Al cambiar de selección, anima la transición con `TweenService` y marca en verde/rojo la diferencia vs la anterior solo si ayuda (máximo 3 stats).
5. **Preview en ViewportFrame.** Un único `ViewportFrame` con el modelo del personaje seleccionado, cámara fija e iluminación simple; rotación lenta o arrastre para girar. Sin efectos que oculten el aspecto real.
6. **Bloqueos con ruta clara.** Bloqueado muestra requisito exacto ("Nivel 8 · vas en 5" con barra, o "Pase X" con botón Ver que abre la tienda). Nada de candados sin explicación ni de "Próximamente" eterno.
7. **Confirmación explícita.** `TextButton` "Jugar como X" con nombre dinámico; al pulsar, loading breve + transición al lobby/partida. Atrás conserva la selección. Doble pulsación protegida con debounce.
8. **Datos desde configuración.** Roster, stats y requisitos como tabla de datos del proyecto; la UI solo pinta. Si el servidor dice que está bloqueado, la UI no lo deja elegir aunque se manipule localmente.
9. **Verifica con 8+ personajes.** Scroll fluido, preview sin caídas, textos sin truncar en móvil, y prueba con cuenta nueva (todo bloqueado) y veterana (todo abierto).

## Conocimientos técnicos

- Card + preview (clases estables):

  ```luau
  -- Ejemplo ilustrativo: marcar una card como seleccionada
  local stroke = card:FindFirstChildOfClass("UIStroke")
  if stroke then
    stroke.Enabled = true
    stroke.Color = Color3.fromRGB(56, 225, 255)
  end
  -- El resto de cards apagan su UIStroke en la misma pasada.
  ```

- `UIGridLayout`/`UIListLayout` para el carril; `ScrollingFrame` horizontal en móvil; `UISizeConstraint` para que las cards no se aplasten.
- `ViewportFrame`: un modelo a la vez, cámara con `CFrame` fijo, fondo simple; evita sombras y partículas dentro del preview.
- Barras de stats a `Scale` (valor/10) con `UICorner` y `UITextSizeConstraint` en los números.
- Selección: estado local para pintar + confirmación que pide al servidor crear/instanciar con ese personaje (verificar en create.roblox.com/docs para el flujo del juego). El servidor valida desbloqueo y propiedad.
- `TweenService` para transiciones de stats y entrada de cards; `CanvasGroup` para fundir el cambio de preview.

### Identidad visual de esta skill (original, no copiar)

- Dirección "galería de héroes": fondo degradado índigo noche (#141A33→#1E2A52), cards grafito con retrato grande, acento cian selección (#38E1FF) + ámbar legendario (#FFC53D).
- Tipografía: nombre 18 semibold, rol 13 mayúsculas ámbar, stats 12 con número a la derecha. Dificultad con 1 palabra + 3 puntos, no párrafo.
- Composición: cards 3:4 con retrato 60%, stats 25%, estado 15%. Preview 16:10 en PC con nombre superpuesto abajo. `UIPadding` 12, `UICorner` 12.
- Espaciado: gap 12 entre cards, 20 entre zonas. Confirmar de 200-260 px equivalentes, altura 52-56.
- Estados: hover eleva 3 px, pressed 0.97, seleccionada con `UIStroke` 2 px + fondo +6% brillo, bloqueada 55% transparencia + banda de requisito, loading en Confirmar con spinner.
- Animación: entrada escalonada del carril, stats que barren de 0 al valor en 0.4 s, preview con fundido al cambiar. Moderada y sin loops que mareen.

## Buenas prácticas

- 3-6 opciones visibles sin scroll en PC; más de 8 exige búsqueda o filtros por rol.
- Stats comparables (misma escala 0-10) y explicadas en 1 línea cada una.
- Preview fiel al juego: mismo modelo, mismos colores, sin armaduras que no existen.
- Bloqueos con progreso ("5/8") o precio/tienda exacta, nunca "Bloqueado" a secas.
- Confirmar siempre nombra la elección ("Jugar como X").
- Coherencia con HUD e inventario: mismos iconos de stats y rarezas.

## Errores frecuentes

- Stats inventadas que no coinciden con el balance real y generan quejas.
- Preview con 8 `ViewportFrame`s simultáneos que hunden el FPS móvil.
- Permitir confirmar un bloqueado manipulando la UI local (falta validación servidor).
- Cards solo con `Offset` que se cortan en tablet o se hacen enanas en PC.
- Textos de rol de 4 líneas que nadie lee; la fantasía debe caber en 1 frase.
- Copiar la galería de un juego famoso píxel a píxel (riesgo de imitación; componer original).

## Criterios de calidad y terminado

- [ ] Elección + confirmación completas en ≤30 s en prueba con usuarios nuevos.
- [ ] Stats y requisitos coinciden con los datos reales del juego.
- [ ] Bloqueados no seleccionables aunque se manipule el cliente (validado en servidor).
- [ ] 60 fps con el preview activo en PC y sin tirones graves en móvil.
- [ ] Legible en PC, tablet y móvil sin solapes ni truncados.
- [ ] Dirección de arte propia, sin copias de diseños protegidos.

## Herramientas

- Studio: editor de UI, prueba de `ViewportFrame` con modelos reales, simulador móvil.
- MCP Studio (si disponible): capturas de galería + preview en 3 resoluciones, `Output` ante modelos ausentes.
- Rojo: roster (nombres, stats, requisitos) como datos editables.
- Selene: lint del controlador de selección y del debounce de Confirmar.

## Limitaciones

- No crea los personajes ni su balance; solo la pantalla que los presenta.
- El `ViewportFrame` tiene coste y límites (verificar en create.roblox.com/docs); un modelo pesado debe simplificarse para preview.
- Desbloqueos por pago dependen de la tienda y el servidor (`roblox-shop-ui`).
- La accesibilidad de la comparativa exige no depender solo del color (usa números y etiquetas).
