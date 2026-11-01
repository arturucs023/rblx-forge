---
name: roblox-character-controller
description: Controladores de personaje (aceleración, salto, coyote-time, agua/escalada). Úsala cuando el movimiento se siente flotante, el salto no responde o el input no escala a mando/táctil.
---

# Controladores y Movimiento del Personaje

## Objetivo

Construir movimiento que se siente bien y es válido en red: aceleración/fricción con peso, salto con buffers (coyote-time + jump buffer), input unificado teclado/mando/táctil y transiciones agua/escalada sin exploits de vuelo.

## Alcance y límites

Cubre el controlador del jugador a pie: parámetros de `Humanoid`, modelo de input, salto, pendientes, agua y escalada básica.

**Qué NO hace:**

- NO cubre ciclo de vida respawn-safe: lo cubre `roblox-characters` (aquí se configuran `Humanoid` ya gestionados).
- NO cubre clips de locomoción: lo cubre `roblox-locomotion-animation` (aquí el movimiento que esos clips deben acompañar).
- NO cubre parkour avanzado (vault/wallrun/slide): lo cubre `roblox-parkour-traversal`.
- NO cubre vehículos: ver `roblox-land-vehicles`, `roblox-air-vehicles`, `roblox-water-vehicles`.
- NO cubre NPCs: lo cubre `roblox-npcs`.
- NO cubre cámaras (solo expone velocidad/dirección para ellas): lo cubre `camera-systems`.

## Casos de uso

1. Movimiento "flotante" o "sobre hielo" sin peso.
2. Salto que no sale al pulsar en el borde (falta coyote-time).
3. Controles que solo funcionan en PC y rompen en móvil/consola.
4. Agua donde el jugador se hunde o vuela.
5. Escalada que permite escalar cualquier pared infinita.
6. Speedhacks: el servidor acepta cualquier velocidad del cliente.

## Proceso paso a paso

1. **Fija la fantasía en números.** Walk, run, aceleración (studs/s²), fricción/deceleración, altura de salto, gravedad efectiva. Ejemplo inicial: walk 12, run 20, salto que supera 4 studs. Todo ajuste posterior parte de aquí.
2. **Configura el `Humanoid` base.** Velocidades, altura de salto y límites de pendiente en un solo lugar documentado. Nada de números mágicos repartidos en 6 scripts.
3. **Implementa aceleración, no teleport de velocidad.** La velocidad tiende al objetivo con rampa (acelera en ~0.15–0.25 s, frena en ~0.1–0.2 s). Cambio instantáneo = sin peso; rampa eterna = barro. Mide con cronómetro en pista recta.
4. **Añade coyote-time + jump buffer.** Coyote: permite saltar hasta ~0.1 s después de salir del borde. Buffer: si pulsa salto ~0.12 s antes de tocar suelo, el salto sale al aterrizar. Ambos son perdón de input, no física nueva.
5. **Unifica input con `ContextActionService`.** Una acción "Saltar", una "Esprintar", bindeadas a teclado + botones de mando + botones táctiles. Lee intención (`MoveDirection` del `Humanoid` / vector de input), no teclas sueltas. Usa `UserInputService` solo para casos (tipo de dispositivo, toque) que la acción no cubra.
6. **Trata pendientes y escalones.** Define ángulo máximo caminable; por encima, el jugador resbala o se detiene (nunca escala paredes verticales gratis). Escalones bajos se suben suave; bordes altos requieren salto o parkour (ver `roblox-parkour-traversal`).
7. **Implementa agua básica.** Dentro de volumen de agua: gravedad reducida, velocidad capada, salto = impulso de nado con cooldown, sin vuelo sostenido. Al salir, restaura parámetros en un solo punto de transición.
8. **Implementa escalada básica acotada.** Solo superficies marcadas (etiqueta con `CollectionService`), velocidad de escalada fija, sin saltos infinitos encadenados. Toda superficie no marcada = no escalable.
9. **Valida en servidor.** El servidor conoce posición, velocidad máxima y estado (suelo/agua/escalando); rechaza teleports, velocidades imposibles y "saltos" sin suelo reciente ni coyote. El cliente propone input, el servidor valida desplazamiento.
10. **Calibra con pruebas ciegas.** Pista con: sprint recto, slalom, salto de precisión a plataforma, borde con coyote, agua y escalera marcada. Si 3 jugadores nuevos completan sin quejarse del control, está listo.

## Conocimientos técnicos

