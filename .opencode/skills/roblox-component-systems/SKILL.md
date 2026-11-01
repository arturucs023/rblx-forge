---
name: roblox-component-systems
description: Componentes reutilizables con CollectionService, Tags y Attributes. Úsala cuando varios objetos comparten comportamiento sin herencia.
---

# Sistemas de Componentes en Roblox

## Objetivo
Construir comportamientos reutilizables (dañable, interactuable, giratorio, coleccionable) como componentes desacoplados sobre `CollectionService`/`Tags`/`Attributes`, con ciclo de vida claro y sin frameworks inventados.

## Alcance y límites
Diferenciación: `luau-core`, `luau-types`, `roblox-core` y `roblox-datastores` cubren lenguaje, modelo cliente-servidor y persistencia; esta skill cubre ingeniería de composición (entidades + componentes con ciclo de vida). `roblox-state-machines` cubre el cerebro interno; aquí se cubre cómo se adhiere comportamiento a instancias.

Qué NO hace:

- NO crea un framework ECS externo ni dependencias nuevas.
- NO gestiona réplica (eso lo cubre `roblox-networking`); el componente decide qué es local y qué pide al servidor.
- NO refactoriza sistemas legacy completos (eso lo cubre `roblox-code-maintenance-refactor` instalada).

## Casos de uso
1. "Todo lo que tenga Tag `Damageable` recibe daño igual".
2. Interactuables: Tag `Interactable` + atributo `PromptText`.
3. Efectos ambientales: Tag `Spin` con velocidad por atributo.
4. Coleccionables: Tag `Pickup` + `Attributes.Rarity`.
5. Puertas/plataformas: Tag + atributos de configuración sin código por instancia.

## Proceso paso a paso
1. Define el contrato del componente: Tag, atributos requeridos con tipos y valores por defecto, y eventos que emite.
2. Crea un `ModuleScript` por componente con API fija: `start()`, `stop()`, `onAdded(instance)`, `onRemoved(instance)`.
3. En `start`, suscríbete a `CollectionService:GetInstanceAddedSignal(tag)` y `GetInstanceRemovedSignal(tag)`; procesa también los ya etiquetados con `GetTagged(tag)`.
4. En `onAdded`, valida atributos con asserts útiles (nombre, tipo, rango). Falla alto y con mensaje que diga qué Tag/atributo falta.
5. Guarda estado por instancia en una tabla del componente (`[instance] = state`), nunca como globales sueltos ni como hijos `ValueBase` salvo depuración.
6. En `onRemoved`, limpia conexiones, timers y entradas de la tabla. Verifica que no quede referencia.
7. Configura por `Attributes` (diseñador ajusta sin tocar código); lee atributos una vez al añadir y suscríbete a cambios solo si el diseño lo exige.
8. Separa cliente/servidor: el componente de servidor decide (daño, recolección); el de cliente solo presenta. No dupliques autoridad.
9. Escribe test por componente: añadir → comportarse → quitar → sin fugas (ver `roblox-testez`, con mocks de `CollectionService` si hace falta).

## Conocimientos técnicos
- `CollectionService`: `GetTagged`, `GetInstanceAddedSignal`, `GetInstanceRemovedSignal`, `HasTag`, `AddTag`, `RemoveTag`. Es el pegamento del sistema.
- `Tags` + `Attributes`: el Tag dice "qué comportamiento", los atributos dicen "con qué parámetros". Ambos visibles en Studio para diseñadores.
- Ciclo de vida: `start` (suscribir) → `onAdded` (validar + conectar) → `update` opcional → `onRemoved` (limpiar) → `stop` (desconectar señales globales).
- Estado por instancia: tabla débil opcional o limpieza manual. Si usas weak tables, documenta por qué; si no, `onRemoved` debe hacer `state[inst] = nil`.
- `BindableEvent` para que componentes se comuniquen en el mismo contexto (ej. Pickup publica `Collected`, Score escucha). Evita `require` cruzado entre componentes.
- Rendimiento: un update global por componente con lista de activos rinde mejor que un bucle por instancia; mide con MicroProfiler si hay cientos de activos.

Ejemplo ilustrativo (esqueleto de componente):

