---
name: roblox-lighting-atmosphere
description: Crea atmósfera y clima con niebla, lluvia, god-rays y post-efectos moderados. Úsala cuando necesites Atmosphere, tormentas, transiciones de clima o mood ambiental.
---

# Atmósfera y clima en Roblox

## Objetivo

Dar aire y clima al mapa: profundidad con niebla, dramatismo con tormenta o god-rays y transiciones de clima que no rompen legibilidad ni rendimiento.

## Alcance y límites

Hace: Atmosphere y niebla, lluvia/tormenta/nieve ambiental visual, god-rays y rayos de luz, transiciones de clima, post-efectos (Bloom, ColorCorrection, SunRays, DepthOfField) con moderación.

NO hace:

- Esquema día/noche base y presupuestos de farolas → `roblox-lighting-day-night`.
- Efectos de partículas ambientales (polvo, hojas, luciérnagas) → `roblox-ambient-effects`.
- Terreno y biomas → `roblox-terrain-sculpting`.
- Vegetación → `roblox-vegetation-landscaping`.
- Props y señalética → `roblox-props-decoration`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo atmósfera/clima). `roblox-visual-design` y `roblox-art-direction` dirigen (aprueban mood); esta skill ejecuta (parametriza clima). `roblox-vfx` cubre emisores técnicos (cómo funciona un emisor); esta skill cubre efectos ambientales (cuándo y cuánto clima poner).

## Casos de uso

1. Valle con niebla matinal que da profundidad sin ocultar rutas.
2. Tormenta que anuncia mazmorra final sin dejar el juego a oscuras.
3. Interior de catedral con god-rays creíbles sobre el altar.
4. Transición soleado→lluvia que acompaña un evento narrativo.
5. Mapa que abusa de Bloom y SunRays y necesita dieta de post-efectos.

## Proceso paso a paso

1. **Elige 2–3 climas, no 8.** Ej. despejado / niebla / tormenta (puntos de partida). Cada clima = ficha con niebla, luz, post-efectos y audio previsto. Verifica: un tercero distingue los 3 en capturas.
2. **Niebla primero, post-efectos después.** Densidad punto de partida: fondo se difumina a 200+ studs, ruta legible a 80. Regla: si la ruta principal desaparece, la niebla sobra aunque sea bonita.
3. **Atmosphere con contraste bajo.** Punto de partida: densidad suave, desplazamiento (offset) pequeño, colores cercanos al cielo. Ajusta de día y comprueba de noche: la niebla nocturna no debe volverse muro blanco.
4. **Lluvia/tormenta por capas.** Capa 1: oscurecido leve + niebla más densa. Capa 2: sonido y destellos (con audio). Capa 3: lluvia visible solo cerca del jugador (radio punto de partida 60 studs). Nunca lluvia en todo el mapa a la vez.
5. **God-rays con geometría + luz.** Haz visible = SpotLight o SurfaceLight + volumen claro (polvo en `roblox-ambient-effects`) + SunRaysEffect suave. Verifica: el haz se ve desde el ángulo del jugador, no solo en editor.
6. **Post-efectos con moderación y orden.** Orden punto de partida: ColorCorrection (base) → Bloom (bajo) → SunRays (solo escenas con sol visible) → DepthOfField (solo cinemáticas/menús). Prohibido: Bloom alto + SunRays alto juntos en gameplay.
7. **Transiciones de clima en 3 fases.** Aviso (30 s: nubes/niebla suben) → clímax (clima pleno) → retorno (60 s a despejado). Duración total punto de partida 3–5 min. Graba y verifica sin saltos.
8. **Protege legibilidad.** Durante tormenta: sube SurfaceLight en letreros y salidas un paso. Test ciego: el jugador encuentra salida y lee 2 letreros en plena tormenta.
9. **Presupuesto mobile.** Niebla densa + Bloom + SunRays juntos hunden gama baja. Define nivel Mobile: niebla media, Bloom mínimo, SunRays off, lluvia solo cercana. Mide FPS en tormenta, no en despejado.
10. **Congela fichas de clima.** Guarda `CLIMA_Despejado`, `CLIMA_Niebla`, `CLIMA_Tormenta` con valores + 3 capturas cada uno. Todo evento que cambie el clima referencia una ficha, nunca valores sueltos.

