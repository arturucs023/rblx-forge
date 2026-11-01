---
name: Leaderboards Roblox
description: Tablas de clasificación, tabs global/amigos y paginación. Úsala cuando crees rankings, estadísticas de jugador, top semanal o anti-spoof visual.
---

# Leaderboards Roblox

## Objetivo

Mostrar quién va ganando de forma creíble y motivadora: rankings legibles, tabs global/amigos/temporada, paginación que no miente y la posición propia siempre visible. La tabla informa, nunca inventa ni expone datos sensibles.

## Alcance y límites

Cubre: tabla de clasificación, tabs (Global/Amigos/Temporada), paginación y scroll virtualizado ligero, fila propia destacada, podium top-3, y reglas anti-spoof visuales.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo: lo cubre `roblox-game-ux`; esta skill implementa.
- Cálculo real de ranking o anti-cheat: vive en el servidor (verificar en create.roblox.com/docs); aquí solo presentación honesta.
- HUD en partida: lo cubre `roblox-hud`.
- Perfil completo de jugador o inventario: `roblox-inventory-ui` y pantallas de perfil.

## Casos de uso

- Top 100 semanal con tabs Global / Amigos / Mi posición.
- Podium 1-2-3 con avatares + tabla 4-50 con scroll.
- Fila propia fija abajo "Tú · #47 · 12.400 pts" aunque estés fuera del top visible.
- Temporada "Termina en 6 días" con recompensas por tramo.
- Estado "Sin datos de amigos todavía. Invita y compite." en vez de tabla vacía.

## Proceso paso a paso

