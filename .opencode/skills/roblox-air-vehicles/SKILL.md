---
name: roblox-air-vehicles
description: Vehículos aéreos arcade (sustentación, controles, límites de mapa). Úsala cuando montes aviones, helicópteros o jetpacks sin regalar vuelo libre.
---

# Vehículos Aéreos

## Objetivo

Volar divertido y controlado: sustentación arcade predecible, controles accesibles en PC/mando/táctil, límites de mapa/altura claros y anti-exploit que impide usar el vehículo como vuelo libre permanente.

## Alcance y límites

Cubre aviones, helicópteros, jetpacks y monturas voladoras del jugador: sustentación, controles, límites y red.

**Qué NO hace:**

- NO cubre personajes a pie: ver `roblox-characters` y `roblox-character-controller`.
- NO cubre cámaras aéreas: lo cubre `camera-systems` (aquí solo velocidad/actitud para la cámara).
- NO cubre parkour/vuelo con cuerpo (wallrun, cape): lo cubre `roblox-parkour-traversal`.
- NO cubre daño/garaje/economía: sistemas aparte.
- NO cubre NPCs volando: lo cubre `roblox-npcs`.
- NO cubre audio de motor: solo expone RPM/velocidad como requisito.

## Casos de uso

1. Avioneta arcade para explorar el mapa.
2. Helicóptero con despegue/aterrizaje vertical.
3. Jetpack con combustible limitado.
4. Montura voladora (dragón) con picado y planeo.
5. Jugadores que salen del mapa o vuelan a zonas prohibidas.
6. Aterrizaje que termina en explosión o bajo el mapa.

## Proceso paso a paso

1. **Elige modelo de vuelo.** Avión: necesita velocidad para sustentar, no flota quieto. Helicóptero/dron: flota vertical, más lento. Jetpack: impulso vertical con combustible. Planeador: siempre desciende salvo picado. Un vehículo, un modelo, sin híbridos confusos.
2. **Define la envolvente.** Velocidad min/max, tasa de ascenso/descenso, techo de altura, radio de mapa. Ejemplo: techo 200 studs, velocidad 30–80. Fuera de envolvente = el vehículo empuja de vuelta, no deja pasar.
3. **Monta chasis + `Seat`.** Cuerpo con colisión simple, `Seat` de piloto (+ pasajeros), tren de aterrizaje o patines con altura libre documentada. La hélice/alas visuales no colisionan.
4. **Implementa controles unificados.** Pitch (cabeceo), yaw (giro), roll (avión) o strafe (heli), acelerar/frenar, ascender/descender. Con `ContextActionService` + `UserInputService` para táctil: dos sticks o stick + botones, nunca 6 teclas obligatorias.
5. **Sustentación arcade.** Avión: sustentación ∝ velocidad; bajo velocidad mínima, pierde altura (stall) en vez de flotar. Heli: empuje vertical con inercia; soltar el control = descenso suave, no parada en el aire salvo diseño. Documenta la fórmula en una línea.
6. **Aterrizaje y colisión.** Tren + superficie válida (etiqueta `CollectionService` "pista/suelo") = aterriza; agua o ladera = daño o rebote según diseño, nunca atravesar. Al tocar suelo valida velocidad vertical: exceso = daño, no clip bajo el mapa.
7. **Ownership y replicación.** Piloto simula, demás ven réplica suavizada; al bajar, propiedad al servidor. Velocidad/posición validadas en servidor con tolerancia de lag; fuera de mapa = retorno forzado suave.
8. **Anti-exploit de vuelo.** Combustible o batería (jetpack/heli), techo duro, zonas prohibidas que empujan fuera, imposibilidad de salir del `Seat` en el aire salvo paracaídas diseñado. El cliente propone input, el servidor valida envolvente.
9. **Prueba de bordes.** Vuela al techo, al borde del mapa, contra montaña, aterriza en ladera y en agua, sal del asiento en el aire. Cada caso debe tener comportamiento pactado sin caídas bajo el mapa.
10. **Congela la ficha.** Modelo, envolvente, controles por dispositivo, combustible, reglas de aterrizaje y anti-abuso.

## Conocimientos técnicos

