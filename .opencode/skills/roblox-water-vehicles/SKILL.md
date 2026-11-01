---
name: roblox-water-vehicles
description: Vehículos acuáticos (flotación, oleaje, atraque, agua Terrain vs parts). Úsala cuando montes barcas, motos de agua o barcos con puertos.
---

# Vehículos Acuáticos

## Objetivo

Navegar con credibilidad arcade: flotación estable, respuesta a oleaje sin marear, controles de timón predecibles, puertos/atraque limpios y red con dueño único validado por servidor.

## Alcance y límites

Cubre barcas, lanchas, motos de agua y barcos del jugador: flotación, propulsión, atraque y red.

**Qué NO hace:**

- NO cubre natación del personaje: ver `roblox-character-controller` (aquí solo embarque/desembarque).
- NO cubre cámaras de persecución acuática: lo cubre `camera-systems`.
- NO cubre pesca/economía/daño naval: sistemas aparte.
- NO cubre NPCs navegando: lo cubre `roblox-npcs`.
- NO cubre audio de agua/motor: solo expone velocidad/estado como requisito.
- NO cubre terreno como tal: decide entre agua de `Terrain` o volúmenes de partes, pero el esculpido del terreno es otra disciplina.

## Casos de uso

1. Barca de pesca tranquila para explorar.
2. Moto de agua rápida con derrape.
3. Barco grande con varios pasajeros.
4. Puerto con amarres donde dejar el bote.
5. Bote que vuelca con cada ola o se queda clavado en la orilla.
6. Jugadores que llevan el bote a tierra y lo usan como coche.

## Proceso paso a paso

1. **Elige agua `Terrain` vs partes.** Agua de `Terrain` (verificar en create.roblox.com/docs): oleaje y natación integrados, mejor look, menos control. Volúmenes de partes: control total de flotación y límites, más trabajo. Decide por mapa: mundo abierto = `Terrain`; arena cerrada = partes.
2. **Define flotación arcade.** Línea de flotación (qué % del casco va sumergido), adrizado (el casco tiende a horizontal con retardo), cabeceo/balanceo máximos. La barca nunca vuelca 180° salvo daño diseñado; ante ola grande se inclina y recupera.
3. **Monta casco + `Seat`.** Casco con colisión simple (sin detalles que enganchen en muelles), `Seat` de patrón + pasajeros, punto de embarque a bordo. Helice/remo visual sin colisión.
4. **Propulsión y timón.** Motor: aceleración suave, velocidad max por tipo (barca 15, lancha 40, moto 55, valores a calibrar). Timón: gira más a baja velocidad, menos a alta (evita giros imposibles a 50 studs/s). Marcha atrás lenta con visibilidad.
5. **Oleaje sin mareo.** Balanceo visual (±5–10°) + desplazamiento vertical suave; la cámara (ver `camera-systems`) debe estabilizar horizonte. Si el oleaje mueve la física real, capa su fuerza: estética sí, catapulta no.
6. **Orillas y encallado.** Define profundidad mínima navegable: bajo ella, el bote frena y encalla (no atraviesa tierra). Empujar a tierra = el bote se detiene y avisa; prohibido usarlo como coche (sin ruedas no anda en tierra).
7. **Puertos y atraque.** Zonas de atraque etiquetadas (`CollectionService` "amarre"): al entrar despacio, opción de amarrar (frena, fija posición, permite bajar seguro). Pasarela/punto de desembarque libre comprobado; nunca dentro del muelle.
8. **Embarque/desembarque.** Embarque: cerca + bote casi quieto + sitio libre, vía `ProximityPrompt` o `Seat`. Desembarque: al muelle si hay amarre cercano, si no al agua (nada) con coste pactado. Prohibido desembarcar a toda velocidad.
9. **Ownership y validación.** Patrón simula, demás ven réplica; al bajar, propiedad al servidor. Servidor valida: velocidad max, dentro de agua/mapa, sin "navegar" por tierra. El cliente propone timón, el servidor valida posición.
10. **Congela la ficha.** Tipo, flotación, velocidades, oleaje, reglas de encallado/atraque y ownership.

