---
name: roblox-terrain-sculpting
description: Esculpe terreno creíble con biomas, ríos y montañas por chunks. Úsala cuando necesites Terrain, transiciones de bioma, mapas extensos o relieve jugable.
---

# Escultura de terreno en Roblox

## Objetivo

Construir relieve jugable y legible: montañas que se pueden subir, ríos que se pueden cruzar, biomas con transiciones creíbles y mapas extensos divididos en chunks con coste controlado.

## Alcance y límites

Hace: planificación de relieve, esculpido con editor de Terrain, biomas y transiciones, ríos/lagos/montañas, caminos y pendientes jugables, división en chunks para mapas extensos.

NO hace:

- Edificios sobre el terreno → `roblox-exterior-architecture`.
- Ciudades y zonificación → `roblox-city-settlements`.
- Vegetación y paisajismo → `roblox-vegetation-landscaping`.
- Paleta de materiales global → `roblox-materials-surfaces`.
- Atmósfera, niebla y clima → `roblox-lighting-atmosphere`.
- Efectos ambientales (hojas, polvo) → `roblox-ambient-effects`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo terreno). `roblox-visual-design` y `roblox-art-direction` dirigen (aprueban biomas y paleta); esta skill ejecuta (esculpe y transiciona).

## Casos de uso

1. Isla inicial con playa, colina y río cruzable.
2. Valle con 3 biomas (pradera/bosque/roca) y transiciones suaves.
3. Cordillera de fondo que cierra el mapa sin coste jugable.
4. Mapa extenso 800+ studs dividido en chunks con LOD visual.
5. Terreno existente impracticable (pendientes imposibles, agua estancada).

## Proceso paso a paso

1. **Dibuja mapa de alturas en 2D.** Bosqueja en papel o imagen: agua (azul), llano (verde), colina (amarillo), montaña (marrón). Fija punto más alto y más bajo antes de tocar el editor.
2. **Bloquea masas con pincel grande.** Tamaño punto de partida grande (ej. 1/3 del mapa), fuerza baja. Solo 3 niveles: agua, llano, alto. Verifica: captura cenital legible en 3 manchas.
3. **Pinta biomas en manchas, no en píxeles.** Cada bioma = elipse de 60+ studs con material Terrain dominante + 1 secundario. Regla: ningún cambio de material en franjas <10 studs (evita ruido).
4. **Crea transiciones con banda intermedia.** Entre roca y hierba, banda de tierra/grava punto de partida 8–15 studs. Pinta con opacidad baja y 2–3 pasadas; verifica a ras de suelo, no solo cenital.
5. **Esculpe ríos de arriba abajo.** Cauce punto de partida 6–10 studs ancho, profundidad 3–5 bajo la orilla, pendiente continua sin escalones. Test: recorre el río andando; si hay saltos, suaviza.
6. **Montañas por capas.** Base ancha → hombros → cima. Pendiente jugable punto de partida ≤45° en rutas marcadas; pared >60° solo como fondo no escalable con barrera visual (rocas, niebla).
7. **Caminos y pendientes jugables.** Camino punto de partida 6–8 studs, pendiente que el avatar sube sin saltar (prueba con avatar base, sin gear). Añade zigzag donde la pendiente falle.
8. **Agua cerrada y legible.** Lagos con orilla completa (sin fugas visuales), profundidad legible por color. Verifica: el jugador distingue vadeable (<3 studs) de profundo a simple vista.
9. **Divide mapa extenso en chunks.** Cuadrícula punto de partida 200×200 studs por chunk/carpeta (`CHUNK_A1`). Bordes con solape visual (colina o bosque) para ocultar cortes. Prueba cargar por chunks.
10. **QA de recorrido y coste.** Corre, salta y nada 10 min; registra atascos, caídas y zonas feas. Mide tamaño de Terrain y reduce detalle en fondo no jugable primero.

## Conocimientos técnicos

