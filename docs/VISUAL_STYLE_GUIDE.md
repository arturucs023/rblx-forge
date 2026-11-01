# Guía de estilo visual

Principios ejecutables (dirección completa en `docs/ART_DIRECTION.md`;
procedimiento en skills `roblox-visual-design` / `roblox-environment-art`).

1. **Foco**: cada vista tiene un sujeto; 3 capas (frente/medio/fondo).
2. **Paleta**: 3–5 bases + 1 acento (reservado a recompensas/llamadas). Nada más
   sin excepción escrita.
3. **Luz con motivo**: cada sala un key light; exteriores con hora fija y
   `Atmosphere` para profundidad. Interiores nunca a ambient plano.
4. **Materiales honestos**: set permitido por familia (piedra/madera/metal/tela);
   metal solo donde hay metal; romper superficies grandes con trims.
5. **Escala por avatar**: puertas ~2× avatar, barandillas y escalones legibles,
   landmarks visibles desde el spawn.
6. **UI legible**: escala primero (`Scale`, no solo `Offset`), insets seguros,
   scrims sobre 3D, `TextScaled` + clamps, tamaños mínimos en móvil.
7. **Rendimiento es estilo**: sombras y Future lighting donde aporten; decoración
   con densidad medida (`get_scene_analysis`), no a ojo.

Toda decisión se propone con captura antes/después; lo que no mejora la
crítica escrita se revierte.
