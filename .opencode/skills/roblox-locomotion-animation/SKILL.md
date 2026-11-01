---
name: roblox-locomotion-animation
description: Locomoción creíble (idle/walk/run/jump/fall, blends y foot sliding). Úsala cuando el personaje patina, las transiciones son bruscas o corre sin peso.
---

# Animación de Locomoción

## Objetivo

Lograr desplazamiento con peso y continuidad: idle vivo, walks/runs sincronizados con velocidad real, saltos/caídas legibles y transiciones sin pops, eligiendo conscientemente entre animación in-place y root motion según el controlador.

## Alcance y límites

Cubre set de locomoción del jugador: clips, blends por velocidad, giros, saltos, `IKControl` básico de pies y criterios de sincronía pie-suelo.

**Qué NO hace:**

- NO cubre ciclo de vida respawn-safe: lo cubre `roblox-characters` (aquí se asume `Humanoid`/`Animator` ya gestionados).
- NO cubre dirección visual del personaje: lo cubre `roblox-character-design`.
- NO cubre construcción del rig: lo cubre `roblox-rigging`.
- NO es el dispatcher general: `roblox-animation` decide el marco; esta skill es el dominio locomoción con criterios de gameplay.
- NO cubre locomoción de NPCs con IA: lo cubre `roblox-npcs`.
- NO cubre cámaras de seguimiento: lo cubre `camera-systems` (aquí solo cómo la animación debe colaborar: no ocultar los pies, horizonte estable).

## Casos de uso

1. Personaje que "patina" al andar (pies deslizándose).
2. Transición correr→parar con frenada brusca o pop.
3. Salto que no se lee (el jugador no sabe si está subiendo o cayendo).
4. Giro de 180° que atraviesa el cuerpo.
5. Idle muerto en menús o lobbies.
6. Pendientes donde los pies flotan o se hunden.

## Proceso paso a paso

1. **Mide la velocidad real.** Registra velocidades del `Humanoid` (walk, run, sneak si existe). Cada clip debe declararse para un rango: idle 0, walk A–B, run B–C. Sin números, el blend es adivinanza.
2. **Elige in-place vs root motion.** In-place (recomendado por defecto): el clip corre en el sitio y el código mueve el `HumanoidRootPart`. Root motion: el clip desplaza. En red con autoridad de servidor, in-place es más predecible; documenta la elección.
3. **Construye el set mínimo.** Idle, walk, run, jump (subida), fall (caída), land (aterrizaje). No añadas strafe/sneak hasta que estos seis mezclen limpio.
4. **Sincroniza ciclo y velocidad.** Ajusta la velocidad de reproducción del clip para que un ciclo completo recorra la distancia que el personaje avanza en ese tiempo. Regla: si el pie apoyado se mueve respecto al suelo, hay foot sliding: corrige velocidad del track, no la velocidad de juego.
5. **Diseña los blends.** Define grafo: idle↔walk↔run por velocidad, jump→fall por velocidad vertical, fall→land por contacto. Tiempos de fade iniciales: locomoción 0.15–0.25 s, land 0.1 s. Registra prioridades para que land interrumpa a run pero run no interrumpa a land.
6. **Trata los giros.** Para giros suaves usa giro del `HumanoidRootPart` + clip de giro solo si el ángulo por segundo supera un umbral; si no, el torso se retuerce. Prueba giros de 90° y 180° a velocidad máxima.
7. **Añade `IKControl` de pies donde aporte.** Solo si hay pendientes/escalones visibles: planta el pie de apoyo durante su fase. Si el terreno es plano, el IK es coste sin beneficio: omítelo.
8. **Da vida al idle.** Respiración (torso ±2 cm), parpadeo o cambio de peso cada 3–6 s, micro-variantes para que dos personajes juntos no parezcan copias. El idle nunca debe mover el `HumanoidRootPart`.
9. **Prueba de estrés.** Corre en círculo, salta encadenando, frena en seco, sube/baja pendiente. Graba a cámara fija a la altura de los pies: cualquier deslizamiento se ve ahí.
10. **Congela curvas y umbrales.** Entrega tabla: clip, rango de velocidad, fade, prioridad y velocidad de track. Sin tabla no hay "terminado".

## Conocimientos técnicos

