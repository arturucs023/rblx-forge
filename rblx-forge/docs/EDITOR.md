# Editor Luau (FASE 5)

## Implementación

Monaco (`@monaco-editor/react`) con lenguaje `lua` (base incluida; Luau
añade tipos/`--!strict` que el resaltado no distingue: declarado, no fingido
como "soporte Luau completo"). Pestañas, Ctrl+S, minimapa, búsqueda/reemplazo
nativos de Monaco, diff vs disco (`DiffViewer`).

## Inteligencia real (y límites honestos)

- Sin autocompletado semántico, hover tipado, go-to-definition ni symbol
  search: no hay language server Luau integrado. No se simulan.
- Diagnósticos 100% reales: `tool_run` ejecuta StyLua/Selene vendoreados sobre
  el archivo guardado; `diagnostics.ts` parsea su salida (clic → `revealLine`).
  Fixtures de test capturadas de ejecuciones reales.
- Formato: `stylua` escribe el archivo y se relee de disco.
- Enviar a OpenCode: "Explicar en Asistente" vuelca la selección/código como
  borrador del chat; OpenCode edita archivos reales y los cambios aparecen al
  refrescar (watcher + diff). No hay IA paralela.

## Verificación

`npm run test`: parsers con fixtures reales (9/9). `cargo test`: stylua/selene
ejecutados de verdad. Manual pendiente: editar→guardar→formatear→diagnóstico
clicable en la app.