- **Sustentación arcade:** fórmulas simples y predecibles (ej. empuje vertical = throttle × max; avión suma sustentación por velocidad). Evita simular aerodinámica real: es inestable en red y frustrante en táctil.
- **Stall (avión):** bajo velocidad mínima el morro cae y pierde altura; así se impide flotar como helicóptero. Comunícalo con vibración visual/sonora antes del stall.
- **`Seat` en vuelo:** el `Humanoid` queda sentado; el controlador a pie se suspende. La salida en el aire debe estar prohibida o llevar paracaídas/caída pactada.
- **`HumanoidRootPart` del piloto:** sigue al `Seat`; no uses su posición para validar el vuelo (usa el chasis). Al salir, recoloca al `Character` en punto libre.
- **Techo y bordes:** techo blando (empuje hacia abajo creciente) + techo duro (tope). Borde de mapa: giro forzado suave + mensaje, no teleport brusco.
- **Colisiones aéreas:** chasis simple; alas/hélices sin colisión para no engancharse en cada torre. Daño por impacto según velocidad vertical/horizontal pactada.
- **Combustible:** temporiza el vuelo libre (jetpack 20–30 s, heli minutos con repostaje). Sin combustible el aparato desciende, no cae como piedra (salvo diseño).

Ejemplo ilustrativo (envolvente validada, no código final):

```luau
-- Ilustrativo: el servidor recorta lo que salga de la envolvente pactada.
if altura > TECHO_MAX or velocidad > VEL_MAX then
	-- Empujar de vuelta / capar, nunca teleport brusco salvo fuera de mapa.
	velocidad = math.min(velocidad, VEL_MAX)
	altura = math.min(altura, TECHO_MAX)
end
```

## Buenas prácticas

- El cliente propone input, el servidor valida envolvente: techo, velocidad, combustible y zona se comprueban en servidor.
- Un dueño a la vez; transición piloto→servidor atómica.
- Controles volables con mando y táctil desde el día uno; el teclado solo no basta.
- Stall/descenso siempre gracioso: avisa antes de castigar.
- Zonas prohibidas con empuje suave + mensaje, no con muro invisible que rompe el flujo.
- Registra salidas del mapa y aterrizajes duros para ajustar techo y daños.

## Errores frecuentes

1. **Vuelo = noclip:** sin techo ni bordes el jugador sale del mapa. Envolvente dura desde el prototipo.
2. **Heli que flota eterno sin coste:** sin combustible cualquiera acampa en el cielo. Combustible o temporizador.
3. **Salida en el aire sin regla:** el jugador salta del avión y planea exploits. Prohíbe o pon paracaídas pactado.
4. **Alas con colisión:** se engancha en cada poste. Solo el chasis colisiona.
5. **Aterrizaje bajo el mapa:** exceso de velocidad vertical atraviesa el suelo. Valida y capa al contacto, con superficie etiquetada.
6. **Controles solo teclado:** imposible en móvil/consola. `ContextActionService` + táctil desde el inicio.
7. **Servidor que confía:** aceptar posición aérea sin comprobar = teleport volador. Valida envolvente y combustible.

## Criterios de calidad y terminado

- [ ] Ficha con modelo, envolvente, controles, combustible y reglas de aterrizaje.
- [ ] Stall/pérdida de sustentación verificada (avión) o descenso sin input (heli).
- [ ] Techo y bordes probados: empuje suave + mensaje, sin salidas del mapa en 20 intentos.
- [ ] Aterrizaje en pista/ladera/agua con comportamiento pactado; sin clips bajo el mapa.
- [ ] Controles probados en PC + (mando o táctil) con tutorial mínimo.
- [ ] Validación de servidor rechaza velocidad/altura/teleport en prueba adversaria.
- [ ] Salida en el aire prohibida o con paracaídas pactado y validado.

## Herramientas

- Pista aérea (pista, helipuerto, montaña, borde de mapa, zona prohibida).
- Ficha de envolvente + mapa de controles por dispositivo.
- Prueba de exploit aéreo (techo, bordes, salida en aire, combustible infinito).
- Registro de aterrizajes duros y salidas para tuning.

## Limitaciones

- No cubre combate aéreo (armas, lock-on) más allá de la plataforma de vuelo.
- No cubre daño/economía/garaje ni audio de motor.
- No cubre física aerodinámica realista; arcade a propósito.
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
