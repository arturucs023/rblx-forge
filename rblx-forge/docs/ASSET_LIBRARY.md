# Biblioteca de assets (FASE 6)

## Implementación

`Library.tsx` + índice derivado `src/assets/references-index.ts` (16 entradas;
fuente de verdad: `docs/REFERENCE_LIBRARY.md` del workspace). Imágenes reales
del disco vía `convertFileSrc` (asset://); verificación de existencia por
archivo; favoritos persistentes (`library.favorites`); metadatos + licencia +
fuente original (apertura con plugin-opener).

## Taxonomía honesta (sistema, no promesas)

1. Referencias visuales (las 16: fotos con licencia).
2. Imágenes de usuario (ver con cualquier visor; no analizadas).
3. Modelos 3D / texturas / materiales / sonidos / animaciones: **sin visor ni
   importación en esta fase** — el panel lo dice. No se confunde imagen con
   modelo importable.
4. Concept art: sin generador integrado (sin modelos de imagen en el agente).

## Análisis visual por IA

Forge no afirma análisis de imágenes. "Usar en Asistente" copia ruta +
metadatos al borrador del chat; el análisis real solo ocurre si el modelo
activo de OpenCode tiene visión. Limitación visible en la propia UI.

## Pendiente

Añadir/importar recursos, colecciones, detección de duplicados, asociación a
proyectos, visores de malla/audio. Formatos de importación Roblox (`.rbxm`,
Creator Store) sin investigar aún: documentado como no iniciado, no como
"próximo".
