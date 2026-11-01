---
name: roblox-combat-animation
description: Animaciones de combate con anticipación, impacto y recuperación. Úsala cuando los golpes se sienten flojos o no sincronizan con el daño.
---

# Animación de Combate

## Objetivo

Conseguir golpes que se sienten: anticipación legible, impacto con peso (hit-stop feel) y recuperación con compromiso, sincronizados con la ventana real de daño que valida el servidor.

## Alcance y límites

Cubre ataques melee y a distancia del jugador: estructura en 3 fases, ventanas de hit, cancelaciones, capas de torso/brazos y feel sin romper autoridad de servidor.

**Qué NO hace:**

- NO cubre ciclo de vida respawn-safe: lo cubre `roblox-characters`.
- NO cubre construcción del rig: lo cubre `roblox-rigging`.
- NO cubre balance de daño ni diseño de habilidades: solo su expresión animada (el diseño de sistema combate como tal es otra disciplina).
- NO es el dispatcher general: `roblox-animation` define el marco; aquí dominio combate.
- NO cubre enemigos con IA: lo cubre `roblox-npcs`.
- NO cubre cámaras de combate/shake: lo cubre `camera-systems` (aquí solo eventos que la cámara puede consumir).

## Casos de uso

1. Espadazo que "no se siente" aunque quite vida.
2. Combo de 3 golpes donde el segundo se come al primero.
3. Disparo cuya animación termina después del impacto.
4. Ataque que el jugador no puede esquivar porque no hay anticipación.
5. Golpe recibido que no se lee (el jugador no sabe que le pegaron).
6. Habilidad con carga que necesita lectura de "cargando vs listo".

## Proceso paso a paso

1. **Define la ventana real de daño.** Pregunta al diseño/código: ¿en qué frames el servidor acepta golpe? Anota inicio/fin en segundos. Toda la animación se construye alrededor de esa ventana, no al revés.
2. **Estructura en 3 fases.** Anticipación (carga, 20–30% del tiempo, pose exagerada y legible), Impacto (golpe activo, rápido, 10–20%), Recuperación (vuelta, lenta, 50–70% con compromiso de movimiento). Dibuja las 3 poses clave antes de interpolar.
3. **Haz la anticipación esquivable.** Debe durar lo suficiente para reaccionar (mínimo ~0.15 s en melee rápido, más en ataques fuertes) y usar silueta grande (arma atrás, cuerpo girado). Prueba: ¿un jugador nuevo distingue "va a pegar" a tiempo?
4. **Sincroniza impacto con hitbox.** El fotograma de extensión máxima = centro de la ventana de servidor. Si el arte y el servidor discrepan más de ~0.05 s, se siente injusto: ajusta el clip, no pidas cambiar la ventana sin motivo.
5. **Añade feel sin tocar simulación.** Hit-stop (congelar 2–4 frames al impactar), retroceso de torso, flash en el arma, sonido en el frame de impacto. El hit-stop es visual: nunca detiene la validación del servidor.
6. **Diseña la recuperación como coste.** Tras un golpe fuerte el personaje queda vendido 0.3–0.6 s (no puede atacar ni esprintar). Anímalo con peso bajo y pose abierta. Sin compromiso, no hay decisión táctica.
7. **Encadena combos con ventanas de cancelación.** Define en qué % de la recuperación se acepta el siguiente input (típico: último 30%). Anima la cancelación como transición corta, no como corte seco.
8. **Capas: piernas vs torso.** Locomoción en piernas (sigue corriendo), ataque en torso/brazos con prioridad superior. Así se puede pegar corriendo sin deslizar (coordina con `roblox-locomotion-animation`).
9. **Anima recibir golpe y muerte.** Hit-react de 0.15–0.25 s con prioridad alta que interrumpe locomoción pero no teleporta; muerte con caída que despeja la hitbox visual. Sin esto el combate es unidireccional.
10. **Valida con dummy y latencia.** Prueba contra objetivo fijo y con 150 ms simulados: ¿el impacto visual coincide con el número de daño? Ajusta hasta que sí.

## Conocimientos técnicos

