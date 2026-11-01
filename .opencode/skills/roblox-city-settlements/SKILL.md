---
name: roblox-city-settlements
description: Planifica ciudades, pueblos y asentamientos con distritos y calles legibles. Úsala cuando necesites zonificar, trazar calles, colocar plazas/landmarks o diseñar distritos industriales y futuristas.
---

# Ciudades y asentamientos en Roblox

## Objetivo

Trazar asentamientos que el jugador navega sin mapa: distritos con identidad, calles con jerarquía, plazas como nodos y landmarks que orientan, con zonificación jugable y rendimiento por distritos.

## Alcance y límites

Hace: zonificación (residencial/comercial/cívico/industrial/futurista como distritos), jerarquía vial, plazas y nodos, landmarks y wayfinding urbano, parcelario y ritmo de manzana, identidad por distrito.

NO hace:

- Edificio singular en detalle → `roblox-exterior-architecture`.
- Interiores de esos edificios → `roblox-interior-design`.
- Escultura de Terrain y ríos/montañas → `roblox-terrain-sculpting`.
- Vegetación de parques y calles → `roblox-vegetation-landscaping`.
- Señalética fina y props → `roblox-props-decoration`.
- Clima y post-efectos → `roblox-lighting-atmosphere`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo ciudad/asentamiento). `roblox-visual-design` y `roblox-art-direction` dirigen (aprueban estilo por distrito); esta skill ejecuta (traza y zonifica). Los distritos industriales y futuristas se tratan aquí como distritos, no como skills separadas.

## Casos de uso

1. Pueblo inicial de 3 calles donde el jugador encuentra tienda, ayuntamiento y salida.
2. Ciudad media con 4 distritos con identidad propia y plaza central.
3. Asentamiento industrial (fábricas, chimeneas, vías) legible y seguro para cámara.
4. Distrito futurista (torres, pasarelas, neones moderados) sin ruido visual.
5. Ciudad existente confusa donde todos se pierden: reforma de wayfinding.

## Proceso paso a paso

1. **Fija tamaño y población jugable.** Pueblo: punto de partida 200×200 studs. Ciudad: 400×400+. Calcula: 1 landmark cada 150 studs como máximo; si el mapa es mayor, añade sub-landmarks.
2. **Define 3–5 distritos con frase-identidad.** Ej. "puerto pesquero bajo", "colina cívica blanca", "distrito forja". Cada distrito: 2 materiales + 1 color acento + altura media propias. Registra en tabla.
3. **Traza jerarquía vial en 3 niveles.** Arteria punto de partida 16 studs, calle 10, callejón 6. Dibuja primero arterias conectando entradas y plaza; verifica conectividad con recorrido sin saltos.
4. **Coloca plaza como nodo cada 150–200 studs.** Plaza punto de partida 40×40 con fuente/estatua central, bancos perimetrales y 3+ salidas. Test: desde la plaza se ven 2+ landmarks o señales.
5. **Sitúa landmarks en cruces y remates.** Torre, reloj, chimenea, arco. Regla: altura landmark ≥1,5× media del distrito y silueta única. Comprueba visibilidad a 150 studs.
6. **Parcela manzanas con ritmo.** Frente parcelario punto de partida 16–24 studs; alterna anchos para evitar monotonía. Deja patio o callejón cada 4 parcelas para cámara y atajos.
7. **Zonifica industria como distrito separado.** A sotavento visual (esquina del mapa), con vial ancho (punto de partida 16+), chimeneas como landmarks y paleta apagada + acento cálido. Buffer verde o muro con `roblox-vegetation-landscaping`.
8. **Zonifica futurista como distrito, no como ciudad entera.** Contén neones y pasarelas en 1 distrito; pasarela mínima punto de partida 6 studs ancho con barandilla 3 studs. Contraste con distrito vecino histórico para orientación.
9. **Aplica wayfinding urbano.** Cada decisión (cruce) ofrece: landmark visible, letrero (con `roblox-props-decoration`) o cambio de pavimento. Verifica con jugador nuevo: llega a plaza y a salida sin preguntar.
10. **Divide por chunks de streaming.** Un distrito = 1 carpeta/Model; nombra `DIST_Puerto`, `DIST_Forja`. Prueba carga por partes y mide draw calls por distrito (coordinar con `roblox-performance-audit` propia).

