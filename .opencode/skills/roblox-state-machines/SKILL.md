---
name: roblox-state-machines
description: Máquinas de estado para IA, UI y gameplay en Luau (estados, transiciones, guardas). Úsala cuando un if/cadena de flags se vuelve inmanejable.
---

# Máquinas de Estado en Roblox

## Objetivo
Modelar comportamientos (IA de enemigos, flujos de UI, rondas de juego) como máquinas de estado explícitas: estados, eventos, transiciones y guardas verificables, eliminando banderas booleanas contradictorias.

## Alcance y límites
Diferenciación: `luau-core`, `luau-types` y `roblox-core` cubren lenguaje y ubicación del código; esta skill cubre ingeniería de comportamiento (diseño de estados y transiciones). `roblox-component-systems` cubre composición de entidades; aquí solo se cubre el cerebro que decide qué hacer.

Qué NO hace:

- NO implementa pathfinding ni animación (usa el estado para decidir, no para mover).
- NO cubre réplica de estado (eso lo cubre `roblox-networking`); aquí se diseña la máquina autoritativa y qué eventos se replican.
- NO es un framework: no introduce clases externas, solo `ModuleScript` + tablas + `BindableEvent`.

## Casos de uso
1. IA de enemigo: Idle → Chase → Attack → Stunned → Dead.
2. Flujo de UI: Loading → Menu → Lobby → Playing → Results.
3. Loop de ronda: Waiting → Countdown → Active → Ending → Intermission.
4. Interactuables: Closed → Opening → Open → Closing.
5. Jugador: Normal → Dashing → Stunned → Dead (con jerarquía si aporta).

## Proceso paso a paso
1. Enumera estados como valores cerrados (tabla de constantes). Prohíbe strings libres fuera de esa tabla.
2. Dibuja la matriz de transición: fila = estado origen, columna = evento, celda = destino + guarda. Toda celda vacía es transición ilegal.
3. Define guardas como funciones puras `(ctx) -> (boolean, razón)`. Ninguna guarda muta estado; solo decide.
4. Implementa `enter`/`exit` por estado: `enter` adquiere recursos (timers, conexiones), `exit` los libera. Nunca lo contrario.
5. Centraliza el cambio en una única función `transition(to, reason)`: valida legalidad, llama `exit`, cambia, llama `enter`, emite evento de cambio para observabilidad.
6. Añade jerarquía solo si hay sub-estados con `exit` compartido (ej. Attack.Melee/Attack.Ranged). Si solo hay 3 estados planos, no jerarquices.
7. Conecta ticks con cautela: el `Update(dt)` solo ejecuta lógica del estado actual; jamás cambia de estado sin pasar por `transition`.
8. Registra cada transición (origen → destino, evento, marca temporal) en un log circular para depurar (ver `roblox-error-handling`).
9. Testea matriz completa: cada transición legal y 3-5 ilegales representativas (ver `roblox-testez`).

## Conocimientos técnicos
- Representación canónica: tabla `states`, tabla `transitions[origen][evento] = { to, guard }`, estado actual como string de la tabla cerrada.
- Guardas: validan precondiciones (cooldown listo, distancia, permiso). Si la guarda falla, la máquina se queda y reporta la razón; no hace "mitad" de transición.
- `BindableEvent` para notificar cambios de estado dentro del mismo contexto; útil para UI que reacciona a la máquina de gameplay.
- `Attributes` para exponer el estado actual a depuración sin acoplar (ej. atributo `State` legible). No uses atributos como única fuente de verdad si la máquina es autoritativa en servidor.
- Jerárquicas: un estado padre aporta `enter`/`exit` común y delega a hijos. Implementa como máquinas anidadas solo cuando el `exit` compartido ahorra duplicación real.
- Temporizadores: cada estado con duración lleva su propio conteo; al salir se cancela. Un timer huérfano es la primera causa de transiciones fantasma.

Ejemplo ilustrativo (núcleo genérico):