- **Las 3 fases como contrato:** anticipación/impacto/recuperación deben existir como marcadores de tiempo compartidos entre animación y código. Si el código no expone la ventana, la sincronía es imposible.
- **`AnimationTrack` y prioridades:** el ataque va en prioridad superior a locomoción; el hit-react aún más arriba pero breve. Dos ataques nunca deben mezclarse al 50%: uno interrumpe o espera.
- **Hit-stop feel:** pausa visual de 30–80 ms + escala de sonido. Solo afecta presentación; la posición del `HumanoidRootPart` y la vida las decide el servidor.
- **`Tool` y armas:** el arma (`Tool`) sigue a la mano por su soldadura; si el arma "flota" en el impacto, el problema suele ser el punto de agarre, no el clip.
- **`IKControl` de manos:** en ataques a dos manos o bloqueos, planta la mano secundaria en el arma. Actívalo solo durante el ataque.
- **Anticipación y juego limpio:** ataques sin anticipación se perciben como bugs aunque el código sea correcto.
- **Replicación:** el atacante reproduce inmediato (predicción visual), los demás ven la versión validada por servidor (ver `roblox-animation-systems`).

Ejemplo ilustrativo (fases como comentarios, no código final):

```luau
-- Ilustrativo: el track de ataque expone fases que el código consulta.
local track = animator:LoadAnimation(animAtaque)
track:Play(0.08) -- fade corto: los ataques entran rápido
-- Fases esperadas del clip: anticipación 0.0–0.25, impacto 0.25–0.35, recuperación 0.35–1.0
-- El servidor solo acepta golpe durante la ventana de impacto.
```

## Buenas prácticas

- El cliente propone el ataque, el servidor valida: el cliente reproduce la animación al pulsar, pero el daño solo ocurre si el servidor confirma ventana, distancia, cooldown y línea de vista.
- Nunca confíes en el tiempo del clip para validar daño; el servidor usa su propio temporizador.
- Un ataque, una lectura: si el jugador no sabe si fue golpe débil o fuerte en 0.3 s, rediseña la anticipación.
- Limita cancelaciones: permitir cancelar la anticipación rompe el compromiso; permite cancelar solo la cola de recuperación.
- Sonido en el frame de impacto, no al pulsar el botón.
- Documenta cada ataque en una ficha: duración, ventana, recuperación, cancelación, prioridad.

## Errores frecuentes

1. **Sin anticipación:** golpe instantáneo imposible de esquivar. Siempre hay carga visible.
2. **Impacto desincronizado:** el daño entra 0.2 s antes del visual. Ajusta el clip a la ventana, no al revés.
3. **Hit-stop que congela la simulación:** pausar el `Humanoid` real para "sentir" el golpe abre exploits. Solo congela presentación.
4. **Combos que se pisan:** el track 2 entra al 50% del track 1 y ambos se ven a medias. Define punto único de cancelación.
5. **Recuperación inexistente:** spam de ataque sin coste. Añade compromiso proporcional al daño.
6. **Arma flotante:** `Tool` mal agarrado; el golpe pierde toda credibilidad. Revisa agarre antes que el clip.
7. **Hit-react eterno:** stun de 1 s por cada golpe jab; el jugador pierde el control. Escala el react al daño.

## Criterios de calidad y terminado

- [ ] Cada ataque tiene ficha con 3 fases y ventana de servidor anotada.
- [ ] Anticipación legible por jugador nuevo en test ciego (esquiva al menos 50% sin tutorial).
- [ ] Impacto visual y número de daño coinciden con latencia simulada de 150 ms.
- [ ] Recuperación con compromiso real (medido: no se puede re-atacar ni esprintar).
- [ ] Combos encadenan sin pops ni mezcla a medias.
- [ ] Hit-react y muerte implementados y priorizados.
- [ ] Validación de servidor (ventana, distancia, cooldown) verificada; la animación nunca otorga daño.

## Herramientas

- Dummy de pruebas con visualización de ventana de impacto.
- Ficha de ataque estándar (duración, ventana, recuperación, cancelación, prioridad).
- Simulador de latencia para validar sincronía.
- Checklist de feel (anticipación, hit-stop, sonido, retroceso) por ataque.

## Limitaciones

- No diseña balance (daños, cooldowns, hitboxes como lógica); solo su expresión y sincronía visual.
- No cubre VFX de partículas ni sonido más allá de su timing.
- No cubre cámaras ni shake (ver `camera-systems`).
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
