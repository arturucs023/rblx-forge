---
name: roblox-ui-testing
description: Pruebas de UI por pantalla (recorridos, estados, resoluciones, legibilidad). Úsala cuando valides menús, HUD o flujos antes de cada release.
---

# Pruebas de UI en Roblox

## Objetivo
Garantizar que cada pantalla funciona y se lee en todos los tamaños: recorridos completos por flujo, estados (cargando/vacío/error), resoluciones móvil-PC, legibilidad y checklist repetible por release.

## Alcance y límites
Diferenciación: `roblox-testing` (instalada) es paraguas QA y `roblox-testez` cubre lógica unitaria; esta skill es práctica dedicada de UI (recorridos, estados, resoluciones). `roblox-multiplayer-testing` cubre concurrencia; aquí se cubre lo que ve cada jugador.

Qué NO hace:

- NO diseña el arte de UI; verifica que el diseño implementado funciona y se lee.
- NO testea lógica de servidor (ver `roblox-testez`, `roblox-multiplayer-testing`).
- NO automatiza capturas externas; define recorridos ejecutables en Studio/dispositivo.

## Casos de uso
1. Flujo tienda: abrir → comprar → confirmar → recibir → ver reflejo en HUD.
2. Menú → lobby → partida → resultados sin pantallas muertas.
3. Estados: inventario vacío, carga lenta, error de datos con degradado.
4. Móvil pequeño vs PC ancho: sin solapes ni botones inalcanzables.
5. Checklist de release: 15 min que bloquean salida si fallan.

## Proceso paso a paso
1. Inventaría pantallas y flujos: lista cada pantalla, desde dónde se llega y a dónde lleva. Sin mapa no hay cobertura.
2. Escribe recorridos como pasos numerados con resultado esperado por paso (qué aparece, qué cambia). Un recorrido = un flujo de jugador.
3. Añade matriz de estados por pantalla: cargando, vacío, con datos, error/degradado. Cada celda tiene captura o descripción de lo esperado.
4. Define resoluciones de prueba: móvil pequeño (ej. 4.7"), tablet, PC 16:9, PC ultra-ancha si aplica. Verifica en al menos móvil + PC siempre.
5. Ejecuta con zona segura y pulgar: en móvil, todo accionable con pulgar sin tapar info; en PC, navegable con teclado/ratón sin trampas de foco.
6. Verifica legibilidad: contraste, tamaño mínimo, sin texto cortado ni solapado, localización sin overflow (strings largos de prueba).
7. Prueba interrupciones: llamada/recibo en móvil, resize en PC, join tardío que cambia la UI, error de datos que debe mostrar degradado (ver `roblox-error-handling`).
8. Registra defectos con pantalla, resolución, pasos y captura; clasifica Bloqueante (no se puede completar flujo) vs Menor (visual).
9. Congela checklist de release (10-20 ítems, <20 min) y ejecútala igual en cada salida; cualquier Bloqueante frena el release.

## Conocimientos técnicos
- Recorrido como contrato: cada paso tiene precondición, acción y postcondición observable. Si la postcondición no es observable, el recorrido no sirve.
- Estados como máquina (ver `roblox-state-machines`): Loading → Ready → Empty/Error. La UI nunca queda en blanco sin explicación.
- `Attributes` para forzar estados en prueba (ej. `UIState=Loading`) sin tocar código, facilitando capturas de cada celda.
- Texto: prueba con strings 2x de largo y caracteres anchos; si rompe layout, el layout es el bug.
- Toque vs clic: áreas mínimas táctiles generosas en móvil; en PC, foco visible y orden de tabulación sensato (verificar controles exactos en create.roblox.com/docs si dudas).
- Rendimiento de UI: listas largas con reutilización/paginación; mide con MicroProfiler si hay scroll con cientos de celdas.
- Consistencia con datos: la UI lee de la misma config que la lógica (ej. odds de `roblox-rarity-collectibles`); nada de textos duplicados.

Ejemplo ilustrativo (recorrido tienda):

```text
R-TIENDA-01 Compra de sobre (ilustrativo)
1. Desde HUD, pulsa Tienda → se abre en <1s, muestra odds.
2. Pulsa Comprar → aparece confirmación con precio.
3. Confirma → descuento visible, apertura animada, item + rareza.
4. Cierra → HUD refleja item/polvo, historial registra apertura.
Falla si: falta confirmación, odds invisibles, HUD no actualiza.
```

Ejemplo ilustrativo (matriz de estados):

```text
Pantalla Inventario (ilustrativo)
| Estado   | Esperado |
| Loading  | skeleton + "Cargando", sin botones rotos |
| Vacío    | ilustración + CTA "Abrir tienda" |
| Con datos| grid sin solapes en móvil y PC |
| Error    | aviso + "Reintentar", modo degradado visible |
```

Ejemplo ilustrativo (checklist release):

```text
UI-RELEASE vX (ilustrativo, <20 min)
[ ] R-TIENDA-01 en móvil + PC
[ ] Inventario vacío/error
[ ] Resultados post-partida legibles
[ ] Sin texto cortado con strings largos
[ ] Botones críticos alcanzables con pulgar
```

## Buenas prácticas
- Menos pantallas, bien probadas. Cada pantalla nueva añade 4 estados × N resoluciones.
- Capturas por estado y resolución en el PR de UI; el diff visual es evidencia.
- Textos reales (no lorem) desde el primer test; la localización rompe layouts tarde.
- Accesibilidad mínima: contraste, tamaño, daltonismo en rarezas (no solo color).
- La checklist de release vive en el repo y se versiona con el juego.

## Errores frecuentes
1. Probar solo en PC ancho: en móvil los botones se solapan o salen de pantalla. Móvil siempre.
2. Solo estado "con datos": el vacío y el error se descubren en producción. Matriz completa.
3. Textos duplicados entre UI y lógica (odds, precios): divergen. Una sola fuente.
4. Recorridos sin postcondición observable ("mira que funciona"): no falla nunca. Cada paso verifica algo.
5. Ignorar zona segura/notch: botones bajo el notch inalcanzables.Respeta insets.
6. Listas sin paginación con cientos de items: scroll a 5 FPS. Pagina o virtualiza.
7. Checklist distinta en cada release: regresiones que vuelven. Congela y versiona.

## Criterios de calidad y terminado
- [ ] Mapa de pantallas/flujos completo y recorridos con postcondición por paso.
- [ ] Matriz Loading/Vacío/Datos/Error verificada por pantalla crítica.
- [ ] Móvil + PC verificados sin solapes, cortes ni botones inalcanzables.
- [ ] Strings largos/localización sin overflow; contraste y legibilidad aceptados.
- [ ] Checklist de release (<20 min) ejecutada en verde con build etiquetado.
- [ ] Cero Bloqueantes abiertos; Menores triageados con dueño.

## Herramientas
- Playtest en Studio + dispositivo real (móvil) para resoluciones.
- `Attributes` para forzar estados de UI en prueba.
- `BindableEvent` para simular eventos de sistema hacia UI en el mismo contexto.
- `roblox-testez` para lógica de estados de UI; `roblox-ci-cd` para bloquear release en rojo.

## Limitaciones
- No cubre diseño visual ni copy; verifica implementación.
- No cubre concurrencia multicliente; deriva a `roblox-multiplayer-testing`.
- Si dudas de APIs de UI o insets, anota `(verificar en create.roblox.com/docs)`.