## Conocimientos técnicos

- **Flotación arcade:** fuerza vertical hacia línea de flotación + pares de adrizado (vuelven el casco a horizontal). Simple, estable en red y suficiente para gameplay.
- **Casco simple:** una o dos partes de colisión; barandillas, mástiles y motores visuales sin colisión para no engancharse en cada pilote.
- **`Seat` a bordo:** el `Humanoid` sentado suspende el controlador a pie; al desembarcar se restaura (coordina con `roblox-character-controller`). Patrón y pasajeros diferenciados.
- **Agua `Terrain` vs partes:** `Terrain` da olas y material agua gratis pero el comportamiento exacto depende de la plataforma (verificar en create.roblox.com/docs); partes/volúmenes dan control total de límites y profundidad a costa de implementar olas.
- **Encallado:** sonda de profundidad bajo el casco; si es menor que el calado, frena proporcionalmente hasta detener. Así la orilla es límite natural.
- **Amarre:** estado "atracado" que fija el bote (sin simulación libre) y libera al patrón sin deriva. Desamarrar devuelve ownership al patrón.
- **Olas y red:** el balanceo visual puede ser local por cliente (no se replica la fase exacta); la posición/velocidad sí se validan en servidor.

Ejemplo ilustrativo (encallado como freno, no código final):

```luau
-- Ilustrativo: poca profundidad = freno progresivo, nunca atravesar tierra.
if profundidad < CALADO_MIN then
	velocidadObjetivo = 0 -- el bote encalla y se detiene
	-- Avisar al patrón: "muy poco fondo" antes de detener del todo.
end
```

## Buenas prácticas

- El cliente propone timón/acelerador, el servidor valida: velocidad, agua bajo el casco y zona de mapa.
- Un dueño a la vez; atracado = propiedad segura en servidor.
- Solo el casco colisiona; todo lo demás es visual.
- Desembarque siempre a punto libre (muelle o agua pactada); jamás dentro de geometría.
- Oleaje que se ve pero no expulsa: inclina, no catapulta.
- Orilla como límite natural: sin agua suficiente no hay navegación, sin excepciones.

## Errores frecuentes

1. **Bote-coche:** permite navegar por tierra. Encallado obligatorio bajo calado mínimo.
2. **Vuelco con cada ola:** adrizado débil o olas físicas sin capar. Inclina visual, estabiliza físico.
3. **Muelle con colisión dentada:** el bote se engancha al atracar. Muelles con colisión simple y defensas.
4. **Desembarque en el muelle (dentro):** aparece atascado en la madera. Punto libre comprobado.
5. **Sin amarre:** el bote a la deriva se pierde o bloquea el puerto. Estado atracado + respawn pactado.
6. **Pasajero-patrón:** pasajeros que pueden acelerar o girar. Solo el patrón tiene input.
7. **Servidor que confía:** bote a 200 studs/s por tierra. Valida velocidad + agua + zona.

## Criterios de calidad y terminado

- [ ] Ficha con flotación, velocidades, oleaje y reglas de atraque.
- [ ] Encallado verificado en 3 orillas: frena y detiene, nunca atraviesa.
- [ ] Atraque en amarre etiquetado con embarque/desembarque limpios (20 intentos).
- [ ] Oleaje visible sin marear cámara ni expulsar el bote (prueba con horizonte de `camera-systems`).
- [ ] Validación de servidor rechaza velocidad/teleport/navegación terrestre.
- [ ] Controles probados en PC + (mando o táctil).
- [ ] Bote abandonado: deriva pactada o respawn sin bloquear el puerto.

## Herramientas

- Lago de pruebas (aguas profundas, orilla suave, muelle con 2 amarres, zona de olas).
- Ficha de barco + tabla de amarres etiquetados.
- Sonda de profundidad visible para calibrar calado.
- Prueba de exploit (tierra, velocidad, teleport, robo).

## Limitaciones

- No cubre esculpido de `Terrain` ni ríos/oceanos como arte de nivel.
- No cubre combate naval, pesca ni economía.
- No cubre natación/buceo del personaje (ver controlador).
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
