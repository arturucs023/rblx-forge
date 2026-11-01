---
name: roblox-ambient-effects
description: Añade efectos ambientales sutiles (polvo, luciérnagas, hojas, lluvia local) con storytelling. Úsala cuando necesites ambiente vivo con presupuesto mobile estricto.
---

# Efectos ambientales en Roblox

## Objetivo

Dar vida al aire con efectos sutiles —polvo, luciérnagas, hojas, lluvia local— que cuentan historia y marcan lugar, sin ruido visual ni coste mobile.

## Alcance y límites

Hace: polvo/luciérnagas/hojas/lluvia ambiental localizada, storytelling ambiental (qué cuenta cada efecto), presupuestos mobile, zonas y transiciones de efectos.

NO hace:

- Emisores técnicos en detalle (curvas, módulos) → `roblox-vfx` (cubre emisores técnicos; esta skill cubre efectos ambientales: cuándo, dónde y cuánto).
- Clima global, niebla y post-efectos → `roblox-lighting-atmosphere`.
- Ciclo día/noche base → `roblox-lighting-day-night`.
- Vegetación (plantar) → `roblox-vegetation-landscaping`.
- Props y señalética → `roblox-props-decoration`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo ambiente). `roblox-visual-design` y `roblox-art-direction` dirigen (aprueban tono); esta skill ejecuta (coloca efectos con presupuesto). `roblox-vfx` cubre emisores técnicos; esta skill cubre efectos ambientales.

## Casos de uso

1. Biblioteca con polvo en haces de luz que se siente antigua.
2. Pantano con luciérnagas y niebla baja localizadas.
3. Patio otoñal con hojas cayendo sin tapar la vista.
4. Soportal con lluvia visible fuera y refugio seco dentro.
5. Mapa con 40 emisores globales que funde mobile: dieta ambiental.

## Proceso paso a paso

1. **Asigna 1 efecto por lugar.** Tabla lugar→efecto→frase (ej. biblioteca→polvo→"abandono quieto"). Prohibido: 2 efectos compitiendo en el mismo radio de 30 studs.
2. **Localiza con radio, no global.** Cada efecto vive en un volumen (punto de partida: 20–40 studs de radio) con entrada/salida claras. Verifica: fuera del radio no se ve ni se oye.
3. **Elige el portador correcto.** Polvo: ParticleEmitter lento en haz de luz. Hojas: ParticleEmitter con caída + suelo con Decal de hojas. Luciérnagas: ParticleEmitter pequeño nocturno (+ PointLight tenue solo en 1–2 focos). Lluvia local: emisor en alero/ventana, no en cielo entero.
4. **Parametriza sutil.** Punto de partida: tasa baja (ej. 5–20/s), vida 2–4 s, tamaño pequeño, opacidad ≤0,5 (puntos de partida, no verdad). Regla: si el efecto se nota antes que la escena, baja a la mitad.
5. **Storytelling en 3 toques.** Cada efecto cuenta algo: origen (¿de dónde viene?), ritmo (¿constante o rachas?), resto (hojas en suelo, charcos). Sin resto = efecto decorativo vacío; añade 1 Decal o prop-testigo.
6. **Zonas día/noche.** Luciérnagas solo de noche, polvo solo con haz diurno, lluvia según clima (con `roblox-lighting-atmosphere`). Transición con fundido punto de partida 5–10 s, nunca on/off brusco.
7. **Presupuesto mobile estricto.** Punto de partida: ≤3 emisores visibles a la vez, ≤100 partículas simultáneas por escena, sin sombras en emisores, sin colisiones. Cuenta con el peor dispositivo y recorta primero el efecto menos narrativo.
8. **Prueba en movimiento.** Corre, gira cámara y salta dentro del volumen 60 s. Verifica: sin tirones, sin popping al entrar/salir, legible el camino (el efecto no tapa salidas ni letreros).
9. **Guarda kits.** `AMB_Polvo_Biblioteca`, `AMB_Luciernagas_Pantano` como Models con emisor + ajustes. Reutiliza kit antes de crear emisor nuevo.
10. **QA final.** Checklist en § Criterios; desactiva todos los efectos y compara capturas: la escena debe funcionar sin ellos (son capa, no muleta).

