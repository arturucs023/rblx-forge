---
name: roblox-props-decoration
description: Coloca props, decoración y señalética que guían sin saturar. Úsala cuando necesites amueblar escenas, crear letreros/flechas/landmarks de guía o vestir calles e interiores.
---

# Props, decoración y señalética en Roblox

## Objetivo

Vestir escenas con props que cuentan historia y con señalética que guía: cada objeto tiene motivo, cada letrero se lee en marcha y ningún conjunto satura ni frena.

## Alcance y límites

Hace: selección y colocación de props, composición de viñetas (storytelling estático), señalética y wayfinding (letreros, flechas, landmarks de guía), densidad y presupuestos, colisiones de decoración.

NO hace:

- Mobiliario estructural de interior (zonas, circulación) → `roblox-interior-design`.
- Fachadas y masas → `roblox-exterior-architecture`.
- Vegetación → `roblox-vegetation-landscaping`.
- Materiales y variantes globales → `roblox-materials-surfaces`.
- Efectos ambientales (polvo, hojas) → `roblox-ambient-effects`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo props/decoración/señalética). `roblox-visual-design` y `roblox-art-direction` dirigen (aprueban estilo y tono); esta skill ejecuta (coloca y rotula).

## Casos de uso

1. Calle vacía que necesita vida sin perder legibilidad.
2. Taberna con viñetas (mesa a medio recoger, tablón de encargos) que cuentan historia.
3. Cruce donde los jugadores se pierden: sistema de letreros y flechas.
4. Mercado con 30 puestos legibles y recorribles.
5. Mapa saturado a 20 FPS por exceso de bibelots con colisión.

## Proceso paso a paso

1. **Inventaría por familias.** Lista: estructurales (cajas, barriles), narrativos (cartas, herramientas), guía (letreros, flechas). Límite punto de partida: 3 familias por escena; todo lo demás sobra.
2. **Fija presupuesto por escena.** Punto de partida: calle 40–60 props, habitación 15–25, plaza 30–50 (puntos de partida, no verdad). Cuenta y recorta lo invisible desde rutas antes que lo visible.
3. **Compón viñetas de 3–5 objetos.** Regla: cada viñeta cuenta 1 frase ("el herrero cenó aquí"). Verifica: un tercero describe la frase sin ayuda. Sin frase = relleno, elimínalo.
4. **Coloca de grande a pequeño.** Anclas (carro, puesto, estatua) → medios (cajas, barriles) → pequeños (papeles, tazas). Pequeños solo donde el jugador se detiene (mostradores, bancos), nunca en rutas de paso.
5. **Señalética en 3 niveles.** Nivel 1: landmark/flecha grande a 60+ studs. Nivel 2: letrero de calle/destino a 20 studs. Nivel 3: placa de puerta a 5 studs. Verifica cada nivel desde su distancia con avatar en marcha.
6. **Legibilidad de letreros.** Texto corto (≤3 palabras), alto de letra punto de partida ≥1 stud, contraste fondo/texto alto, SurfaceLight o SpotLight dedicada de noche. Test: se lee corriendo, no solo parado.
7. **Flechas y líneas de guía.** Flechas en suelo (Decal/Texture) o Beams tenues en cruces; una dirección por cruce, nunca 3. Retira las de tutorial tras su uso o conviertelas en decoración.
8. **Colisiones y cámara.** Solo anclas con colisión (una Part simple por grupo); pequeños y colgantes sin colisión. Nada a altura de cámara en pasillos <6 studs.
9. **Reutiliza sets.** Guarda `PROP_PuestoMercado`, `PROP_Letrero_Calle`, `PROP_Vineta_Taberna` como Models. Varía rotación y 1 objeto por copia, no todo el set.
10. **QA de saturación y guía.** Recorre con jugador nuevo: llega a 3 destinos solo con señales; cuenta FPS antes/después de vestir. Si el FPS cae >15%, aplica dieta (primero pequeños invisibles).

## Conocimientos técnicos

- Parts/Models/MeshPart: MeshPart para props repetidos (barriles, cajas); Parts para letreros y soportes simples.
- Decal/Texture: textos de letreros, pósters, flechas de suelo. Una Decal grande por letrero; texto como imagen nítida, no geometría de letras.
- SurfaceLight: lava letreros de noche; SpotLight para focalizar estatua o tablón clave.
- Highlight: solo guía temporal (objeto de misión); prohibido permanente en decoración.
- Beam: líneas de guía temporales o haces decorativos contados (1–2 por escena).
- ViewportFrame: vitrinas o cuadros con mini-escenas sin geometría extra (verificar en create.roblox.com/docs si dudas).
- Colisiones: CanCollide off por defecto en decoración; una Part invisible por puesto/grupo sustituye 10 colisiones.

## Buenas prácticas

- Menos es más: 5 props con historia superan a 50 de relleno.
- Señalética siempre en el lado de decisión (antes del cruce, no después).
- Repite el mismo letrero-base en toda la ciudad (forma y color); cambia solo el texto.
- Altura de ojos (punto de partida 4–6 studs) para letreros; por encima de 10 solo landmarks.
- Nombra `PROP_*`, `SIGN_*`, `VIN_*` para dietas y búsquedas rápidas.

## Errores frecuentes

1. **Relleno sin frase.** 50 tazas idénticas sin historia. Corrección: viñetas de 3–5 con frase legible.
2. **Letrero ilegible en marcha.** Letra pequeña y sin luz. Corrección: ≥1 stud, contraste y luz dedicada.
3. **Tres flechas por cruce.** El jugador se paraliza. Corrección: una dirección por cruce.
4. **Todo con colisión.** Atasco entre puestos. Corrección: solo anclas; resto sin colisión.
5. **Props en ruta.** Cajas en el centro del paso. Corrección: bordes; centro libre 4+ studs.
6. **Estilos mezclados.** 5 sets distintos en una calle. Corrección: 1 set base + variación mínima.
7. **Guía permanente con Highlight.** Todo brilla siempre. Corrección: Highlight solo temporal de misión.

## Criterios de calidad y terminado

- [ ] Presupuesto por escena cumplido y contado (calle/habitación/plaza).
- [ ] Cada viñeta describe 1 frase reconocible por un tercero.
- [ ] 3 niveles de señalética verificados a 60/20/5 studs en marcha.
- [ ] Letreros legibles de día y de noche (fotos corriendo).
- [ ] Una dirección por cruce; guías de tutorial retiradas o integradas.
- [ ] Colisión solo en anclas (auditoría); pasillos y rutas libres.
- [ ] Sets guardados como Models `PROP_*/SIGN_*` reutilizables.
- [ ] FPS tras vestir dentro del objetivo (caída ≤15%).

## Herramientas

- Models/MeshPart para sets reutilizables; Parts para soportes.
- Decal / Texture para textos, pósters y flechas de suelo.
- SurfaceLight / SpotLight para letreros y focos nocturnos.
- Highlight y Beam solo para guía temporal (retirar tras uso).

## Limitaciones

- No cubre mobiliario estructural de interior ni fachadas (ver skills enlazadas).
- Conteos por escena y tamaños de letra son puntos de partida, no verdad.
- Si dudas de un límite (Decal, ViewportFrame), escribe "(verificar en create.roblox.com/docs)".
- Distingue referencia visual (foto de mercado real) de asset importable: no afirmes que un set existe sin crearlo o localizarlo.