```luau
-- ModuleScript: SpinComponent (ilustrativo)
local CollectionService = game:GetService("CollectionService")

local SpinComponent = {}
local TAG = "Spin"
local states = {} :: { [Instance]: { conn: RBXScriptConnection } }

local function onAdded(inst: Instance)
	local speed = inst:GetAttribute("Speed")
	assert(typeof(speed) == "number", "Spin requiere atributo number 'Speed' en " .. inst:GetFullName())
	-- conectar lógica aquí y guardar en states[inst]
	states[inst] = states[inst] or {} :: any
end

local function onRemoved(inst: Instance)
	local s = states[inst]
	if s and s.conn then s.conn:Disconnect() end
	states[inst] = nil
end

function SpinComponent.start()
	for _, inst in CollectionService:GetTagged(TAG) do
		task.spawn(onAdded, inst)
	end
	SpinComponent._added = CollectionService:GetInstanceAddedSignal(TAG):Connect(onAdded)
	SpinComponent._removed = CollectionService:GetInstanceRemovedSignal(TAG):Connect(onRemoved)
end

function SpinComponent.stop()
	if SpinComponent._added then SpinComponent._added:Disconnect() end
	if SpinComponent._removed then SpinComponent._removed:Disconnect() end
	table.clear(states)
end

return SpinComponent
```

Ejemplo ilustrativo (lectura segura de atributos):

```luau
-- Ilustrativo
local function readSpeed(inst: Instance): number
	local v = inst:GetAttribute("Speed")
	if typeof(v) ~= "number" then
		warn("Spin sin Speed válido en " .. inst:GetFullName() .. "; uso 30")
		return 30
	end
	return v
end
```

## Buenas prácticas
- Un Tag, un componente, un `ModuleScript`. Nada de "ComponentManager" gigante.
- Valida siempre atributos al añadir; mensaje de error con Tag + atributo + instancia.
- Atributos configurables, código estable: el diseñador no debe pedirte cambio de código para ajustar un número.
- Limpieza total en `onRemoved`; compruébalo con conteo de conexiones.
- Prefiere composición (varios Tags por instancia) a jerarquías profundas.

## Errores frecuentes
1. Olvidar procesar los ya etiquetados al iniciar: funciona al añadir en runtime pero no al cargar el mapa. Itera `GetTagged` en `start`.
2. Guardar estado como hijos de la instancia sin limpiar: duplicados tras re-uso. Centraliza en tabla del componente.
3. Leer atributo sin validar tipo: `Speed` string rompe aritmética. Usa `typeof` + assert/warn.
4. No desconectar señales globales en `stop`: tests que contaminan el siguiente. Desconecta y limpia tabla.
5. Componente cliente con autoridad (da daño local): explotable. El cliente presenta; el servidor decide (ver `roblox-networking`).
6. Suscribirse a cambios de atributo por defecto sin necesitarlo: costo por instancia. Solo si el diseño lo pide.
7. Doble registro del mismo Tag en dos componentes distintos que pelean: define dueño único por Tag.

## Criterios de calidad y terminado
- [ ] Contrato escrito por componente: Tag, atributos (nombre/tipo/defecto), eventos.
- [ ] `start` procesa etiquetados existentes + suscribe señales; `stop` limpia todo.
- [ ] `onRemoved` deja cero referencias (verificable: añadir/quitar N veces no crece memoria ni conexiones).
- [ ] Atributos inválidos producen error/aviso accionable con nombre de instancia.
- [ ] Test añadir → actuar → quitar en verde por cada componente.
- [ ] Ningún componente cruza autoridad cliente-servidor sin justificación.

## Herramientas
- `CollectionService` / `Tags` / `Attributes` como base.
- `BindableEvent` / `BindableFunction` para comunicación intra-contexto.
- `ModuleScript` + `require` para cada componente.
- `TestService` + TestEZ para ciclo de vida (ver `roblox-testez`).
- MicroProfiler / ScriptProfiler si hay cientos de instancias activas.

## Limitaciones
- No inventa frameworks ni añade dependencias; todo con APIs de plataforma.
- No cubre réplica ni persistencia; deriva a `roblox-networking` y `roblox-datastores`.
- Ante duda de firmas, anota `(verificar en create.roblox.com/docs)` y confirma antes de producción.