## Conocimientos técnicos

- Escala vial: avatar 5 studs; arteria 16 permite 2 flujos + cámara; callejón 6 es mínimo jugable sin atascos de cámara.
- Manzana modular: combina tramos de `roblox-exterior-architecture` (12 studs) para frentes variados con pocos assets.
- Highlight: reserva para marcar ayuntamiento o salida durante tutorial, no permanente.
- Beam/Trail: no son para ciudad base; si marcas rutas (desfile, carrera), úsalos temporales y retira.
- Terreno vs Parts: calles y plazas en Parts planas para control; Terrain solo en bordes/parques (coordinar con `roblox-terrain-sculpting`).
- Sombras y draw calls: cornisas y voladizos repetidos multiplican sombra; mide por distrito y simplifica el más caro primero.
- Streaming: distritos como unidades de carga; evita referencias cruzadas (una farola de otro distrito rompe el chunk).

## Buenas prácticas

- Una plaza buena vale por 10 letreros: invierte en nodos, no en señales.
- Contraste entre distritos vecinos (altura, color, material) para orientación inconsciente.
- Industria y futurista contenidos: un distrito cada uno como máximo salvo mapa grande.
- Calles con final visible (landmark, giro, plaza); evita calles rectas infinitas sin remate.
- Nombra todo `DIST_*`, `PLAZA_*`, `LM_*` para filtrado rápido en Explorer.

## Errores frecuentes

1. **Retícula monótona.** 10×10 calles iguales: nadie se orienta. Corrección: jerarquía + 2 diagonales o plazas que rompan la malla.
2. **Sin landmarks.** Todo a la misma altura. Corrección: 1 landmark por distrito + 1 principal.
3. **Plaza-rotonda.** Espacio redondo sin uso ni bordes activos. Corrección: centro focal + 3 salidas + bordes con tiendas/bancos.
4. **Industria en el centro.** Ruido y bloqueo. Corrección: distrito perimetral con buffer.
5. **Futurista en todas partes.** Neón global = fatiga. Corrección: contémelo a 1 distrito.
6. **Calles de 4 studs.** Atascos y cámara atorada. Corrección: mínimo 6, arterias 16.
7. **Mapa sin chunks.** Todo en una carpeta, carga pesada. Corrección: 1 carpeta por distrito.

## Criterios de calidad y terminado

- [ ] Jugador nuevo llega a plaza y a salida sin ayuda (test con 2 jugadores).
- [ ] 3–5 distritos con tabla de identidad (materiales, color, altura) aplicada.
- [ ] Landmark visible cada ≤150 studs (capturas desde 6 puntos).
- [ ] Jerarquía vial completa: arteria/calle/callejón medidos.
- [ ] Plaza cada ≤200 studs con focal y 3+ salidas.
- [ ] Industria y futurista (si existen) contenidos en sus distritos.
- [ ] 1 carpeta/Model por distrito, nombres `DIST_*`, carga por partes probada.
- [ ] Sin calles sin remate visual ni cruces sin información.

## Herramientas

- Parts/Models para trazado, manzanas y modularidad; MeshPart para landmarks repetibles.
- MaterialService / MaterialVariant para identidad por distrito (paleta en `roblox-materials-surfaces`).
- Decal/Texture para pavimentos y frentes (densidad moderada).
- PointLight/SpotLight para plazas y ejes (noche con `roblox-lighting-day-night`).

## Limitaciones

- No diseña edificios singulares ni interiores (ver skills enlazadas).
- No calcula tráfico ni economía urbana: la zonificación es visual y jugable.
- Medidas de calles y plazas son puntos de partida, no verdad.
- Distingue referencia visual (plano/foto de ciudad real) de asset importable: no afirmes que un pack existe sin crearlo o localizarlo.
