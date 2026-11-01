---
name: Auditoría de Calidad Visual Roblox
description: Pasa gates visuales con capturas en un build Roblox. Úsala en pases de arte pre-release, regresión tras cambios de lighting/materiales y legibilidad de UI.
---

# roblox-visual-quality-audit

El equivalente visual del QA de playtest: encuadra, captura, inspecciona,
puntúa, corrige, re-captura. Complementarias: `roblox-visual-design`,
`roblox-art-direction`, `roblox-mobile-playtest`, `roblox-performance-audit`
(para la mitad de coste gráfico).

## Objetivo

Puntuar un build en: coherencia artística, composición, escala, iluminación,
materiales, legibilidad de UI y rendimiento gráfico. Suspender en voz alta,
con capturas adjuntas.

## Alcance y límites

- Cubre: planificación de shots, captura, scoring 0–2 por dimensión con
  evidencia, matriz de dispositivos y bucle de corrección.
- NO corrige gameplay ni lógica (eso es QA funcional) ni mide FPS finos
  (eso es `roblox-performance-audit`): aquí se puntúa lo visible.
- Un 0 no siempre bloquea: puede registrarse como riesgo aceptado.

## Casos de uso

- Pase de arte pre-release.
- Regresión tras cambiar lighting/materiales/UI.
- Decidir si un área está lista para captura promocional.

## Proceso paso a paso

1. **Planifica shots.** 3–6 vistas nombradas (spawn, landmark, interior,
   momento con UI densa, noche si aplica). Encuadra cada una con
   `selection view` sobre un part o la instancia exacta.
2. **Captura.** `capture_screenshot` (png para cheques de legibilidad de
   texto) durante playtest para verdad runtime; capturas en Edit solo para
   geometría cruda.
3. **Puntúa cada shot 0–2** por dimensión con una línea de evidencia:
   - Coherencia vs dirección (gates de paleta/material/tipo).
   - Composición (foco, frente/medio/fondo, sin clutter accidental).
   - Escala (referenciada al avatar: puertas ~2x altura, barandillas, escalones).
   - Iluminación (mood correcto, caras/HUD legibles, sin zonas negras jugables).
   - Materiales (sin extensiones de un solo material, trims donde se juntan).
   - UI (sizing por escala, safe insets, contraste sobre 3D, mínimos en móvil).
   - Coste gráfico (top de `get_scene_analysis` para la zona del shot).
4. **Dispositivos.** Repite shots clave con `capture_device_matrix` (presets
   phone + tablet); fallos de UI en pantallas pequeñas bloquean release.
5. **Bucle de fix.** Peor dimensión primero, un cambio, re-captura el MISMO shot.

## Conocimientos técnicos

- Lectura de capturas: píxeles, no memoria. Legibilidad de texto en 1x.
- Gates de la dirección de arte como rubric.

## Buenas prácticas

- Planifica los shots por escrito antes de capturar.
- Una dimensión por iteración; mismo shot para comparar.

## Errores frecuentes

- Auditar capturas de Edit y perder issues solo-runtime (escalado de
  `PlayerGui`, streaming pop-in, lighting nocturno en play).
- Puntuar de memoria en vez de los píxeles capturados; aprobar legibilidad
  desde un preview reducido.

## Criterios de calidad y terminado

- [ ] Todos los shots planificados capturados, inspeccionados y puntuados con evidencia.
- [ ] Cada item con 0 corregido y re-capturado, o registrado como riesgo aceptado.
- [ ] Los shots de UI en preset phone pasan legibilidad.
- Verificación: cita puntuaciones + evidencia por shot; adjunta antes/después
  en los fixes. Si la sesión no puede mostrar imágenes: marca como NOT VERIFIED.

## Herramientas

- MCP: `selection`/`view`, `capture_screenshot`, `capture_device_matrix`,
  `get_scene_analysis`; `docs/ART_DIRECTION.md` como rubric.

## Limitaciones

- No sustituye al profiler para números de rendimiento.
- Requiere Studio abierto con el place; sin él no hay shots.