- **`Humanoid` como contrato:** expone velocidad, dirección de movimiento (`MoveDirection`), estado (suelo/aire/nadando) y salto. El controlador escribe intención; el `Humanoid` resuelve; la animación lee el resultado.
- **`HumanoidRootPart`:** pivote de desplazamiento y referencia de orientación. Gira el personaje hacia la dirección de movimiento con velocidad de giro limitada para evitar torsión (coordina con locomoción).
- **Aceleración vs fricción:** acelerar = acercar velocidad actual a la deseada con tasa; fricción = acercar a cero cuando no hay input. Tasas distintas para suelo (altas) y aire (bajas: control aéreo parcial, no total).
- **Coyote-time y buffer:** temporizadores de ~0.1 s que perdonan el input humano. No cambian la física, cambian la ventana de aceptación.
- **`ContextActionService`:** capa de acciones (Saltar/Esprintar/Interactuar) con bindings por dispositivo. `UserInputService` complementa para detectar contexto (móvil vs PC) y toques especiales.
- **`CollectionService`:** etiquetas para "escalable", "agua", "hielo", "no-escalable". El código pregunta por etiqueta, no por nombre de parte (robusto a renombrados).
- **Agua/escalada y exploits:** cada transición de estado (suelo→agua→escalando) es un punto de validación de servidor; un cliente que declara "escalando" en pared no marcada = rechazo.

Ejemplo ilustrativo (intención unificada, no código final):

```luau
-- Ilustrativo: una acción "Esprintar" válida en PC, mando y táctil.
local ContextActionService = game:GetService("ContextActionService")
ContextActionService:BindAction("Esprintar", function(_, estado, _)
	if estado == Enum.UserInputState.Begin then humanoide.WalkSpeed = VELOCIDAD_RUN end
	if estado == Enum.UserInputState.End then humanoide.WalkSpeed = VELOCIDAD_WALK end
	return Enum.ContextActionResult.Pass
end, Enum.KeyCode.LeftShift, Enum.KeyCode.ButtonL3)
```

## Buenas prácticas

- El cliente propone input, el servidor valida desplazamiento: velocidad, posición y transiciones de estado se comprueban en servidor con tolerancia de lag; lo imposible se corrige.
- Un solo lugar para números de movimiento; ninguna constante duplicada.
- Perdón de input (coyote + buffer) siempre; control aéreo parcial, nunca total ni nulo.
- Etiquetas (`CollectionService`) para superficies especiales; jamás listas de nombres hardcodeados.
- Transiciones agua/escalada atómicas: al entrar/salir se fijan todos los parámetros a la vez, sin estados mixtos.
- Accesibilidad: permite re-bindear teclas y ofrece alternativa táctil a cada acción.

## Errores frecuentes

1. **Velocidad instantánea:** sin rampa el personaje se siente poseído. Siempre acelera/decelera.
2. **Sin coyote ni buffer:** el salto "falla" en bordes y frustra. Ambos con ~0.1 s cambian todo.
3. **Input por teclas sueltas:** WASD hardcodeado que ignora mando/táctil. Usa acciones.
4. **Control aéreo total:** cambiar de dirección 180° en el aire rompe credibilidad y permite exploits. Control parcial.
5. **Escalada sin etiquetas:** cualquier pared es escalera y el parkour pierde sentido. Solo superficies marcadas.
6. **Agua = vuelo:** nado sin coste vertical que permite cruzar el mapa por arriba. Capa velocidad vertical y exige salir a respirar según diseño.
7. **Servidor que confía en el cliente:** aceptar posición/velocidad sin comprobar = speedhack y vuelo libres. Valida siempre.

## Criterios de calidad y terminado

- [ ] Constantes en un solo lugar; walk/run/salto documentados y medidos en pista.
- [ ] Coyote-time (~0.1 s) y jump buffer (~0.12 s) implementados y verificados en borde.
- [ ] Una acción por intención con bindings PC/mando/táctil probados en 2 dispositivos.
- [ ] Pendientes: ángulo máximo respetado, sin escalada gratuita de paredes.
- [ ] Agua y escalada con transiciones atómicas y superficies etiquetadas.
- [ ] Validación de servidor: teleports y velocidades imposibles rechazados en prueba de exploit.
- [ ] 3 jugadores nuevos completan la pista de calibración sin quejas de control.

## Herramientas

- Pista de calibración (recta, slalom, plataformas de precisión, borde, agua, escalera marcada).
- Tabla de constantes de movimiento versionada.
- Simulador de latencia + cliente de prueba de exploits (velocidad/teleport).
- Mapa de acciones→bindings por dispositivo.

## Limitaciones

- No cubre parkour avanzado (ver `roblox-parkour-traversal`) ni vehículos.
- No cubre predicción/rollback de red en detalle; solo validación de servidor.
- No sustituye pruebas en dispositivos reales de gama baja.
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
