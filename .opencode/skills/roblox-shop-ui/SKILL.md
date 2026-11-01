---
name: Tienda y Escaparate Roblox
description: Grids de productos, precios, preview y compra con confirmación. Úsala cuando crees tiendas, escaparates, pases, estados owned/sin fondos o confirmaciones de compra.
---

# Tienda y Escaparate Roblox

## Objetivo

Vender sin engañar: el jugador entiende qué compra, cuánto cuesta, qué gana (preview real) y confirma antes de pagar. Cubre el escaparate completo —explorar, comparar, confirmar, feedback— con estados claros de disponible, poseído y sin fondos.

## Alcance y límites

Cubre: grid de productos, precios en moneda blanda/dura, preview del objeto, confirmación de compra, estados owned/no-funds/limitado, y feedback post-compra.

NO hace:

- Mecánica genérica responsiva: lo cubren `roblox-ui` y `roblox-user-interfaces`.
- Diseño UX previo de monetización: lo cubre `roblox-game-ux`; esta skill implementa la pantalla.
- Procesamiento real de Robux o receipts: se valida en servidor (verificar en create.roblox.com/docs); la UI solo inicia y refleja.
- Inventario y equipamiento: lo cubre `roblox-inventory-ui` (aquí solo el botón "Ver en inventario").
- Pase de temporada como sistema de progresión: teaser en `roblox-main-menu`; aquí solo su tarjeta comprable.

## Casos de uso

- Tienda con pestañas Destacado/Armas/Mascotas/Monedas.
- Tarjeta de espada con precio "1.250 monedas", preview y botón Comprar.
- Confirmación "¿Comprar X por Y?" con balance visible.
- Estado "Poseído" que cambia a Equipar, y "Te faltan 300" sin fondos.
- Oferta limitada con temporizador honesto y stock visible.

## Proceso paso a paso

1. **Define el catálogo en datos.** ID, nombre, precio, moneda, preview, si es único o consumible, requisitos (nivel/pase). Sin datos no hay UI: primero la tabla, luego la pantalla.
2. **Maqueta el escaparate.** Cabecera con balance (2 monedas máximo visibles) + pestañas de categoría + `ScrollingFrame` grid + panel de detalle/preview. Móvil: grid 2 columnas + detalle como hoja inferior.
3. **Construye las tarjetas.** Cada producto = `Frame` + `ImageLabel` o `ViewportFrame` preview + `TextLabel` nombre + `TextLabel` precio con icono + `TextButton` Comprar/Equipar. Precio siempre con moneda explícita ("1.250" solo nunca).
4. **Implementa el preview honesto.** Muestra el objeto real (modelo o stats reales del catálogo). Rotación lenta en `ViewportFrame` solo si no cuesta rendimiento; si no, imagen estática fiel. Nada de renders que no coincidan con lo entregado.
5. **Confirmación de compra.** Toda compra abre modal: qué + cuánto + balance antes/después + Confirmar/Cancelar. Sin confirmación no hay compra. Doble clic protegido con estado loading + debounce.
6. **Estados por tarjeta.** Disponible (botón primario), Poseído (botón secundario "Equipar"/"Ver"), Sin fondos (botón disabled + "Te faltan X"), Requisito bloqueado ("Nivel 10"), Oferta (temporizador + precio anterior tachado solo si es real).
7. **Feedback post-compra.** Éxito: check + "¡Añadido al inventario!" + botón Ver; fallo: razón + acción ("Conseguir monedas" lleva a la fuente, no a callejón). El balance se actualiza solo tras confirmación del servidor.
8. **Prueba social y legalidad ligera.** "Más vendido" solo con datos reales. Precios regionales, impuestos y políticas de Robux/pagos: (verificar en create.roblox.com/docs) y con el responsable del juego; la UI nunca inventa términos.
9. **Verifica en 3 resoluciones.** Precios sin truncar, botones táctiles ≥48 px, scroll fluido con 60+ productos, sin imágenes pesadas que rompan memoria móvil.

## Conocimientos técnicos

- Tarjeta de producto (clases estables):

  ```luau
  -- Ejemplo ilustrativo: tarjeta de tienda
  local card = Instance.new("Frame")
  card.Name = "ProductCard"
  card.Size = UDim2.fromScale(0.3, 0.4)
  card.Parent = grid

  local buyButton = Instance.new("TextButton")
  buyButton.Name = "BuyButton"
  buyButton.Text = "Comprar · 1.250"
  buyButton.Size = UDim2.fromScale(1, 0.18)
  buyButton.Position = UDim2.fromScale(0, 0.82)
  buyButton.Parent = card
  ```

