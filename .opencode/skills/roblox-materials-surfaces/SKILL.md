---
name: roblox-materials-surfaces
description: Define paletas de materiales coherentes con desgaste creíble. Úsala cuando necesites elegir materiales, crear variantes, mezclar textura y color o envejecer superficies.
---

# Materiales y superficies en Roblox

## Objetivo

Fijar una paleta corta de materiales que unifique el juego, decidir cuándo usar textura vs color plano y aplicar desgaste creíble sin ruido ni coste extra.

## Alcance y límites

Hace: paleta de materiales por proyecto/distrito, MaterialVariant, criterio textura vs color, desgaste y envejecimiento, coherencia entre arquitectura/terreno/props.

NO hace:

- Edificios o interiores concretos → `roblox-exterior-architecture`, `roblox-interior-design`.
- Relieve y pintura de Terrain → `roblox-terrain-sculpting`.
- Iluminación y post-efectos → `roblox-lighting-day-night`, `roblox-lighting-atmosphere`.
- Vegetación → `roblox-vegetation-landscaping`.
- Props y señalética → `roblox-props-decoration`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo materiales/superficies). `roblox-visual-design` y `roblox-art-direction` dirigen (aprueban paleta y nivel de realismo); esta skill ejecuta (crea variantes y aplica).

## Casos de uso

1. Proyecto nuevo que necesita paleta cerrada antes de construir.
2. Mapa con 15 materiales mezclados que necesita dieta.
3. Acabado de ladrillo/madera/piedra reutilizable en 10 edificios.
4. Envejecido de ruina, puerto o distrito industrial.
5. Superficies que de noche se ven planas o queman.

## Proceso paso a paso

1. **Audita lo existente.** Lista materiales usados y cuenta: si hay >8, hay dieta. Captura 6 superficies representativas de día y noche.
2. **Fija paleta corta.** Regla: 3 estructurales (ej. piedra, madera, revoco) + 2 de suelo + 1 metálico + 1 acento. Registra en tabla con uso permitido y prohibido.
3. **Crea MaterialVariant por acabado, no por objeto.** Ej. `MV_Ladrillo_Rojo`, `MV_Madera_Oscura`. Verifica: cada variant se usa en ≥3 lugares; si solo aparece una vez, fusiónalo.
4. **Decide textura vs color por distancia.** Primer plano (<20 studs): textura/Decal sutil o geometría. Fondo (>60 studs): color plano + material base. Banda media: color + 1 detalle. Documenta la regla por distrito.
5. **Estandariza escala de textura.** Fija tamaño de tile por material (punto de partida: ladrillo 8 studs, madera 6). Verifica con regla visual: el patrón no se repite visiblemente a 10 studs.
6. **Aplica desgaste por zonas, no global.** Esquinas, zócalos (primeros 2 studs), bordes de escalón y marcos: banda de desgaste punto de partida 1–2 studs con tono más oscuro o Decal de suciedad. Prohíbe desgaste uniforme en todo el muro.
7. **Gradúa envejecido en 3 niveles.** Nuevo / usado / ruina, con tabla de qué cambia (color, contraste, cantidad de manchas). Verifica: un tercero ordena 3 muestras de menor a mayor desgaste.
8. **Prueba de noche.** Cada material se captura con ClockTime noche + luces encendidas. Corrige: los que queman (blancos) se oscurecen un paso; los que desaparecen (negros) reciben borde o luz de acento.
9. **Unifica entre sistemas.** Mismo `MV_Madera_Oscura` en edificio, mueble y prop. Auditoría: busca acabados duplicados con distinto nombre y fusiona.
10. **Congela y documenta.** Carpeta `MAT_Paleta` con variantes finales, tabla de uso y 6 capturas (día/noche × 3 biomas). Todo material nuevo posterior requiere justificación escrita.

## Conocimientos técnicos

- MaterialService: registro central de variantes; nombres `MV_*` con versión (`_v1`) para trazabilidad.
- MaterialVariant: acabado reutilizable (color + patrón). Menos variantes = más coherencia y menos memoria.
- Decal/Texture: aportan grano y despiece; una por superficie grande como máximo; tiles grandes = menos repetición visible.
- MeshPart con material propio: útil para piezas repetidas (vigas, remates); no crees material único por mesh.
- Lighting: el mismo material cambia radicalmente de día/noche; valida siempre en ambos (con `roblox-lighting-day-night`).
- Atmosphere/niebla: apaga saturación a distancia; compensa con materiales de fondo un paso más saturados (punto de partida, no verdad).
- Contraste: superficies jugables (suelo vs pared, escalón vs huella) necesitan diferencia de valor (claro/oscuro), no solo de tono.

## Buenas prácticas

- Paleta cerrada desde el día 1; cada material nuevo debe sustituir o justificarse.
- Desgaste donde la mano y el agua tocan: abajo, esquinas, bordes. Nunca en el centro del muro.
- Blanco y negro puros prohibidos como base; reserva blanco para acentos <5%.
- Reutiliza: un buen ladrillo sirve para 10 edificios con distinto color de marco.
- Documenta con capturas, no solo con nombres: el nombre miente, la captura no.

## Errores frecuentes

1. **Arcoíris de materiales.** 15 distintos en una calle. Corrección: dieta a 3+2+1+1.
2. **Variant por objeto.** 30 variantes de un uso. Corrección: fusiona a acabados compartidos.
3. **Desgaste global.** Muro entero manchado = suciedad, no edad. Corrección: bandas en zócalo/esquinas.
4. **Textura micro.** Tile de 2 studs que vibra a distancia. Corrección: tile 6–8 y prueba a 10/30/60 studs.
5. **Material que quema de noche.** Blanco puro + luz = mancha. Corrección: baja un paso el color base.
6. **Suelo = pared.** Mismo material y tono: sin lectura. Corrección: diferencia de valor clara.
7. **Negro que desaparece.** Vigas negras invisibles de noche. Corrección: borde claro o luz de acento.

## Criterios de calidad y terminado

- [ ] Paleta cerrada 3+2+1+1 documentada con usos permitidos/prohibidos.
- [ ] Cada MaterialVariant usado en ≥3 lugares; sin duplicados de nombre.
- [ ] Regla textura-vs-color por distancia aplicada y verificada a 10/30/60 studs.
- [ ] Desgaste solo en zonas (zócalo/esquinas/bordes), 3 niveles ordenables por un tercero.
- [ ] 6+ capturas día/noche sin quemados ni desapariciones.
- [ ] Mismo acabado compartido entre arquitectura, mueble y prop (auditoría).
- [ ] Carpeta `MAT_Paleta` congelada con tabla y capturas.

## Herramientas

- MaterialService / MaterialVariant como sistema central.
- Decal / Texture para grano y despiece (una por superficie grande).
- Parts/Models/MeshPart como portadores (no crear material por portador).
- Lighting diurno/nocturno para validación (detalles en `roblox-lighting-day-night`).

## Limitaciones

- No diseña edificios, terrenos ni props: solo sus acabados.
- Tamaños de tile y proporciones de paleta son puntos de partida, no verdad.
- Si dudas de una propiedad de material o límite de variantes, escribe "(verificar en create.roblox.com/docs)".
- Distingue referencia visual (foto de material real) de asset importable: no afirmes que una textura existe sin crearla o localizarla.
