---
name: Menú Principal Roblox
description: Menús principales con jugar, modos, noticias y teaser de temporada. Úsala cuando crees la pantalla de título, selector de modos, panel de eventos o transiciones de entrada/salida.
---

# Menú Principal Roblox

## Objetivo

Construir el menú principal como puerta del juego: que el jugador llegue a jugar en 2 clics, descubra modos y eventos activos, y sienta la identidad del juego antes de entrar. Incluye entrada animada, navegación entre secciones y salida con transición hacia la partida o el modo elegido.

## Alcance y límites

Cubre: pantalla de título, botones Jugar/Modos, panel de noticias/eventos, prueba social (jugadores en línea, amigos), teaser de pase de temporada, pie con ajustes/salir, y transiciones de entrada/salida del menú.

NO hace:

- Mecánica genérica responsiva (layouts, constraints, stylesheets): lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo o wireframes de descubrimiento: lo cubre `roblox-game-ux`; esta skill implementa.
- Onboarding de primera sesión paso a paso: lo cubre `roblox-welcome-onboarding`.
- Pausa dentro de partida: lo cubre `roblox-pause-menu`.
- Lobby con salas y matchmaking detallado: lo cubre `roblox-lobby-ui`.

## Casos de uso

- Título con botón Jugar gigante + fila de modos (Casual, Ranked, Evento).
- Panel lateral de noticias con 2-3 tarjetas e imagen.
- "12.4K jugando ahora · 3 amigos en línea" como prueba social.
- Teaser de temporada con barra de progreso y botón ver pase.
- Salida animada que funde el menú y revela la carga de partida.

## Proceso paso a paso

1. **Define las 3 rutas críticas.** Jugar rápido, elegir modo, ver evento. Todo lo demás es secundario y va al pie o a subpanel. Si Jugar no se alcanza en 2 clics, rehaz la jerarquía.
2. **Maqueta la composición.** Hero a la izquierda (título + Jugar + modos), columna derecha con noticias/eventos en PC; en móvil, hero arriba y pestañas abajo (Jugar/Noticias/Pase). Dibuja los 3 tamaños antes de construir.
3. **Construye el esqueleto.** `ScreenGui` en `PlayerGui` → `Frame` raíz a `Scale` → zonas: Header (`TextLabel` título + `TextLabel` jugadores en línea), Hero, panel Noticias (`ScrollingFrame` + `UIListLayout`), pie (`TextButton` Ajustes, Ayuda, Salir).
4. **Implementa modos como tarjetas.** Cada modo = `Frame` + `ImageLabel` miniatura + `TextLabel` nombre + `TextLabel` meta (jugadores/duración) + `TextButton` Jugar. Selección marca con `UIStroke` de acento; el resto queda atenuado.
5. **Añade noticias y teaser.** Noticias = lista de 2-4 tarjetas con imagen, titular de 1 línea y fecha. Teaser de temporada = `Frame` con `TextLabel` + barra de progreso (`Frame` fondo + `Frame` relleno a `Scale`) + botón. Sin datos reales, usa contenido de ejemplo claramente marcado.
6. **Prueba social honesta.** Muestra conteos solo si vienen del servidor/sesión (verificar en create.roblox.com/docs); nunca inventes cifras en producción. Si no hay dato, oculta el bloque en vez de mostrar "0".
7. **Transiciones de entrada/salida.** Entrada: fundido + subida del hero con `TweenService` (0.35 s). Salida a partida: fundido a negro con `CanvasGroup` y luego oculta el menú. El botón presionado da feedback inmediato (<100 ms) aunque la carga tarde.
8. **Estados y errores.** Sin conexión: banner reintentable. Modo lleno: tarjeta en disabled con etiqueta "Lleno". Evento terminado: tarjeta atenuada con "Finalizado". Loading de Jugar: botón en estado loading que ignora doble clic.
9. **Verifica responsive y rendimiento.** Prueba 1920x1080, 1366x768 y móvil vertical. Miniaturas comprimidas, máximo 1 `ImageLabel` grande de fondo. Sin vídeos ni partículas pesadas en el menú.

## Conocimientos técnicos

- Jerarquía recomendada (clases estables):

  ```luau
  -- Ejemplo ilustrativo: esqueleto del menú principal
  local Players = game:GetService("Players")
  local TweenService = game:GetService("TweenService")

  local gui = Instance.new("ScreenGui")
  gui.Name = "MainMenuGui"
  gui.ResetOnSpawn = false
  gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

  local root = Instance.new("Frame")
  root.Size = UDim2.fromScale(1, 1)
  root.BackgroundTransparency = 1
  root.Parent = gui
  -- Hero, NewsPanel y Footer cuelgan de root con tamaños Scale.
  ```

