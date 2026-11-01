---
name: roblox-lighting-day-night
description: Configura ciclos día/noche legibles con sol, luna, sombras e interiores nocturnos. Úsala cuando necesites ClockTime, transiciones, sombras o legibilidad nocturna.
---

# Iluminación diurna y nocturna en Roblox

## Objetivo

Montar un ciclo día/noche que oriente (hora legible), emocione (amanecer/mediodía/atardecer/noche distintos) y mantenga el juego legible de noche sin freír mobile.

## Alcance y límites

Hace: esquema de Lighting por franja, ClockTime y transiciones, sol/luna y sombras, legibilidad nocturna, interiores de noche, presupuestos de luces.

NO hace:

- Atmósfera, niebla, lluvia y post-efectos → `roblox-lighting-atmosphere`.
- Efectos ambientales (luciérnagas, polvo) → `roblox-ambient-effects`.
- Materiales y variantes → `roblox-materials-surfaces`.
- Distribución de farolas y señalética → `roblox-props-decoration`.
- Interiores (zonas, mobiliario) → `roblox-interior-design`.

Diferenciación declarada: `roblox-world-building` (instalada) es generalista y fina (154 líneas sin auxiliares); esta skill es su versión profunda por especialidad (solo luz día/noche). `roblox-visual-design` y `roblox-art-direction` dirigen (aprueban mood por franja); esta skill ejecuta (parametriza y presupuesta).

## Casos de uso

1. Juego nuevo que necesita 4 franjas (mañana/mediodía/atardecer/noche) coherentes.
2. Noche actual injugable: todo negro o todo quemado.
3. Interiores que de noche se apagan con el sol.
4. Sombras que hunden mobile.
5. Transición día→noche con saltos visibles.

## Proceso paso a paso

1. **Define 4 franjas con frase.** Ej. "mañana fresca", "mediodía duro", "atardecer cálido", "noche azul legible". Fija ClockTime por franja (puntos de partida: 8, 13, 18, 0 — no verdad). Captura cada una desde el mismo punto.
2. **Fija luz base diurna.** Ambiente claro que lava sombras + sol direccional con sombras activas. Verifica: cara norte de un edificio sigue legible (sin negro puro) a mediodía.
3. **Diseña la noche como "día azul", no como apagón.** Base azulada tenue + farolas cálidas puntuales. Regla: ruta principal caminable sin linterna; secundarias pueden exigirla.
4. **Presupuesta luces.** Punto de partida: 1 PointLight cada 15–20 studs en ruta, SpotLight solo en hitos, SurfaceLight en fondos. Cuenta por chunk; si un chunk supera el presupuesto, apaga primero las redundantes (dos luces solapando el mismo radio).
5. **Resuelve interiores de noche.** Capa interior (PointLight tenue + SpotLight de tarea) independiente del sol, con interruptor lógico día/noche (más intensa de noche). Test: interior legible con exterior de noche cerrada.
6. **Sombras bajo control.** Sombras activas en sol/luna principal; PointLight/SpotLight sin sombras salvo 1–2 heroicas. En mobile, reduce distancia/alcance antes que apagar el sol.
7. **Transiciones suaves.** Cambia ClockTime y colores por interpolación en pasos pequeños (punto de partida: ciclo completo ≥5 min reales). Verifica: graba 30 s de atardecer; sin saltos ni parpadeos.
8. **Sol y luna como brújula.** Amanecer este / atardecer oeste consistentes; luna punto de partida opuesta al sol. Documenta orientación para que landmarks la aprovechen.
9. **Prueba de legibilidad ciega.** Jugador nuevo de noche: encuentra salida, lee 3 letreros y cruza la plaza sin ayuda. Si falla, sube base nocturna antes de añadir más farolas.
10. **Congela presets.** Guarda 4 presets nombrados (`LUZ_Manana`, `LUZ_Mediodia`, `LUZ_Atardecer`, `LUZ_Noche`) con valores y capturas desde 3 puntos fijos. Cualquier cambio posterior se compara contra ellos.

