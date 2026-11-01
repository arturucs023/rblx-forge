---
name: roblox-interior-design
description: Diseña interiores jugables y confortables con zonas claras y circulación fluida. Úsala cuando necesites distribuir habitaciones, amueblar, iluminar interiores o marcar salidas.
---

# Diseño de interiores en Roblox

## Objetivo

Crear interiores que el jugador entiende en 15 segundos: zonas diferenciadas, circulación sin atascos, mobiliario a escala y salidas siempre visibles, con confort visual en sesiones largas.

## Alcance y límites

Hace: zonificación interior (estar/circular/servicio), circulación y anchos de paso, mobiliario y escala, iluminación interior por capas, confort visual (contraste, saturación, descanso visual), salidas y lectura de emergencia.

NO hace:

- Fachadas y masas exteriores → `roblox-exterior-architecture`.
- Trazado de ciudad o edificio en planta urbana → `roblox-city-settlements`.
- Materiales y variantes (paleta global) → `roblox-materials-surfaces`.
- Ciclo día/noche global → `roblox-lighting-day-night`.
- Props finos y señalética → `roblox-props-decoration`.
- Efectos ambientales (polvo, auxiliares) → `roblox-ambient-effects`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo interiores). `roblox-visual-design` y `roblox-art-direction` dirigen (definen estilo y paleta); esta skill ejecuta (distribuye y amuebla).

## Casos de uso

1. Casa inicial donde el jugador encuentra cama, salida y cofre sin tutorial.
2. Taberna con barra, mesas y escenario sin que los avatares se atasquen.
3. Oficina/nave con zonas de trabajo legibles y rutas de evacuación claras.
4. Mazmorra interior donde cada sala tiene identidad y la salida se intuye.
5. Interior existente oscuro, laberíntico o vacío que necesita reforma.

## Proceso paso a paso

1. **Lista programa y superficies.** Ej. estar 12×10, cocina 8×8, dormitorio 10×10 (studs, puntos de partida). Suma y verifica que cabe en la huella del edificio.
2. **Traza circulación primero.** Pasillo principal punto de partida 6 studs, secundario 4 studs. Dibuja con Parts de suelo de otro color. Regla: cualquier punto alcanza una salida con como máximo 2 giros.
3. **Zonifica con 3 recursos.** Cambio de suelo (material/color), cambio de altura de techo o falso techo, y mueble-barrera (estantería, barra). Verifica: captura cenital con cada zona nombrable.
4. **Amuebla de grande a pequeño.** Piezas ancla (cama, mesa grande, mostrador) → secundarias (sillas, estantes) → relleno. Deja radio libre punto de partida 4 studs alrededor de puertas.
5. **Escala al avatar.** Asiento punto de partida: 2×2 base, 1,5 alto. Mesa: 3 alto. Mostrador: 3,5–4 alto. Prueba: avatar R15 se sienta/atiende sin atravesar geometría.
6. **Ilumina por capas.** Base: PointLight tenue cenital cada 12–16 studs (punto de partida). Tarea: SpotLight sobre mesa/mostrador. Acento: SurfaceLight cálida en pared de fondo. Verifica de noche: ninguna zona queda a oscuras y ninguna quema (sin blanco puro).
7. **Marca salidas siempre.** Puerta de salida con marco de color distinto + luz más intensa + línea de suelo que conduce a ella. Test: desde cualquier rincón, alguna señal de salida es visible.
8. **Añade confort visual.** Cada 20 studs, un punto de descanso: ventana, planta, cuadro (Decal) o pared lisa. Límite: saturación alta solo en acentos (<10% superficie).
9. **Optimiza colisiones y cámara.** Muebles grandes con colisión simple (una Part invisible); decoración pequeña sin colisión. Altura libre mínima punto de partida 7 studs; tabiques que la cámara atraviesa se marcan y se bajan o se hacen parciales.
10. **QA de uso real.** Recorre con 2–3 avatares a la vez: sin atascos en puertas, sin rincones ciegos, tiempo a salida <15 s. Ajusta anchos y repite.

