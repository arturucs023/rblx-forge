---
name: Arte de Entornos Roblox
description: Construye entornos Roblox con iluminación, materiales y composición deliberadas. Úsala para decisiones Terreno-vs-parts, setups de LightingService, atmósfera, día-noche, clima y staging exterior/interior.
---

# roblox-environment-art

Skill de ejecución para el look definido en `roblox-art-direction`,
informada por `references/`. Complementarias: `roblox-terrain-sculpting`,
`roblox-vegetation-landscaping`, `roblox-lighting-day-night`,
`roblox-lighting-atmosphere`, `roblox-materials-surfaces`,
`roblox-props-decoration` (especialistas por subsistema),
`roblox-world-building`, `roblox-world-level-design`, `roblox-visual-design`.

## Objetivo

Entregar espacios legibles y performantes: exteriores/interiores con luz
motivada, sets de materiales creíbles y composición que guía al jugador.

## Alcance y límites

- Cubre: integración de terreno+arquitectura+luz+materiales+staging en un área.
- NO sustituye a los especialistas (terreno, vegetación, iluminación,
  materiales, props): los coordina. Para profundidad en un subsistema, deriva.
- NO define dirección (eso es `roblox-art-direction`).

## Casos de uso

- Montar un área nueva que combine terreno, edificios, luz y props.
- Diagnosticar por qué una zona se ve plana o ilegible.
- Preparar una zona para captura promocional o playtest.

## Proceso paso a paso

1. **Suelo primero.** Terrain para lo orgánico (esculpe con el editor y ajusta
   densidad de decoración `Water*` y `Grass`); parts para arquitectura. Nunca
   un solo `BasePart` de más de 2048 studs: divide en tiles.
2. **Ilumina la escena.**
   - Fija `ClockTime`, `Ambient`/`OutdoorAmbient`, `Brightness` según dirección.
   - `Atmosphere`: density/offset/color/decay para profundidad; `Bloom`
     threshold ~1 para neón/noche, off o sutil de día.
   - Sombras: Future lighting en escritorio; verifica que los fallbacks de
     móvil sigan legibles.
   - Interiores: una luz clave por sala (ventana/lámpara), relleno frío,
     prácticas cálidas; nunca ambient plano a tope.
3. **Materiales.** Asigna del set permitido; rompe superficies planas grandes
   con trims, vigas o variación de textura. El suelo necesita al menos dos
   tonos (camino vs campo) o se lee como vacío.
4. **Staging.** Primer plano que enmarca (arco/ramas), sujeto en medio,
   silueta de fondo (montañas/ciudad según `references/terrain/*`). Landmarks
   visibles desde el spawn; caminos obvios sin señalética.
5. **Día-noche/clima (solo si el juego lo necesita).** Mueve `ClockTime`
   desde un script de servidor, replica un solo valor, los clientes renderizan.
   Mantén la noche legible: sube el suelo de `Ambient` y añade luces
   prácticas; la oscuridad no es dificultad.
6. **Chequeo de coste.** `get_scene_analysis` tras cada área; la decoración
   es la sospechosa habitual: reduce densidad a la mitad antes de tocar sistemas.

## Conocimientos técnicos

- Terreno vs parts, Lighting + Atmosphere, presupuestos de instancias y
  sombras, streaming para mapas extensos.

## Buenas prácticas

- Un área cada vez, con captura y coste registrados antes de pasar a la siguiente.
- Luz motivada siempre: cada fuente visible o justificable.
- Reutiliza kits (`roblox-modular-building`) en vez de modelar único.

## Errores frecuentes

- Terreno pintado pero sin iluminar (sin atmósfera/niebla → plano); interiores
  con un `PointLight` por pared (sopa de luz); builds nocturnos injugables en
  brillo móvil; niebla que oculta el landmark que el nivel necesita.

## Criterios de calidad y terminado

- [ ] Valores anotados (ClockTime, Ambient, Atmosphere, efectos) por área.
- [ ] Captura a altura de ojos inspeccionada; landmark visible desde spawn.
- [ ] Coste de escena comprobado; móvil sigue legible.
- Verificación: relee propiedades de lighting + captura por área; cita ambas.

## Herramientas

- MCP: `execute_luau` para valores, `capture_screenshot`,
  `get_scene_analysis`; editor de Terrain; `references/`.

## Limitaciones

- No genera assets: compone con lo existente o lo derivado a especialistas.
- El clima/efectos pesados deben pasar el gate móvil o recortarse.

## Ejemplo: valores de exterior golden-hour

```lua
local Lighting = game:GetService("Lighting")
Lighting.ClockTime = 17.2
Lighting.Ambient = Color3.fromRGB(70, 60, 55)
Lighting.OutdoorAmbient = Color3.fromRGB(107, 90, 74)
Lighting.Atmosphere.Density = 0.35
Lighting.Atmosphere.Color = Color3.fromRGB(230, 200, 160)
```