- Navegación por pestañas: un `Frame` contenedor + `TextButton`s que alternan `Visible` de subpaneles; guarda la pestaña activa en un atributo para telemetría.
- `TweenService` para fundidos: anima `GroupTransparency` de `CanvasGroup` o `BackgroundTransparency` + `TextTransparency` en grupo. Evita animar `Size` cada frame en listas largas.
- `UIGridLayout` para la fila de modos en PC, `UIListLayout` vertical en móvil; cambia la orientación por `UISizeConstraint` o código según viewport (verificar en create.roblox.com/docs).
- Contadores y noticias: la UI solo pinta; los datos llegan del servidor o de configuración (verificar en create.roblox.com/docs). Define un timeout: si no llegan en 3 s, muestra estado de carga y luego fallback.
- `GuiService` para respetar menús del sistema y no solapar el botón de Roblox.

### Identidad visual de esta skill (original, no copiar)

- Dirección "cartel cinematográfico": fondo oscuro grafito (#10131D) con imagen hero a la derecha al 45% y viñeta; acento eléctrico cian (#38E1FF) + dorado de evento (#FFC53D).
- Tipografía: título display extra-negrita 40-56, nombres de modo 20 en semibold, meta 13 en regular gris claro. Todo con `UITextSizeConstraint` min/max.
- Composición: rejilla 12 columnas en PC (hero 7, lateral 5); móvil en pila con pestañas inferiores. `UIPadding` 20-28, tarjetas con `UICorner` 14 y `UIStroke` 1 px translúcido.
- Espaciado: 16 entre tarjetas, 24 entre secciones. Nada pegado al borde: margen seguro mínimo 5% en móvil.
- Estados: tarjeta hover eleva 2 px + brillo, pressed escala 0.98, disabled 45% transparencia + etiqueta, loading con shimmer en la miniatura, seleccionada con `UIStroke` cian de 2 px.
- Animación: entrada escalonada hero→modos→noticias (retardo 60 ms cada bloque), salida fundido a negro 0.3 s. Moderada, sin loops infinitos.

## Buenas prácticas

- Jugar siempre visible sin scroll en todas las resoluciones.
- Una sola acción primaria por pantalla; el resto secundarias.
- Noticias con fecha y estado (Activo/Nuevo/Finalizado); nada de banners eternos sin fecha.
- Coherencia con onboarding y pausa: mismos botones, mismos radios, mismos iconos.
- Precarga la miniatura del modo por defecto; el resto en diferido.
- Textos originales: no copies eslóganes ni layouts de juegos existentes.

## Errores frecuentes

- 6 botones "Jugar" compitiendo entre sí y el jugador sin saber cuál pulsar.
- Cifras de jugadores inventadas que se descubren en cuanto entran al juego.
- Fondo a `Offset` fijo que deja bandas en ultra-wide o corta el título en móvil.
- Doble clic en Jugar que lanza dos peticiones de matchmaking (falta estado loading con debounce).
- Noticias sin estado que anuncian eventos caducados.
- Tapar el botón del sistema Roblox con el header propio.

## Criterios de calidad y terminado

- [ ] Jugar alcanzable en ≤2 clics desde cualquier pestaña del menú.
- [ ] Sin solapes en 3 resoluciones de referencia (PC 1080p, portátil 768p, móvil vertical).
- [ ] Entrada y salida animadas sin cortes; el menú no reaparece tras entrar a partida.
- [ ] Estados vacíos, loading y error definidos para noticias y modos.
- [ ] Rendimiento: menú a 60 fps, memoria de imágenes bajo presupuesto del proyecto.
- [ ] Textos originales y fecha visible en cada noticia.

## Herramientas

- Studio: editor de UI, simulador de dispositivos, Profiler para el coste de imágenes.
- MCP Studio (si disponible): capturas comparativas PC/móvil, inspección de `Output` ante fallos de carga.
- Rojo: tarjetas de modos y noticias como datos (tabla) para que diseño edite sin tocar código.
- Selene: lint de los controladores de pestañas y del debounce de Jugar.

## Limitaciones

- No implementa matchmaking real ni creación de servidores (lo cubre `roblox-lobby-ui`).
- No gestiona compras del pase de temporada; solo el teaser (la compra va en `roblox-shop-ui`).
- Conteos y noticias dependen del backend del juego (verificar en create.roblox.com/docs); sin backend solo hay contenido de ejemplo.
- No incluye chat ni lista de amigos completa; solo el micro-bloque de prueba social.