## Conocimientos técnicos

- ParticleEmitter: tasa, vida, velocidad, tamaño y transparencia definen el efecto. Tasa baja + vida media = ambiente; tasa alta = evento (aquí no).
- PointLight en efectos: máximo 1–2 por escena (luciérnagas foco, farol con insectos); nunca un PointLight por partícula.
- Beam: hilos de lluvia localizada, telarañas con rocío o haces tenues; 1–2 por escena con textura suave.
- Trail: estelas de hojas o chispas en movimiento; reservado a 1 foco narrativo, no a ambiente general.
- Highlight: no es efecto ambiental; prohibido como sustituto de luz o clima.
- Distancia de render: emisores con alcance corto (punto de partida 40–60 studs); más allá, sugieren con Decal/niebla, no con partículas.
- Coordinación: el clima global lo pone `roblox-lighting-atmosphere`; aquí solo su manifestación local (lluvia bajo el alero, polvo en el haz).

## Buenas prácticas

- Sutilidad como norma: el jugador nota el lugar, no el emisor.
- Un efecto memorable por distrito; el resto, silencio visual.
- Efectos que respetan gameplay: nunca sobre salidas, letreros ni zonas de combate intenso.
- Noche y lluvia multiplican el valor del efecto: concéntralos ahí.
- Documenta radio, tasa y frase narrativa de cada emisor en su nombre o nota.

## Errores frecuentes

1. **Emisor global.** Polvo en todo el mapa. Corrección: radio 20–40 por lugar.
2. **Tasa de evento.** 200/s para "ambiente". Corrección: 5–20/s y opacidad ≤0,5.
3. **Luciérnagas de día.** Visibles a mediodía como ruido. Corrección: solo noche + fundido.
4. **Efecto que tapa.** Hojas que ocultan salida. Corrección: despeja salidas y letreros.
5. **40 emisores.** Mobile fundido. Corrección: ≤3 visibles a la vez, kits reutilizados.
6. **Sin resto.** Lluvia sin charcos, hojas sin suelo. Corrección: añade Decal/prop-testigo.
7. **On/off brusco.** Efecto que parpadea al entrar. Corrección: fundido 5–10 s.

## Criterios de calidad y terminado

- [ ] 1 efecto por lugar con frase narrativa; sin competencia en 30 studs.
- [ ] Radios 20–40 definidos; fuera del radio no se percibe (test).
- [ ] Parámetros sutiles (tasa/vida/opacidad) documentados como puntos de partida.
- [ ] Resto visible (Decal/prop) por cada efecto continuo.
- [ ] Transiciones día/noche/clima con fundido 5–10 s, sin cortes.
- [ ] Presupuesto mobile: ≤3 emisores y ≤100 partículas por escena, medido en peor dispositivo.
- [ ] Camino, salidas y letreros legibles dentro del efecto (fotos).
- [ ] Escena funciona sin efectos (comparativa on/off archivada).

## Herramientas

- ParticleEmitter como portador principal (tasas bajas, vidas medias).
- PointLight (1–2 focos), Beam (1–2 hilos/haces) y Trail (1 foco) con moderación.
- Decal/Texture para restos (hojas en suelo, charcos, polvo asentado).
- Coordinación con Atmosphere/niebla (`roblox-lighting-atmosphere`) y haz de luz (`roblox-lighting-day-night`).

## Limitaciones

- No cubre VFX de gameplay (impactos, habilidades, magias) ni emisores técnicos avanzados (ver `roblox-vfx`).
- Tasas, radios y conteos son puntos de partida, no verdad: manda la medición mobile.
- Si dudas de un límite del motor, escribe "(verificar en create.roblox.com/docs)".
- Distingue referencia visual (vídeo de luciérnagas reales) de kit importable: el kit solo existe si está guardado como Model.
