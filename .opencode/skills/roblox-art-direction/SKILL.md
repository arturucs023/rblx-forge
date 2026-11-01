---
name: Dirección de Arte Roblox
description: Define y protege la dirección de arte de un juego Roblox. Úsala para paletas, dirección de iluminación, lenguaje de materiales, tipografía y gates de coherencia en todo el proyecto.
---

# roblox-art-direction

Tú eres dueño del look. Escribe la dirección una vez y rechaza todo lo que se
desvíe de ella. Complementarias: `roblox-visual-design`,
`roblox-environment-art`, `roblox-reference-research`,
`roblox-visual-quality-audit`.

## Objetivo

Producir una dirección de una página: palabras de mood, paleta, luz,
materiales, tipografía. Protegerla en cada revisión de build.

## Alcance y límites

- Cubre: mood, paleta, luz, materiales, tipografía y gates de aceptación.
- NO construye (eso es `roblox-environment-art` y las skills de entorno) ni
  audita captura a captura (eso es `roblox-visual-quality-audit`): esta skill
  define el estándar contra el que se mide todo.
- Una excepción a la dirección debe escribirse en ella; lo no escrito no existe.

## Casos de uso

- Nuevo juego: fijar el look antes de construir el primer mapa.
- Deriva visual: el proyecto acumula estilos incompatibles y hay que reconducir.
- Revisión de contenido de terceros contra la identidad del juego.

## Proceso paso a paso

1. **Mood en tres palabras** (p. ej. "cálido, desgastado, golden-hour"). Cada
   decisión posterior debe servir al menos a dos de ellas.
2. **Paleta.** 3–5 `Color3` base + 1 acento. Anota hex y dónde puede aparecer
   cada uno (estructura / trim / luz / UI). Prohíbe el resto salvo revisión.
3. **Luz.** `LightingStyle`, comportamiento de `ClockTime` +
   `GeographicLatitude`, `Ambient`/`OutdoorAmbient`, `Atmosphere` (densidad,
   offset, color, decay), sombras con mapa vs voxel, un solo post-efecto para
   empezar (`Bloom` o `ColorCorrection`, con valores).
4. **Lenguaje de materiales.** Set de `Enum.Material` permitido por familia
   (piedra/madera/metal/tela/suelo) con guía de rugosidad/color; metalness
   reservada a metal de verdad. Referencia `references/materials/*` por ruta.
5. **Tipografía.** Máximo 2 familias para UI, tamaños mínimos por clase de
   dispositivo, scrims obligatorios sobre 3D.
6. **Gate.** El contenido nuevo solo pasa si cumple paleta/luz/materiales/tipo;
   las excepciones se escriben en la dirección, no se toleran en silencio.

## Conocimientos técnicos

- Color: armonía, contraste WCAG orientativo para UI, acento reservado.
- Luz Roblox: `Lighting`, `Atmosphere`, sombras y su coste en móvil.

## Buenas prácticas

- Una página, valores exactos, nada de adjetivos sin número.
- Revisa cada entrega contra los gates; deja acta de pass/fail.

## Errores frecuentes

- Un color de acento nuevo por feature (deriva de paleta); dos stacks de
  post-efectos peleando; referencias fotorrealistas aplicadas literalmente a
  builds estilizados.

## Criterios de calidad y terminado

- [ ] La dirección cabe en una página y nombra valores exactos, no adjetivos.
- [ ] Cada revisión de contenido cita pass/fail por gate.
- Verificación: una build revisada entera contra la dirección sin excepciones
  sin escribir.

## Herramientas

- Editor + `docs/ART_DIRECTION.md` del proyecto; `references/` para anclar el
  look; `capture_screenshot` para comprobar deriva.

## Limitaciones

- No impone gusto: impone coherencia con lo escrito. Si el mood está mal
  elegido, la dirección perpetúa el error (revisar mood cada milestone).

## Ejemplo: extracto de dirección

```text
Mood: warm, worn, golden-hour
Palette: Sand #E8C97A (walls), Clay #A85B2A (trim), DeepTeal #1E4A4A (accents),
         Night #14141E (UI), Gold #FFB800 (rewards only)
Light: ClockTime 17.2, OutdoorAmbient #6B5A4A, Atmosphere density 0.35,
       Future lighting, shadows on
Materials: stone=Cobblestone/Slate, wood=WoodPlanks, metal=Metal only
```