- **`Animation` / `AnimationTrack`:** cada clip es un `Animation`; al reproducirlo en el `Animator` obtienes un `AnimationTrack` con peso, velocidad y fade. Los blends son pesos cruzados entre tracks, no cortes.
- **Foot sliding:** ocurre cuando velocidad del ciclo ≠ velocidad del `Humanoid`. Se mide en el pie de apoyo: si se desplaza mientras debería estar plantado, ajusta la velocidad del track.
- **In-place:** el `HumanoidRootPart` lo mueve el código; la animación solo mueve miembros. Evita deriva de red y facilita validación de servidor.
- **Root motion:** útil en cinemáticas o dashes cortos; en locomoción continua complica la predicción y la validación anti-speed.
- **`Humanoid` y estados:** usa el estado (corriendo, saltando, cayendo, aterrizando) como entrada de la máquina de estados, no la velocidad cruda con ruido.
- **`IKControl`:** resuelve pies/manos hacia objetivos en tiempo real. Para pies: objetivo = punto de apoyo en suelo. Sin suelo detectado, desactívalo para evitar pies temblorosos.
- **Prioridades:** locomoción en prioridad base/baja; aterrizaje y daño por encima; gestos sociales por debajo de locomoción de piernas (ver `roblox-expressive-animation` para capas).
- **Replicación:** las animaciones del jugador local deben verse en otros clientes; el servidor valida el estado (velocidad/posición) y los clientes reproducen el clip correspondiente (detalle en `roblox-animation-systems`).

Ejemplo ilustrativo (selección por velocidad, no código final):

```luau
-- Ilustrativo: elige clip según velocidad del Humanoid y funde con fade.
local velocidad = humanoid.MoveDirection.Magnitude * humanoid.WalkSpeed
local track = velocidad < 0.5 and trackIdle or (velocidad < 12 and trackWalk or trackRun)
track:Play(0.2) -- fade de 0.2 s para evitar pops
```

## Buenas prácticas

- El cliente propone el estado visual, el servidor valida el movimiento: nunca dejes que el cliente declare "voy a 200" para forzar el clip de run; el servidor valida velocidad/posición y los clientes animan en consecuencia.
- Un fade siempre: ningún `Play()` sin tiempo de fundido en locomoción.
- Sincroniza pies antes de añadir clips nuevos; más clips sobre una base deslizante solo multiplican el problema.
- Mantén el torso estable en cámara: evita cabeceos que peleen con `camera-systems`.
- Documenta si el juego usa in-place en una sola línea visible para todo el equipo.
- Prueba con latencia simulada: el blend debe seguir viéndose bien con 150 ms de jitter.

## Errores frecuentes

1. **Foot sliding crónico:** velocidad de track fija para todas las velocidades. Usa ajuste por rango.
2. **Idle que desplaza:** el clip de idle mueve el `HumanoidRootPart` unos cm por ciclo y el personaje "camina dormido". Limpia la curva de raíz.
3. **Land inexistente:** caer de un salto corta a run sin absorción; el salto pierde peso. Añade land de 0.15–0.3 s con prioridad alta.
4. **Jump = fall:** mismo clip para subir y bajar; el jugador no lee el ápice. Sepáralos.
5. **Giro instantáneo del torso:** girar 180° en un frame retuerce la malla. Limita velocidad de giro o añade clip de giro.
6. **`IKControl` siempre activo:** pies vibrando en el aire al saltar. Actívalo solo con apoyo confirmado.
7. **Prioridades planas:** el idle pisa al land y el aterrizaje no se ve. Jerarquiza.

## Criterios de calidad y terminado

- [ ] Sin foot sliding visible a cámara fija a altura de pies en walk/run.
- [ ] Transiciones idle/walk/run sin pops (fade medido, sin salto de pose).
- [ ] Jump/fall/land distinguibles en la primera visualización por un probador nuevo.
- [ ] Giros de 180° a máxima velocidad sin retorcimiento de malla.
- [ ] Tabla de clips con rangos, fades y prioridades entregada.
- [ ] Idle con al menos 2 variantes sin desplazamiento de raíz.
- [ ] Decisión in-place vs root motion documentada y respetada por el controlador (ver `roblox-character-controller`).

## Herramientas

- Set de 6 clips base + pista de prueba recta y en pendiente.
- Cámara fija a ras de suelo para medir sliding (encuadre según `camera-systems`).
- Medidor de velocidad del `Humanoid` en pantalla durante pruebas.
- Tabla de blends (clip, rango, fade, prioridad) como artefacto de entrega.

## Limitaciones

- No cubre parkour (ver `roblox-parkour-traversal`) ni controladores con física custom (ver `roblox-character-controller`).
- No resuelve predicción de red ni lag compensation; solo deja la animación robusta frente a ellos.
- El `IKControl` aquí es básico de pies; IK de manos/armas se trata en combate.
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