- Grid con `UIGridLayout` a `Scale`, `UIPadding`, `UICorner` 10-12, `UIStroke` por rareza/oferta. Precios con `UITextSizeConstraint` para que "1.250.000" no rompa.
- `ViewportFrame` para preview 3D solo en la tarjeta seleccionada o el panel de detalle, no en las 60 tarjetas a la vez.
- Compra: el cliente solicita, el servidor valida fondos, entrega y persiste (verificar en create.roblox.com/docs para productos y receipts). La UI muestra loading hasta la respuesta y revierte si falla.
- Balances visibles: la UI los pinta desde el estado replicado del jugador; nunca los calcula localmente.
- `TweenService` para entrada de tarjetas (escalonado leve) y para el modal de confirmación.

### Identidad visual de esta skill (original, no copiar)

- Dirección "escaparate luminoso": fondo marino (#12172A), tarjetas blancas-humo (#F4F6FB) con texto oscuro para contraste de producto, acento compra verde (#22C55E), oferta coral (#FF6B6B), moneda dorada (#FFC53D).
- Tipografía: precio 18-20 extra-negrita (lo más grande de la tarjeta), nombre 15 semibold, meta 12 gris. Precio nunca truncado ni en gris claro.
- Composición: grid 3-4 columnas PC / 2 móvil; panel de detalle a la derecha (PC) con preview grande + stats + confirmación. `UIPadding` 14, gap 12.
- Espaciado: aire alrededor del precio; botón de compra a ancho completo de la tarjeta, altura 44-52.
- Estados: comprar (verde sólido, hover +brillo, pressed 0.97), poseído (secundario con borde), sin fondos (gris disabled + línea "Te faltan X"), loading (spinner en botón, ignora clics), éxito (check animado 0.4 s).
- Animación: entrada escalonada 50 ms por tarjeta visible, modal con fundido + escala 0.96→1. Sin autoplay de previews en todas las tarjetas.

## Buenas prácticas

- Precio + moneda siempre juntos y con balance visible en cabecera.
- Preview = lo que se entrega. Si hay variante aleatoria (caja), dilo explícitamente.
- Confirmación en todas las compras con coste; sin "compra en 1 clic por accidente".
- Ofertas con temporizador real y fin real; nada de "termina en 5:00" eterno.
- Coherencia con inventario: mismo icono, mismo nombre, misma rareza antes y después.
- Accesible: precio legible sin depender del color, foco visible en Confirmar/Cancelar.

## Errores frecuentes

- Botón Comprar que cobra sin confirmación o con doble cobro por doble clic.
- Mostrar "Comprado" antes de la confirmación del servidor y luego revertir en silencio.
- Precios solo con `Offset` que se cortan en móvil ("1.250.0…").
- Previews engañosos que no coinciden con el objeto entregado.
- Ofertas falsas con cuenta atrás reiniciada y desconfianza posterior.
- Tapar el balance con el modal y pedir confirmar a ciegas.

## Criterios de calidad y terminado

- [ ] Toda compra exige confirmación con precio, moneda y balance antes/después.
- [ ] Sin doble cobro bajo spam de clics o latencia alta (debounce + estado loading).
- [ ] Estados disponible/poseído/sin fondos/bloqueado probados con datos reales.
- [ ] Preview fiel al objeto entregado, verificado por diseño.
- [ ] Legible y comprable en PC, tablet y móvil sin solapes.
- [ ] Errores (fondos, red, requisito) con mensaje y acción siguiente.

## Herramientas

- Studio: Play con servidor para flujo de compra, simulador móvil para grid.
- MCP Studio (si disponible): capturas de tarjeta, detalle y modal en 3 resoluciones.
- Rojo: catálogo como datos (precios, textos, IDs) para revisión sin tocar código.
- Selene: lint del handler de compra y del debounce.

## Limitaciones

- No implementa el cobro real ni la persistencia: viven en el servidor (verificar en create.roblox.com/docs).
- No incluye políticas de la plataforma, precios regionales ni impuestos: validar con documentación oficial y responsable del juego.
- No hace comercio entre jugadores ni casa de subastas.
- El `ViewportFrame` masivo degrada el rendimiento; úsalo con moderación documentada.
