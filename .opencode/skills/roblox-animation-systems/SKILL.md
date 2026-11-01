---
name: roblox-animation-systems
description: Máquinas de estados, capas, prioridades y replicación de animación. Úsala cuando montes el sistema que decide qué clip se reproduce y cómo se ve en otros clientes.
---

# Sistemas de Animación

## Objetivo

Montar el sistema que decide qué animación se reproduce, cuándo y cómo: máquina de estados, capas por cuerpo, prioridades, transiciones con fade y replicación coherente a otros clientes sin pops ni desyncs.

## Alcance y límites

Cubre arquitectura: estados, transiciones, capas, prioridades, `Animator`/`AnimationTrack` y replicación visual.

**Qué NO hace:**

- NO cubre ciclo de vida respawn-safe (reconstruir `Animator` al reaparecer): lo cubre `roblox-characters`; aquí se asume que el `Animator` existe y es único.
- NO cubre creación de rigs: lo cubre `roblox-rigging`.
- NO cubre dirección visual: lo cubre `roblox-character-design`.
- NO es el contenido de los clips (eso está en `roblox-locomotion-animation`, `roblox-combat-animation`, `roblox-expressive-animation`); aquí el sistema que los gobierna.
- NO cubre IA de NPCs: lo cubre `roblox-npcs` (pueden reutilizar este sistema como reproductor).
- NO cubre cámaras: lo cubre `camera-systems`.

## Casos de uso

1. Nuevo proyecto que necesita el controlador central de animación del jugador.
2. Pops y cortes al cambiar de correr a saltar a atacar.
3. Ataques que no interrumpen el walk o emotes que pisan el hit-react.
4. Otros jugadores que se ven congelados o con animación equivocada.
5. Añadir capa de torso para apuntar/disparar sin romper piernas.
6. Migrar de "reproducir clips sueltos" a sistema con estados.

## Proceso paso a paso

1. **Inventaria clips y clasifícalos.** Lista todo: locomoción, combate, expresivos, hit-react, muerte. Asigna a cada uno: capa (piernas / torso / cara / full-body), prioridad y si es loop o one-shot. Sin inventario, el sistema es parche sobre parche.
2. **Define estados mínimos.** Ejemplo: Idle, Locomoción, Aire, Ataque, HitReact, Muerto, Emote. Cada estado declara: qué capas controla, qué estados pueden interrumpirlo y con qué fade. Menos estados bien definidos valen más que 20 ambiguos.
3. **Dibuja la matriz de transiciones.** Tabla estado_origen × evento → estado_destino + fade. Prohíbe transiciones imposibles (Muerto→Ataque, Emote→HitReact sin pasar por base). Todo "corte raro" nace de una transición no diseñada.
4. **Asigna prioridades por capa.** Base: locomoción en piernas + idle de torso. Media: emotes y apuntado en torso/brazos. Alta: ataque. Máxima breve: hit-react. Muerte: full-body y bloquea todo. Documenta la escala numérica usada.
5. **Implementa el reproductor único.** Un solo módulo por `Character` que posee el `Animator` y expone `CruzarA(estado)` con fade. Nadie más llama a `Play()` directamente: todo pasa por el reproductor para evitar tracks peleando.
6. **Gestiona `AnimationTrack` con higiene.** Al entrar a un estado: `Play(fade)` del nuevo, fade-out del anterior, detén tracks huérfanos pasado el fade. Limita tracks simultáneos (típico: 1 por capa + 1 transitorio). Registra qué track pertenece a qué capa.
7. **Separa lógica y presentación.** La lógica (velocidad, en aire, atacando) vive en el controlador; el sistema de animación solo lee ese estado y elige clips. Nunca midas física dentro del reproductor.
8. **Diseña la replicación.** El jugador local predice inmediato (reproduce al pulsar); el servidor valida el estado real (posición, velocidad, atacando) y los demás clientes reproducen según el estado replicado. La animación nunca es prueba de nada: es espejo del estado validado.
9. **Añade telemetría mínima.** Contadores: transiciones por segundo, tracks simultáneos, tiempo en cada estado. Si hay más de ~10 transiciones/s en un jugador, algo oscila (típico: umbral de velocidad sin histéresis).
10. **Prueba la matriz completa.** Recorre cada transición de la tabla con latencia simulada y verifica fades, interrupciones y replicación en un segundo cliente. Congela la matriz como contrato.

## Conocimientos técnicos