```luau
-- ModuleScript: StateMachine (ilustrativo)
local StateMachine = {}
StateMachine.__index = StateMachine

function StateMachine.new(def: { initial: string, transitions: any })
	local self = setmetatable({}, StateMachine)
	self._def = def
	self.current = def.initial
	self.log = {}
	return self
end

function StateMachine:transition(event: string, ctx: any): boolean
	local from = self.current
	local edge = self._def.transitions[from] and self._def.transitions[from][event]
	if not edge then return false end -- transición ilegal
	if edge.guard then
		local ok, _reason = edge.guard(ctx)
		if not ok then return false end
	end
	table.insert(self.log, { from = from, to = edge.to, event = event })
	self.current = edge.to
	return true
end

return StateMachine
```

Ejemplo ilustrativo (definición de enemigo):

```luau
-- Uso ilustrativo
local def = {
	initial = "Idle",
	transitions = {
		Idle = { spotted = { to = "Chase" } },
		Chase = {
			lost = { to = "Idle" },
			inRange = { to = "Attack" },
		},
		Attack = {
			finished = { to = "Chase" },
			stunned = { to = "Stunned" },
		},
		Stunned = { recovered = { to = "Chase" } },
	},
}
```

## Buenas prácticas
- Estados con nombres de adjetivo/situación (`Stunned`), eventos con verbos (`stun`, `recover`). No mezclar.
- Una máquina, un dueño. Si dos sistemas cambian el mismo estado, fusiona o separa máquinas.
- Transiciones ilegales = `false` + log, nunca error fatal en runtime (en tests sí deben fallar).
- Expón `current` como lectura; el cambio solo vía `transition`.
- Documenta la matriz en el encabezado del módulo; el código debe espejarla 1:1.

## Errores frecuentes
1. Booleanos paralelos (`isRunning`, `isStunned`, `isDead` a la vez en true): estados contradictorios. Corrección: un único `current`.
2. Cambiar `current` por asignación directa saltando `exit`/`enter`: fugas de timers y conexiones. Usa siempre `transition`.
3. Guardas con efectos secundarios (dañan, mueven): se ejecutan dos veces al reintentar. Hazlas puras.
4. Timer que sobrevive al `exit`: el estado viejo dispara transiciones tarde. Cancela en `exit` y verifica con test.
5. Jerarquía prematura con 2 estados: complejidad sin ahorro. Empieza plana, jerarquiza al tercer sub-estado duplicado.
6. Replicar cada tick de la máquina en vez de eventos: spam de red. Replica solo `transition` relevantes (ver `roblox-networking`).
7. `Update` que decide y transiciona a la vez sin guarda: lógica imposible de testear. Separa "evaluar" de "transicionar".

## Criterios de calidad y terminado
- [ ] Matriz de transición documentada y sin celdas ambiguas; toda transición ilegal retorna `false` + log.
- [ ] `enter`/`exit` apareados: ningún recurso sobrevive al cambio (verificable con conteo de conexiones antes/después).
- [ ] Guardas puras con tests unitarios independientes.
- [ ] Historial de últimas N transiciones disponible para depuración.
- [ ] Suite que recorre todos los estados alcanzables y 3+ transiciones ilegales pasa en verde.
- [ ] Si hay jerarquía, justificación escrita de qué `exit` compartido la motivó.

## Herramientas
- `ModuleScript` + `require` para la máquina reutilizable.
- `BindableEvent` para notificar cambios intra-contexto.
- `Attributes` para depuración visible del estado.
- `TestService` + TestEZ para matriz de transiciones (ver `roblox-testez`).

## Limitaciones
- No sustituye diseño de IA (percepción, pathfinding) ni de UI; solo ordena el comportamiento.
- No cubre réplica autoritativa ni persistencia; deriva a `roblox-networking` y `roblox-datastores`.
- Si dudas de una firma o servicio, anota `(verificar en create.roblox.com/docs)` antes de usarlo en producción.
