---
name: roblox-land-vehicles
description: Vehículos terrestres arcade (chasis, suspensión, asientos, ownership). Úsala cuando montes karts, coches o motos que se conducen bien y no se desarman en red.
---

# Vehículos Terrestres

## Objetivo

Crear vehículos de tierra divertidos y estables: chasis predecible, suspensión arcade o física según presupuesto, entrada/salida limpias con `Seat`/`VehicleSeat` y ownership de red que evita jitter y robos.

## Alcance y límites

Cubre karts, coches y motos del jugador: chasis, suspensión, dirección, asientos, entrada/salida y red.

**Qué NO hace:**

- NO cubre construcción detallada de la carrocería como modelo: la construcción base se apoya en criterios de modelo de vehículo (esta skill define chasis y comportamiento, no el arte final).
- NO cubre ciclo de vida del personaje a pie: lo cubre `roblox-characters`.
- NO cubre cámaras de persecución: lo cubre `camera-systems` (aquí solo velocidad/posición para la cámara).
- NO cubre daño/economía/garaje: son sistemas de gameplay aparte.
- NO cubre NPCs conduciendo: lo cubre `roblox-npcs`.
- NO cubre audio de motor: solo timing con RPM como requisito, no diseño de sonido.

## Casos de uso

1. Kart arcade para party game (4–8 jugadores).
2. Coche urbano con derrape controlado.
3. Moto rápida que no vuelca en cada curva.
4. Pasajeros: conductor + 2 asientos traseros.
5. Vehículo que tiembla o se teletransporta con lag.
6. Jugadores que roban coches ajenos o los lanzan al vacío.

## Proceso paso a paso

1. **Elige arcade vs física.** Arcade (recomendado para party/mobile): velocidad dirigida, agarre alto, vuelco imposible salvo rampa. Física con restricciones: más real pero exige tuning de suspensión y anti-vuelco. Decide por público, no por prestigio.
2. **Monta el chasis mínimo.** Cuerpo principal + 4 puntos de rueda (o 2 en moto) + `Seat` de conductor y `Seat` de pasajeros + `VehicleSeat` si necesitas el modelo clásico de conducción. El chasis colisiona; la carrocería visual idealmente no.
3. **Configura suspensión arcade primero.** Altura fija al suelo, absorción visual (ruedas suben/bajan) sin simular muelles reales, límite de inclinación (pitch/roll capados). Si el coche nunca se queda atascado en bordillos de 0.5 studs, la base sirve.
4. **Tunea dirección y derrape.** Velocidad máxima, aceleración, radio de giro por velocidad (a más velocidad, menos giro), derrape como pérdida parcial de agarre trasero con recuperación automática. Documenta los 4 números.
5. **Implementa entrada/salida.** Entrada: `ProximityPrompt` o触 toque del `Seat` con distancia máxima y vehículo casi quieto; salida: coloca al `Character` al lado libre con espacio, nunca dentro del chasis ni bajo el mapa. Prohíbe salir a más de X velocidad.
6. **Asigna ownership de red.** El conductor posee la simulación (su cliente mueve, los demás ven réplica); al bajar, la propiedad vuelve al servidor. Un solo dueño a la vez; cambio atómico con estado "en transición".
7. **Añade límites y anti-abuso.** Velocidad máxima dura validada en servidor, zona de mapa (fuera = respawn del vehículo), anti-empuje (un coche no lanza otro al vacío), cooldown de entrada tras robo. El cliente propone aceleración, el servidor valida posición/velocidad.
8. **Prueba con pasajeros y lag.** Conductor + pasajeros con 150–200 ms: ¿los pasajeros vibran? ¿el coche se teletransporta? Ajusta tasa de réplica y suavizado antes de tocar la física.
9. **Tunea vuelco y atascos.** Rampas, bordillos, choques frontales: el arcade se endereza solo en 1 s; el físico tiene botón/auto-enderezado. Ningún vehículo queda boca abajo para siempre.
10. **Congela la ficha.** Velocidad max, aceleración, giro, agarre, asientos, ownership y reglas de robo. Sin ficha no hay "terminado".

## Conocimientos técnicos