1. **Define qué rankeas.** 1 métrica por tabla (Copas, Victorias, Puntos de temporada). Nada de "ranking misterioso" con fórmula oculta; si hay fórmula, explícala en 1 línea.
2. **Maqueta tabs + tabla.** Cabecera con tabs (`TextButton`s Global/Amigos/Temporada) + temporada/temporizador; podium opcional arriba; `ScrollingFrame` con filas; pie con fila propia fija. Móvil: tabs arriba, podium compacto, tabla a ancho completo.
3. **Construye la fila.** `Frame` + `TextLabel` posición (#1) + `ImageLabel` avatar (o inicial) + `TextLabel` nombre (truncado) + `TextLabel` valor tabular + cambio (▲2/▽1/=) con forma además de color. Fila propia con fondo acento.
4. **Podium top-3.** Tres columnas con alturas 1º > 2º > 3º, avatar + nombre + valor. Sin coronas copiadas de juegos famosos: componer medalla propia (círculo + número + color oro/plata/bronce sobrio).
5. **Paginación honesta.** Página de 20-50 con "Cargar más" o scroll paginado; muestra "Top 100 · mostrando 1-20" y total real. Nunca inventes filas de relleno ni repitas nombres para "llenar".
6. **Fila propia siempre visible.** Aunque estés #4.217, el pie muestra tu posición y la de tus vecinos (±2) con botón "Ir a mi posición". Sin posición (nuevo jugador), "Juega tu primera partida para entrar".
7. **Anti-spoof visual.** Nombres truncados con tooltip completo, sin HTML ni imágenes arbitrarias en nombres (el servidor sanea; verificar en create.roblox.com/docs para filtrado), valores con formato consistente ("12.400", no "12400" mezclado), y marca de "datos de hace X s".
8. **Temporada y recompensas.** Si hay temporada: nombre, fin exacto, tramos con recompensa visible ("Top 10: marco dorado"). Al terminar: estado "Finalizada · resultados en revisión" en vez de congelar números sin explicación.
9. **Verifica con datos extremos.** Nombres larguísimos, 500 filas, sin amigos, empate en puntos, pérdida de conexión. En 3 resoluciones, sin solapes y con scroll fluido.

## Conocimientos técnicos

- Fila de ranking (clases estables):

  ```luau
  -- Ejemplo ilustrativo: pintar una fila del leaderboard
  local row = Instance.new("Frame")
  row.Name = "RankRow_04"
  row.Size = UDim2.fromScale(1, 0.08)
  row.Parent = tableList

  local posLabel = Instance.new("TextLabel")
  posLabel.Name = "Position"
  posLabel.Text = "#4"
  posLabel.Size = UDim2.fromScale(0.12, 1)
  posLabel.Parent = row
  -- Avatar (ImageLabel), nombre y valor siguen el mismo patrón Scale.
  ```

- `ScrollingFrame` + `UIListLayout` con reutilización simple (pool de filas) si hay 100+; `UIPadding`, `UICorner` 8, `UIStroke` tenue en fila propia.
- Tabs: alternan fuente de datos y re-pintan; guardan la tab activa y la posición de scroll por tab.
- Datos desde el servidor o configuración del proyecto (verificar en create.roblox.com/docs); la UI define timeout (3 s), reintento y marca de frescura ("actualizado hace 12 s").
- Formato numérico consistente en un único helper local; fechas/temporizadores con texto explícito, sin jerga.
- `TweenService` solo para entrada de podium y resaltado de fila propia; la tabla no anima cada fila al hacer scroll.

### Identidad visual de esta skill (original, no copiar)

- Dirección "estadio sobrio": fondo noche (#10182E), tabla en filas alternas sutiles, oro/plata/bronce solo en top-3 (#FFD166/#C9D4E3/#E0A173), acento cian para "tú" (#38E1FF).
- Tipografía: posición 16 extra-negrita tabular, nombre 14 semibold, valor 15 negrita tabular a la derecha, cambio 12 con símbolo + color. Todo con `UITextSizeConstraint`.
- Composición: podium 3 columnas arriba (PC) o compacto horizontal (móvil), tabla con columnas 10% / 15% / 50% / 25%. `UIPadding` 12, gap 6.
- Espaciado: filas 52-60 px equivalentes, podium con 16 de aire. Nombres truncados con "…" + tooltip.
- Estados: tú (fondo cian 12% + borde), top-3 (medalla propia), subiendo/bajando (▲/▽ + verde/rojo + texto, no solo color), cargando (skeleton de filas), vacío (ilustración textual + acción), error (banda + Reintentar).
- Animación: entrada del podium 0.3 s, resaltado de fila propia con pulso único. La tabla no parpadea al refrescar: actualiza valores, no reconstruye todo.

## Buenas prácticas

- Una métrica por tabla con explicación de 1 línea ("Puntos de temporada · +10 por victoria").
- Tu posición siempre visible, incluso fuera del top.
- Frescura visible ("hace 12 s") y Reintentar ante error; sin números congelados sin aviso.
- Nombres seguros: truncar, sanear y nunca ejecutar formato arbitrario.
- Coherencia con el resto: mismos avatares, mismos números, mismos colores de cambio.
- Temporadas con inicio/fin y recompensas explícitas; sin "pronto" eterno.

## Errores frecuentes

- Inventar filas o repetir jugadores para que la tabla "se vea llena".
- Mostrar posición propia calculada en cliente y distinta de la real del servidor.
- Tabla sin paginación que instancia 1.000 filas y congela el móvil.
- Nombres larguísimos que rompen columnas por usar solo `Offset`.
- Cambios solo por color (▲ sin símbolo ni texto) ilegibles para daltónicos.
- Exponer IDs, datos personales o estadísticas sensibles en la fila.

## Criterios de calidad y terminado

- [ ] Tabs Global/Amigos/Temporada con estados lleno/vacío/error probados.
- [ ] Tu fila visible y coherente con el servidor en prueba multicliente.
- [ ] 200+ filas con scroll fluido en móvil gama media (pool o paginación).
- [ ] Nombres extremos, empates y desconexión manejados sin romper el layout.
- [ ] Legible en 3 resoluciones con números tabulares alineados.
- [ ] Sin datos inventados ni exposición de información sensible.

## Herramientas

- Studio: Play con varios clientes, simulador móvil, `Output` para datos ausentes.
- MCP Studio (si disponible): capturas de podium + tabla en 3 resoluciones.
- Rojo: textos, métricas y tramos de temporada como datos editables.
- Selene: lint del pintado de filas y de la paginación.

## Limitaciones

- El ranking real, el anti-cheat y la persistencia viven en el servidor (verificar en create.roblox.com/docs).
- Avatares y nombres dependen de los servicios de la plataforma; prevé fallback con inicial.
- El tiempo real de actualización lo define el backend; la UI solo declara la frescura.
- No incluye perfil detallado de jugador ni historial de partidas.
