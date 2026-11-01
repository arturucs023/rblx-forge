# Sistema de diff (FASE 3D)

## Implementación

`src/lib/diff.ts`: LCS línea a línea con tope anti-cuelgue (3000 líneas;
si se supera devuelve `null` y la UI lo dice). `DiffViewer.tsx` muestra
`+`/`-`/contexto con conteos. No es análisis semántico: un refactor
idéntico en distinto orden aparece como cambio.

## Usos reales

- Editor: "Diff vs disco" compara el borrador sin guardar con el archivo
  en disco (fuente de verdad, releída al abrir).
- Comparación archivo-archivo: pendiente (el componente lo soporta; falta
  selector dual en el Explorador).

## Verificación

`src/lib/diff.test.ts` (vitest): idéntico, inserción+borrado, tope con
fixture de 4000 líneas. 9/9 tests frontend en verde.

## No implementado (honesto)

Historial de versiones y "quién cambió qué": Forge no versiona archivos
(el diff compara estados, no autoría). Atribución a OpenCode solo cuando el
evento MCP la trae; jamás se inventa el origen. Sin reversión destructiva:
guardar es explícito y el disco manda.
