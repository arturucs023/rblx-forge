# Estándares de calidad

## Puertas (ningún release las salta)

1. **Estructural**: jerarquía en contenedores canónicos, nombres semánticos,
   fuentes releídas, wiring de remotes en ambos extremos.
2. **Runtime**: 0 errores relacionados en logs; líder stats y estados
   verificados por `eval` en el peer correcto.
3. **Visual** (`roblox-visual-quality-audit`): shots planificados, puntuación
   0–2 por dimensión con evidencia; 0s corregidos o aceptados por escrito;
   UI móvil legible.
4. **Seguridad** (`roblox-security-audit`): tabla de hallazgos; críticos
   re-probados con sondas maliciosas.
5. **Rendimiento** (`roblox-performance-audit`): baseline + after con las
   mismas capturas; móvil + red pobre jugable.
6. **Limpieza**: playtests detenidos (`idle`), simulación reseteada, plantilla
   Edit intacta (UI deshabilitada, sin restos de prueba).

## Niveles de evidencia

`VERIFIED` (lectura MCP) · `VISUALLY VERIFIED` (imagen inspeccionada) ·
`PLAYTEST VERIFIED` (efecto observado en vivo) · `CODE VERIFIED` (fuente
releída, sin ejecutar) · `NOT VERIFIED` (qué lo probaría). Prohibido declarar
"funciona" desde `"success": true` o desde la existencia de un objeto.