## Conocimientos técnicos

- PointLight: luz omnidireccional barata para base; rango punto de partida 20–30 studs, brillo bajo. Demasiados PointLight = caída mobile; comparte y espacia.
- SpotLight: ideal para mesas y expositores; ángulo punto de partida 40–60 (punto de partida, no verdad).
- SurfaceLight: lava paredes y crea fondos legibles; úsala en la pared que el jugador mira al entrar.
- Lighting y Atmosphere: el interior debe funcionar con los valores globales; si el exterior cambia (noche), el interior mantiene su capa base (coordinar con `roblox-lighting-day-night`).
- Decal/Texture: cuadros, alfombras y paneles; una Decal grande por pared como máximo para no saturar memoria.
- ViewportFrame: para mapas del edificio o fotos en pared sin cargar geometría extra (verificar en create.roblox.com/docs si dudas de límites).
- Sonido no cubierto aquí; si el interior es ruidoso visualmente, reduce a 2 materiales dominantes (coordinar con `roblox-materials-surfaces`).

## Buenas prácticas

- Puertas siempre abren hacia zona amplia, nunca contra un mueble.
- Pasillos con un lado libre de muebles: el jugador pega la cámara a la pared contraria.
- Repite familias de muebles (mismo set 3–4 veces) en vez de 10 muebles únicos: coherencia + rendimiento.
- Techos: color claro y mate; techo oscuro baja 1 stud visual y oscurece el doble.
- Guarda cada habitación como Model con nombre `INT_Cocina_v1` para reutilizar en otros edificios.

## Errores frecuentes

1. **Laberinto de tabiques.** 5 giros para salir. Corrección: abre vanos y aplica regla de 2 giros.
2. **Muebles a escala real humana.** Sillas de 1 stud donde el avatar no cabe. Corrección: reescala todo ×1,3 respecto a mueble real.
3. **Una sola luz cenital.** Centro quemado, esquinas negras. Corrección: 3 capas (base/tarea/acento).
4. **Salida camuflada.** Puerta igual que armarios. Corrección: marco + luz + línea de suelo distintivos.
5. **Saturación total.** Paredes, suelo y muebles en colores vivos: fatiga en 5 min. Corrección: base neutra, acento <10%.
6. **Colisión en cada bibelot.** Física innecesaria y atascos. Corrección: colisión solo en piezas ancla.
7. **Techo a 5 studs.** La cámara choca y el jugador ve negro. Corrección: mínimo 7 studs libres.

## Criterios de calidad y terminado

- [ ] Circulación: salida alcanzable con ≤2 giros desde cualquier punto.
- [ ] Anchos libres verificados: principal ≥6, secundario ≥4, radio puertas ≥4 studs.
- [ ] Zonas nombrables en captura cenital por un tercero sin ayuda.
- [ ] Iluminación de noche: sin zonas negras ni quemadas (3 capturas).
- [ ] Salida visible desde cualquier rincón (foto desde 4 esquinas).
- [ ] Recorrido con 3 avatares sin atascos ni atravesamientos.
- [ ] Mobiliario reutilizable guardado como Models nombrados.
- [ ] Acentos saturados <10% de superficie visible.

## Herramientas

- Parts/Models para tabiques y muebles modulares; MeshPart para piezas repetidas (sillas, estantes).
- PointLight / SpotLight / SurfaceLight para las 3 capas de luz.
- Decal / Texture para cuadros, alfombras y paneles (una por pared como máximo).
- Highlight con moderación para marcar salidas u objetivos (coordinar con `roblox-props-decoration` para señalética).

## Limitaciones

- No cubre sistemas de juego (tiendas, cofres interactivos) ni scripting de puertas.
- No define paleta global de materiales: usa la de `roblox-materials-surfaces`.
- Valores de luces y medidas son puntos de partida, no verdad: ajústalos por estilo y dispositivo.
- Distingue referencia visual (moodboard de interior) de asset importable: no afirmes que un mueble existe sin crearlo o localizarlo.
