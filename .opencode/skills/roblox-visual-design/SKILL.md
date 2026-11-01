---
name: Diseño Visual Roblox
description: Analiza y mejora el diseño visual de una construcción Roblox. Úsala para revisiones de composición, color, iluminación, materiales, escala y legibilidad contra referencias y capturas de Studio.
---

# roblox-visual-design

Lo comercial también es funcionalidad. Juzga como jugador y revisor, propone
como director de arte, verifica con capturas. Complementarias:
`roblox-reference-research`, `roblox-art-direction`, `roblox-environment-art`,
`roblox-visual-quality-audit`, `roblox-user-interfaces`.

## Objetivo

Evaluar y mejorar: composición, armonía de color, mood de iluminación,
credibilidad de materiales, proporciones/escala frente al avatar y legibilidad
de UI sobre 3D.

## Alcance y límites

- Cubre: crítica registrada, propuesta con valores concretos y comparación
  antes/después con capturas.
- NO ejecuta construcción (eso es `roblox-environment-art` y las skills de
  arquitectura/entorno) ni define la dirección (eso es `roblox-art-direction`):
  esta skill diagnostica y propone.
- NO aprueba UI sin prueba en runtime (`PlayerGui`).

## Casos de uso

- Un mapa "funciona" pero se ve plano, vacío o ilegible.
- Revisión visual antes de publicar o tras un cambio de lighting/materiales.
- Decidir entre dos variantes de look con criterio y evidencia.

## Proceso paso a paso

1. **Reúne evidencia.** Encuadra el sujeto (`selection` + `view`), toma
   `capture_screenshot` e inspecciona la imagen tú mismo. Trae 1–3 referencias
   de `references/` para el look objetivo; cita sus rutas.
2. **Critica por escrito** (una línea cada una): punto focal, paleta (cuenta
   tonos distintos), dirección de luz + sombras, contraste de materiales
   (rugoso vs liso, mate vs metal), legibilidad de escala (alturas de puertas,
   barandillas vs avatar), profundidad (frente/medio/fondo).
3. **Propón.** Cambios concretos con valores: `Lighting.ClockTime`,
   colores `Ambient`/`OutdoorAmbient`, `Atmosphere.Density`, cambios de
   material, trims de acento, distancias de niebla. Pasos pequeños y coherentes,
   una captura por paso.
4. **Compara.** Pon el razonamiento antes/después junto a la nueva captura;
   conserva lo que mejore mediblemente las líneas de crítica, revierte el resto.

## Conocimientos técnicos

- Lectura visual: foco, jerarquía, ritmo de color, luz motivada, escala avatar.
- `Lighting`, `Atmosphere`, materiales y su interacción en legibilidad.

## Buenas prácticas

- Critica por escrito ANTES de cambiar; si no está escrito, no existe.
- Un cambio cada vez, una captura cada vez.
- Cita referencias por ruta, no por impresión.

## Errores frecuentes

- `Ambient` a tope que mata el mood; builds de un solo material (todo
  SmoothPlastic se lee como juguete, no como estilo).
- Texto sobre fondos ocupados sin scrims; UI solo-Offset que rompe en móvil.
- Juzgar la iluminación solo desde la cámara del editor: comprueba siempre la
  vista del jugador.

## Criterios de calidad y terminado

- [ ] Crítica registrada antes de cambiar; referencias citadas por ruta.
- [ ] Cada cambio tiene una captura inspeccionada por el agente.
- [ ] El look final coincide con el documento de dirección (`roblox-art-direction`).
- Verificación: captura + nota de contenido inspeccionado por cambio; prueba
  runtime en `PlayerGui` para cualquier afirmación de UI.

## Herramientas

- MCP: `selection` (+`view`), `capture_screenshot`, `capture_device_matrix`
  para variantes de dispositivo. Biblioteca local `references/`.

## Limitaciones

- Si la sesión actual no puede mostrar imágenes, dilo explícitamente y marca
  cada afirmación visual como NOT VERIFIED. Nunca describas una imagen que no
  inspeccionaste; nunca presentes un concept generado como captura del juego.

## Honestidad visual (obligatorio)

Ver `Limitaciones`: fingir inspección invalida toda la revisión.