## Conocimientos técnicos

- Lighting: contenedor global (ambiente, luz direccional sol/luna, ClockTime). Todos los presets viven aquí; documenta cada valor cambiado.
- ClockTime: hora del ciclo (puntos de partida 8/13/18/0, no verdad). Cambios bruscos rompen inmersión; interpola siempre.
- PointLight: base nocturna y farolas; rango punto de partida 20–30, brillo bajo. El coste escala con conteo y solape.
- SpotLight: hitos y tareas; ángulo punto de partida 40–60 (punto de partida). Sin sombras salvo casos heroicos.
- SurfaceLight: fondos y paredes guía de noche; barata para lavar superficies grandes.
- Sombras: la sombra direccional (sol/luna) da profundidad; las sombras de 20 farolas la quitan en mobile. Prioriza una fuente con sombra.
- BloomEffect/ColorCorrectionEffect con moderación (detalle en `roblox-lighting-atmosphere`); aquí solo lo imprescindible para legibilidad.

## Buenas prácticas

- Noche legible > noche realista: un poco de trampa azul vale por 20 farolas.
- Cálido vs frío: farolas cálidas sobre base fría = profundidad instantánea.
- Repite temperatura por distrito para orientación (puerto frío, forja cálida).
- Mide en el peor dispositivo: la noche que va bien en PC puede ser un charco negro en móvil barato.
- Capturas siempre desde los mismos 3 puntos para comparar franjas.

## Errores frecuentes

1. **Noche-apagón.** Base a cero y 3 farolas. Corrección: sube base azulada hasta caminar sin linterna en ruta principal.
2. **Mediodía quemado.** Todo blanco sin sombra legible. Corrección: baja intensidad y refuerza ambiente de relleno.
3. **20 farolas con sombra.** Mobile arrodillado. Corrección: sombras solo en sol/luna + 1 heroica.
4. **Interior esclavo del sol.** De noche, interior negro. Corrección: capa interior independiente más intensa de noche.
5. **Salto de las 18:00.** Transición instantánea. Corrección: interpolación en ciclo ≥5 min.
6. **Letreros ilegibles de noche.** Sin luz dedicada. Corrección: SurfaceLight o SpotLight por letrero clave (con `roblox-props-decoration`).
7. **Sol que cambia de este a oeste.** Incoherencia entre mapas. Corrección: documenta orientación y respétala.

## Criterios de calidad y terminado

- [ ] 4 presets con ClockTime y capturas desde 3 puntos fijos.
- [ ] Ruta principal caminable de noche sin linterna (test ciego superado).
- [ ] Interiores legibles con exterior nocturno (3 capturas).
- [ ] Presupuesto de luces por chunk cumplido y documentado.
- [ ] Sombras: 1 fuente principal + ≤2 heroicas; resto sin sombras.
- [ ] Transición grabada 30 s sin saltos.
- [ ] Orientación sol/luna documentada y consistente.
- [ ] Peor dispositivo objetivo probado con FPS aceptable.

## Herramientas

- Lighting y ClockTime como controles maestros.
- PointLight / SpotLight / SurfaceLight con presupuesto por chunk.
- Post-efectos mínimos (BloomEffect/ColorCorrectionEffect) solo para legibilidad; el resto en `roblox-lighting-atmosphere`.
- Capturas desde puntos fijos como instrumento de QA.

## Limitaciones

- No cubre niebla, lluvia ni post-efectos creativos (ver skill de atmósfera).
- Valores de ClockTime, rangos y ángulos son puntos de partida, no verdad.
- Si dudas de una propiedad exacta, escribe "(verificar en create.roblox.com/docs)" y no la afirmes.
- Distingue referencia visual (foto de atardecer) de preset importable: el preset solo existe si está guardado y capturado.