- **`Seat` vs `VehicleSeat`:** el `Seat` sienta al `Character` y le da occupant; el `VehicleSeat` añade controles de conducción clásicos (acelerar/girar). Elige según si conduces con lógica propia (Seat + tu código) o con el modelo clásico.
- **Chasis vs carrocería:** el chasis (partes simples, colisión activada) define física; la carrocería (`SkinnedMesh`/detalles, sin colisión o mínima) define arte. Mezclarlos causa atascos en marcos de puerta.
- **`Humanoid` sentado:** al sentarse, el `Humanoid` cambia a estado sentado y el controlador a pie se suspende; al salir, se restaura. Coordina con `roblox-character-controller` para no dejar velocidades residuales.
- **Arcade:** tú integras velocidad向 dirección con agarre; estable y barato en red. Física con restricciones: el motor resuelve; divertido pero sensible a lag y a masas dispares.
- **Ownership:** quien conduce simula; el servidor valida (velocidad, posición, dentro de mapa). Sin dueño claro hay jitter por doble simulación.
- **`ProximityPrompt` de entrada:** distancia, cooldown y "vehículo casi quieto" evitan robos a 100 studs/s.
- **Pasajeros:** ocupantes sin control; su `Character` sigue al `Seat`. Limita su capacidad de mover el vehículo (peso o nada) para evitar griefing.

Ejemplo ilustrativo (entrada validada, no código final):

```luau
-- Ilustrativo: solo permite sentarse si el vehículo va despacio y hay sitio.
if vehicleVelocidad <= 5 and asientoConductor.Occupant == nil then
	jugador.Character.Humanoid.SeatPart = nil -- se gestiona vía Seat, no por teleport
	asientoConductor:Sit(jugador.Character.Humanoid)
end
```

## Buenas prácticas

- El cliente propone input de conducción, el servidor valida: velocidad máxima, posición dentro de mapa y transiciones de asiento se comprueban en servidor.
- Un dueño de red a la vez; transición atómica conductor→servidor→nuevo conductor.
- Salida siempre a espacio libre comprobado; jamás dentro de geometría.
- Arcade por defecto salvo que el juego venda simulación; el tuning físico cuesta semanas.
- Separa colisión (chasis simple) de visual (carrocería detallada sin colisión).
- Registra robos/abandonos para balancear cooldowns y respawns.

## Errores frecuentes

1. **Sin dueño claro:** dos clientes simulan y el coche vibra. Un owner a la vez.
2. **Salida dentro del chasis:** el jugador aparece atascado o bajo el mapa. Busca punto libre lateral.
3. **Carrocería con colisión:** se engancha en cada puerta. Solo el chasis colisiona.
4. **Sin límite de servidor:** cliente a 300 studs/s. Velocidad máxima dura en servidor.
5. **Vuelco permanente:** sin auto-enderezado el coche muere boca abajo. Enderezado en ≤1 s (arcade) o botón.
6. **Robo a distancia:** entrar desde lejos o a toda velocidad. Distancia + velocidad + cooldown.
7. **Pasajero que conduce:** permitir input de pasajeros o que su peso vuelque. Pasajeros sin autoridad.

## Criterios de calidad y terminado

- [ ] Ficha con velocidad, aceleración, giro, agarre, asientos y ownership.
- [ ] Entrada/salida sin atascos en 20 intentos (incluye salida junto a pared).
- [ ] Sin jitter con 150 ms (conductor + 2 pasajeros observados).
- [ ] Validación de servidor rechaza velocidad/teleport en prueba adversaria.
- [ ] Auto-enderezado o botón verificado boca abajo en 3 superficies.
- [ ] Fuera de mapa = respawn del vehículo sin perder al jugador.
- [ ] Derrape controlable por jugador nuevo en 3 intentos.

## Herramientas

- Pista de pruebas (recta, slalom, bordillos, rampa, pared lateral).
- Ficha de vehículo estándar + tabla de ownership y transiciones.
- Cliente de prueba con lag simulado y prueba de robo/exploit.
- Checklist de entrada/salida (20 intentos).

## Limitaciones

- No cubre daño, combustible, garaje ni economía (sistemas aparte).
- No cubre audio de motor más allá de exponer RPM/velocidad.
- No cubre persecuciones con IA (ver `roblox-npcs`).
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
