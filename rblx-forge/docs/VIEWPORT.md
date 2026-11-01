# Viewport (FASE 8 — investigación + comparador honesto)

## Opciones investigadas y veredicto

1. **Embebido de Roblox Studio**: imposible — Studio no expone viewport
   integrable (sin API de embedding; el "viewport" es su ventana nativa).
   Descartado sin simularlo.
2. **Render 3D propio (three.js/babylon) desde el proyecto Rojo**: viable
   parcial (leer `tree` + meshes... pero `.rbxm`/mallas requieren parser
   propio y materiales de Roblox no son reproducibles). No iniciado: sería un
   visor aproximado, nunca "Studio". Registrado como vía futura con esa
   advertencia.
3. **Capturas reales**: única vía fiel hoy — vía sesión de agente OpenCode
   (MCP `capture_screenshot`, coste de modelo + Studio abierto). No
   automatizada en Forge: el Asistente puede pedirla, pero la imagen vuelve al
   modelo, no a un archivo que Forge muestre. Documentado, no fingido.
4. **Comparador de capturas aportadas por el usuario**: IMPLEMENTADO
   (`Viewport.tsx`): dos imágenes locales lado a lado con metadatos
   (dimensiones reales). Útil para antes/después manuales.

## Inspector avanzado asociado

Jerarquía Rojo + propiedades de scripts vía `rojo_tree` y editor (FASE 4/5).
Atributos de instancias en vivo: pendientes de protocolo en vivo (ver
`ROBLOX_MCP.md`).