- Terrain editor: pinceles de esculpir, suavizar, pintar y agua. Trabaja siempre de grande a pequeño y de suave a detalle; el detalle prematuro se pierde al suavizar.
- Materiales de Terrain: paleta limitada del motor; elige 3–5 y repite (coordinar con `roblox-materials-surfaces`). Menos materiales = transiciones más limpias.
- Pendientes: el avatar sube pendientes moderadas; por encima de ~45° necesita saltos o zigzag (punto de partida, verificar en create.roblox.com/docs si dudas).
- Agua de Terrain: volumen con nivel; evita láminas finas sobre vacío (se ven fugas). Orilla con banda de arena/grava para lectura.
- Chunks: división lógica (carpetas + solapes visuales), no física del motor salvo streaming; documenta qué chunk contiene cada bioma.
- Colisiones: el Terrain colisiona por defecto; añade Parts invisibles solo en bordes y cimas-fondo para bloquear salidas.
- Rendimiento: el detalle fino en todo el mapa cuesta; concentra resolución visual en 150 studs alrededor de rutas.

## Buenas prácticas

- Guarda una copia del terreno antes de cada fase (nombre con fecha): el esculpido no tiene deshacer infinito fiable.
- Niebla y fondo montañoso ocultan el borde del mapa mejor que un muro.
- Repite 3–4 formaciones (colina tipo, orilla tipo) en vez de esculpir 20 únicas.
- Pinta siempre con referencia de día neutro (ClockTime punto de partida 14, no verdad); de noche todo parece otro bioma.
- Documenta materiales por bioma en una tabla visible para quien añada vegetación después.

## Errores frecuentes

1. **Espagueti de materiales.** 8 materiales mezclados en 30 studs. Corrección: 2 por bioma + banda intermedia.
2. **Río con escalones.** Agua en terrazas inconexas. Corrección: pendiente continua de arriba abajo.
3. **Montaña-escalera.** Terrazas de 90° imposibles. Corrección: suavizar + ruta en zigzag.
4. **Playa sin orilla.** Agua cortada contra hierba. Corrección: banda de arena 6–10 studs.
5. **Mapa de un chunk.** 800 studs en una pieza inmanejable. Corrección: cuadrícula 200×200.
6. **Fondo jugable.** El jugador sube a la montaña-fondo y ve el vacío. Corrección: barrera de rocas + niebla.
7. **Detalle prematuro.** Textura fina antes de masas. Corrección: volver a pincel grande y re-bloquear.

## Criterios de calidad y terminado

- [ ] Mapa de alturas previo archivado como referencia.
- [ ] 3 manchas legibles en captura cenital (agua/llano/alto).
- [ ] Transiciones con banda 8–15 studs, sin franjas <10 studs.
- [ ] Río recorrible sin saltos; vadeable vs profundo legible.
- [ ] Rutas marcadas subibles sin gear (vídeo de prueba).
- [ ] Chunks 200×200 nombrados con solapes que ocultan cortes.
- [ ] Copia de seguridad por fase guardada.
- [ ] Recorrido 10 min sin atascos ni caídas injustas.

## Herramientas

- Terrain y su editor (esculpir/suavizar/pintar/agua) como herramienta principal.
- Parts invisibles para bloqueos de borde y cima-fondo.
- Lighting con ClockTime diurno neutro para pintar (detalles en `roblox-lighting-day-night`).
- Atmosphere/niebla suave para cerrar horizonte (clima en `roblox-lighting-atmosphere`).

## Limitaciones

- No cubre vegetación, agua gameplay (daño, corrientes) ni scripting de biomas.
- Medidas de pincel, chunks y pendientes son puntos de partida, no verdad.
- Si dudas de un límite del motor (tamaño, resolución), escribe "(verificar en create.roblox.com/docs)".
- Distingue referencia visual (foto de paisaje) de asset importable: no afirmes que un heightmap o pack existe sin crearlo o localizarlo.