## Conocimientos técnicos

- Atmosphere: densidad, offset, colores y decaimiento controlan profundidad aérea. Valores pequeños cambian mucho; ajusta de 5 en 5 (punto de partida) y captura.
- Niebla como herramienta de cierre: oculta bordes del mapa y LOD lejano mejor que muros.
- BloomEffect: brillo en altas luces; intensidad baja punto de partida (no verdad). Alto = todo quema y mobile sufre.
- ColorCorrectionEffect: contraste/saturación/tono globales; un paso sutil unifica biomas dispares.
- SunRaysEffect: resplandor alrededor del sol; solo con sol visible en pantalla; inútil y caro de noche o en interior.
- DepthOfFieldEffect: desenfoque de distancia; reservado a cinemáticas, menús y fotos. En gameplay móvil, apagado.
- Beam: útil para haces de luz estáticos (ventana, grieta) con textura suave; 1–2 por escena, no 20.

## Buenas prácticas

- Un clima memorable = un efecto dominante + resto sutil. Tres efectos dominantes = ruido.
- La niebla cuenta la hora (mañana) y el lugar (pantano, costa); no la uses igual en todas partes.
- Tormenta breve e intensa mejor que lluvia eterna y tibia.
- God-rays pocos y motivados (ventana, grieta, altar); un bosque con 30 haces parece discoteca.
- Documenta qué clima va con cada distrito/bioma en una tabla.

## Errores frecuentes

1. **Muro de niebla.** Densidad que oculta a 30 studs. Corrección: ruta legible a 80 como mínimo.
2. **Bloom nuclear.** Todo brilla, nada se lee. Corrección: baja a mínimo y sube solo hitos.
3. **SunRays de noche.** Resplandor sin sol. Corrección: apaga SunRays en presets nocturnos.
4. **Lluvia global.** Llueve igual en cueva y desierto. Corrección: lluvia por zona + radio 60 alrededor del jugador.
5. **DepthOfField en gameplay.** Todo borroso al correr. Corrección: solo cinemáticas/menús.
6. **Transición instantánea.** Sol a tormenta en 1 s. Corrección: 3 fases en 3–5 min.
7. **Tormenta injugable.** Oscuridad + ruido = abandono. Corrección: protege salidas y letreros con luz extra.

## Criterios de calidad y terminado

- [ ] 2–3 fichas de clima distinguibles por un tercero en capturas.
- [ ] Ruta legible a 80 studs en el clima más denso (foto).
- [ ] Post-efectos: nunca Bloom alto + SunRays alto juntos en gameplay.
- [ ] God-rays motivados (1–2 por escena) visibles desde ángulo de jugador.
- [ ] Transición grabada sin saltos, 3 fases documentadas.
- [ ] Test ciego en tormenta: salida + 2 letreros encontrados.
- [ ] Nivel Mobile definido y medido en tormenta con FPS aceptable.
- [ ] Fichas `CLIMA_*` guardadas con valores y capturas.

## Herramientas

- Atmosphere para niebla y profundidad aérea.
- BloomEffect / ColorCorrectionEffect / SunRaysEffect / DepthOfFieldEffect con moderación y orden fijo.
- SpotLight / SurfaceLight para haces motivados; Beam para haces estáticos (1–2 por escena).
- Lighting/ClockTime heredados de `roblox-lighting-day-night`; aquí solo se modulan por clima.

## Limitaciones

- No cubre partículas (lluvia como emisor se coordina con `roblox-ambient-effects` y `roblox-vfx`).
- No diseña ciclo día/noche base (ver skill enlazada).
- Valores de densidad e intensidad son puntos de partida, no verdad.
- Si dudas de una propiedad exacta, escribe "(verificar en create.roblox.com/docs)".
- Distingue referencia visual (foto de tormenta) de ficha importable: la ficha solo existe guardada y capturada.
