---
name: roblox-vegetation-landscaping
description: Distribuye vegetación natural con densidad controlada y colisiones baratas. Úsala cuando necesites bosques, parques, jardines o paisajismo con rendimiento mobile.
---

# Vegetación y paisajismo en Roblox

## Objetivo

Crear cobertura vegetal que parezca natural, guíe al jugador y mantenga el framerate: distribución por capas, densidad ajustada a dispositivo y colisiones mínimas.

## Alcance y límites

Hace: diseño de comunidades vegetales, distribución natural (manchas, bordes, claros), densidad vs rendimiento, colisiones y bloqueo vegetal, jardines y parques formales.

NO hace:

- Escultura del relieve base → `roblox-terrain-sculpting`.
- Materiales y variantes globales → `roblox-materials-surfaces`.
- Clima, niebla y estaciones → `roblox-lighting-atmosphere`.
- Efectos ambientales (hojas, polen, luciérnagas) → `roblox-ambient-effects`.
- Parques como nodo urbano (plazas, zonificación) → `roblox-city-settlements`.
- Props y señalética de parque → `roblox-props-decoration`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo vegetación/paisaje). `roblox-visual-design` y `roblox-art-direction` dirigen (paleta vegetal y estilo); esta skill ejecuta (planta y optimiza).

## Casos de uso

1. Bosque transitable con claros y bordes legibles.
2. Parque urbano con césped, arbolado y parterres formales.
3. Jardín de mansión con ejes y setos recortados.
4. Selva densa que bloquea sin muros visibles.
5. Mapa que va a 20 FPS por exceso de árboles: dieta vegetal.

## Proceso paso a paso

1. **Define 3–5 especies, no 20.** Ej. árbol alto, árbol medio, arbusto, hierba, (punto de partida). Cada especie = 1 Model reutilizable (`VEG_Roble_A`). Verifica: todas caben en una captura comparativa a igual escala.
2. **Asigna especie a bioma.** Tabla especie→bioma→densidad (ej. roble en bosque templado, palmera en costa). Prohíbe especies fuera de su bioma salvo jardín formal justificado.
3. **Planta por capas.** Dosel (árboles altos) → sotobosque (medios/arbustos) → suelo (hierba/flores). Regla: nunca suelo desnudo >15 studs en bioma vegetal sin motivo (claro, camino, roca).
4. **Usa manchas y bordes, no rejilla.** Manchas punto de partida 20–40 studs, densidad alta dentro y borde difuso (densidad decreciente en 10 studs). Verifica cenital: sin filas ni rejillas visibles.
5. **Deja claros jugables.** Claro punto de partida 20×20 cada 60–80 studs de bosque para combate/descanso/cámara. Marca claros en el plano antes de plantar.
6. **Ajusta densidad por dispositivo.** Define 3 niveles: Alta (PC), Media, Baja (mobile) con conteo (punto de partida: 100%/60%/35%). Prueba en el peor dispositivo objetivo y fija el nivel por defecto.
7. **Colisiones mínimas.** Troncos gruesos con colisión cilíndrica simple; ramas, hojas, hierba y flores sin colisión. Arbustos-barrera con una Part invisible por grupo, no por hoja.
8. **Bloquea con vegetación.** Seto/muro verde punto de partida 4–6 studs de fondo para cerrar pasos; verifica que el avatar no lo atraviesa ni lo salta (altura punto de partida ≥8).
9. **Jardín formal con geometría.** Ejes, simetría y setos recortados (Parts verdes) + 1 focal (fuente/estatua). Riego visual: parterres con borde (punto de partida 1 stud) para lectura.
10. **QA de rendimiento y lectura.** Cuenta instancias por chunk, mide FPS en ruta estándar, recorre de noche (¿se ve el camino?). Reduce primero lo que no se ve desde rutas.

## Conocimientos técnicos

- MeshPart para árboles repetidos: mismo mesh + variación de escala/rotación (punto de partida ±15%) da variedad barata.
- Transparencia de hojas: texturas con alfa multiplican overdraw; en mobile prefiere copas sólidas de baja transparencia.
- Draw calls: 3 especies repetidas 200 veces rinden mejor que 20 especies únicas; reutiliza Models.
- Colisiones: CanCollide off en todo lo que no bloquee; una Part invisible por macizo sustituye 20 colisiones.
- Decal/Texture: para일로 césped lejano o parterres planos; no sustituyen volumen de cerca.
- Highlight: no para vegetación permanente; solo eventos (marcar árbol objetivo temporalmente).
- Viento: el movimiento de copas es efecto (con `roblox-ambient-effects`); aquí solo distribución estática.

## Buenas prácticas

- Planta desde la ruta del jugador hacia fuera: lo cercano detallado, lo lejano sugerido.
- Varía rotación y escala, nunca el mesh base: coherencia + batching mental.
- Bordes de camino limpios 2–3 studs sin vegetación con colisión para cámara.
- Paleta vegetal limitada: 3 verdes + 1 acento flor; más verdes = ruido.
- Nombra `VEG_*` y agrupa por chunk (`CHUNK_A1/VEG`) para dietas rápidas por zona.

## Errores frecuentes

1. **Rejilla de árboles.** Plantación en cuadrícula perfecta. Corrección: manchas + jitter de posición.
2. **20 especies.** Cada árbol único = memoria y caos. Corrección: reduce a 5 y varía escala.
3. **Todo con colisión.** Hierba que frena al avatar. Corrección: colisión solo en troncos y barreras.
4. **Muro invisible.** Seto que se atraviesa. Corrección: fondo 4–6 studs + Part invisible + altura ≥8.
5. **Selva a 15 FPS.** Densidad PC en mobile. Corrección: aplica nivel Baja (35%) y mide.
6. **Hojas transparentes masivas.** Overdraw en mobile. Corrección: copas sólidas o semi en zonas clave.
7. **Sin claros.** Bosque intransitable y oscuro. Corrección: claro 20×20 cada 60–80 studs.

## Criterios de calidad y terminado

- [ ] ≤5 especies, cada una como Model `VEG_*` reutilizable.
- [ ] Cenital sin rejillas; manchas 20–40 con borde difuso.
- [ ] Claros 20×20 cada 60–80 studs marcados en plano.
- [ ] 3 niveles de densidad definidos y probado el nivel mobile (FPS objetivo cumplido).
- [ ] Colisión solo en troncos/barreras; hierba/flores sin colisión (auditoría por chunk).
- [ ] Bloqueos vegetales infranqueables a pie y de un salto (test con avatar).
- [ ] Camino visible de día y de noche (2 capturas por ruta).
- [ ] Paleta vegetal ≤3 verdes + 1 acento aplicada.

## Herramientas

- Models/MeshPart para especies reutilizables; Parts invisibles para barreras.
- MaterialService / MaterialVariant para troncos y follaje coherentes (paleta en `roblox-materials-surfaces`).
- Decal/Texture para suelo lejano y parterres planos.
- Coordinación con Terrain (suelo) y ParticleEmitter (hojas/polen en `roblox-ambient-effects`).

## Limitaciones

- No cubre esculpido de terreno ni clima/estaciones (ver skills enlazadas).
- Conteos y porcentajes de densidad son puntos de partida, no verdad: manda la medición en dispositivo real.
- No afirmes que un pack de árboles existe sin crearlo o localizarlo; distingue foto de referencia de asset importable.
- Si dudas de un límite de render (instancias, transparencia), escribe "(verificar en create.roblox.com/docs)".