- **`Animator` único por `Humanoid`:** todos los `AnimationTrack` cuelgan de él. Dos reproductores sobre el mismo `Animator` generan peleas de peso impredecibles.
- **`Animation` vs `AnimationTrack`:** el `Animation` es el asset; `LoadAnimation` devuelve un `Track` con peso, velocidad, longitud y eventos. Reutiliza tracks para loops frecuentes en vez de recargar.
- **Pesos y fades:** un crossfade es bajar peso del viejo mientras sube el nuevo durante el fade. Sin fade (fade 0) hay pop salvo que las poses coincidan.
- **Capas:** se implementan separando qué articulaciones (`Motor6D`) gobierna cada track por prioridad. Piernas para locomoción + torso para acción es el split más rentable.
- **Histéresis en umbrales:** si walk→run cambia a velocidad 12, run→walk debe volver a 10.5, no a 12, o el sistema parpadea entre ambos.
- **One-shots vs loops:** los one-shots (ataque, land) necesitan evento de fin o duración conocida para devolver el control; los loops (idle, run) necesitan condición de salida.
- **Replicación:** el estado (no los frames) es lo que viaja; cada cliente reproduce localmente el clip del estado. Así se evitan desyncs de frames con jitter.

Ejemplo ilustrativo (reproductor único, no código final):

```luau
-- Ilustrativo: todo cambio de animación pasa por una sola función con fade.
local SistemaAnim = {}
function SistemaAnim.CruzarA(self, estadoNuevo, fade)
	fade = fade or 0.15
	local trackNuevo = self.tracks[estadoNuevo]
	-- Detiene el anterior con el mismo fade para evitar pops.
	if self.actual then self.actual:Stop(fade) end
	trackNuevo:Play(fade)
	self.actual = trackNuevo
end
```

## Buenas prácticas

- El cliente propone el estado visual, el servidor valida el estado real: un cliente puede pedir "ataque", pero solo el estado confirmado por servidor se replica a los demás.
- Un solo dueño del `Animator` por personaje; prohíbe `Play()` dispersos por el código.
- Toda transición lleva fade explícito; el fade 0 requiere justificación escrita.
- Histéresis en cada umbral numérico; sin excepción.
- Muerte bloquea todo y detiene tracks de forma ordenada; reaparición resetea el sistema (coordina con `roblox-characters`).
- Registra la matriz de transiciones como documento vivo; cada clip nuevo debe encajar en ella o la matriz se actualiza explícitamente.

## Errores frecuentes

1. **`Play()` desde 5 scripts distintos:** tracks peleando, prioridades aleatorias. Centraliza en el reproductor.
2. **Sin histéresis:** parpadeo walk/run a velocidad límite. Doble umbral siempre.
3. **Tracks huérfanos:** one-shot que nunca se detiene y sigue pesando 1.0 bajo el siguiente. Limpieza al salir del estado.
4. **Replicar frames en vez de estado:** intentar sincronizar tiempo exacto del clip por red; con jitter es imposible. Replica estado, reproduce local.
5. **Muerte que no bloquea:** el muerto sigue reproduciendo run al deslizarse el cuerpo. Muerto = full-body + bloqueo.
6. **Prioridades planas:** todo en la misma prioridad y el resultado depende del orden de llamada. Jerarquía explícita por capa.
7. **Lógica de física dentro del animador:** el reproductor decide por velocidad medida por él mismo y diverge del controlador. El animador solo lee estado.

## Criterios de calidad y terminado

- [ ] Matriz de transiciones completa y sin transiciones indefinidas.
- [ ] Reproductor único; cero `Play()` fuera de él (verificado por búsqueda).
- [ ] Todas las transiciones con fade explícito y medido (sin pops en prueba ciega).
- [ ] Histéresis en todos los umbrales; sin oscilación a velocidad límite.
- [ ] Replicación verificada con 2 clientes + latencia: el observador ve el estado correcto.
- [ ] Telemetría con transiciones/s y tracks simultáneos dentro de límites.
- [ ] Muerte y reaparición resetean el sistema limpiamente.

## Herramientas

- Matriz de transiciones (tabla origen × evento → destino + fade).
- Reproductor único por `Character` + inventario de clips con capa/prioridad/loop.
- Escena de 2 clientes con latencia simulada para validar replicación.
- Contadores de transiciones y tracks para detectar oscilaciones.

## Limitaciones

- No crea clips ni dirige arte; gobierna clips existentes.
- No resuelve predicción/rollback de red; solo la presentación coherente.
- No cubre IK en tiempo real más allá de su hueco en capas (el IK concreto vive en locomoción/combate).
- APIs fuera de la lista estable: "(verificar en create.roblox.com/docs)".
